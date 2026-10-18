-- 受付のテーブルとトリガー（docs/intake/table-design.md「テーブル定義」）。
--
--   ・intakes              受付。メール・FAX・口頭の 1 件
--   ・intake_destinations  受付の入れ先（複数・順序つき）
--   ・intake_site_changes  加工場所の変更履歴（トリガーが書く）
--   ・private.intake_no_counters  受付No. の年ごとのカウンター（採番の関数は次のマイグレーション）
--   ・work_units           加工区分（先寸／アイトレ）。受注登録待ち・CAD の 1 行
--   ・intake_files         ファイルの情報（実体は Storage のバケット intake-files）
--
-- RLS と権限（grant）は 20261018100500_create_intake_rls_and_realtime.sql でまとめて付ける。
-- それまではログイン済みのユーザーからも読み書きできない（RLS を有効にしてポリシーがない状態と同じ）。
--
-- 受注（orders）への列の追加（intake_id・work_unit_id・branch_no・staff_id）と受注No. の切り替え、
-- 受注のある受付の削除を止めるトリガーは、受注登録画面と受付をつなぐ PR（「実装の順序」PR 9）で行う。
-- 受注に必須の列を先に足すと、受付のない今の受注登録画面から登録できなくなるため。


-- ============================================================
-- 0. 共通: 更新者・更新日時を自動で入れる
-- ============================================================
-- before update のトリガーから呼ぶ。new は「更新したあとの行」で、ここで値を書き換えると、
-- その値で保存される。auth.uid() はログイン中のユーザーの id（SQL Editor から実行したときは NULL）。
create or replace function public.intake_touch_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

comment on function public.intake_touch_row() is
  '受付まわりのテーブルの updated_at・updated_by を更新のたびに入れるトリガー関数。';


-- ============================================================
-- 1. 受付
-- ============================================================
create table public.intakes (
  id uuid primary key default gen_random_uuid(),
  -- 受付No.（26-1003）。受付登録（または見積・ミルシートに区分）したときに private.assign_intake_no() で採番する
  intake_no text unique,
  -- 採番した年（西暦 4 桁）と、その年の連番。受付No. を組み立てた元の値
  intake_year smallint,
  intake_seq integer,
  -- 受注No. の枝番のカウンター（受注と受付をつなぐ PR で使う。受注No. = 受付No.-枝番）
  last_branch integer not null default 0,

  -- 受付の経路（mail メール / fax FAX / verbal 口頭・電話 / visit 来社 / other その他）
  channel text not null check (channel in ('mail', 'fax', 'verbal', 'visit', 'other')),
  -- 受信・受付の日時（メールが届いた日時、手動追加では入力した日時）
  received_at timestamptz not null default now(),
  -- 状態（waiting 受付待ち / registered 受付登録済 / dispatched 振り分け完了 / closed 完了 /
  --       estimate 見積・ミルシート / excluded 対象外）
  status text not null default 'waiting'
    check (status in ('waiting', 'registered', 'dispatched', 'closed', 'estimate', 'excluded')),

  -- --- 受注情報（受付と受注で共通の入力欄）。受付待ちの間は空で、受付登録の画面で入れる ---
  -- 受付日
  intake_date date,
  -- 担当者（自社）
  staff_id uuid references public.users (id),
  -- 売り先
  customer_id uuid references public.customers (id),
  -- 客先担当
  customer_contact text,
  -- 工事名
  project_name text,
  -- 納期種別と代表の納期（orders と同じ値）
  due_date_type text check (due_date_type in ('確定', '仮納期', '後報', '最短出荷')),
  due_date date,
  -- 配達と、配達がフリーのときの文字
  delivery_method_id uuid references public.delivery_methods (id),
  delivery_method_note text,
  -- 至急
  is_urgent boolean not null default false,
  -- 加工場所
  site_id uuid references public.sites (id),
  -- 加工場所を変えるときに、同じ update で理由を送るための欄。
  -- トリガー（intakes_log_site_change）が理由を変更履歴に移して、この欄を空に戻す
  site_change_reason_input text,
  -- メモ（口頭の注文の内容など）
  memo text,

  -- 「受付登録」を押した人と日時（記録用。担当者とは別に、あとから変えない値として残す）
  registered_by uuid references public.users (id),
  registered_at timestamptz,
  -- 対応中の人と開始日時（2 人が同じ受付を同時に登録しないよう、画面に「対応中」を出すのに使う）
  handling_by uuid references public.users (id),
  handling_at timestamptz,

  -- --- Phase 2: メールの自動取り込み（今回は受け皿だけ） ---
  email_from text,
  email_subject text,
  email_body text,
  -- メールの識別子。同じメールを 2 回取り込まないよう一意にする
  email_message_id text unique,

  -- 受付登録の「2 削除」（論理削除。行は消さずに日時を入れる）
  deleted_at timestamptz,
  created_by uuid default auth.uid() references public.users (id),
  updated_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 受付No.・年・連番は、そろって入るか、そろって空
  constraint intakes_no_set_together check (
    (intake_no is null and intake_year is null and intake_seq is null)
    or (intake_no is not null and intake_year is not null and intake_seq is not null)
  ),
  constraint intakes_year_seq_unique unique (intake_year, intake_seq),
  -- 受付待ち・対象外のほかは、受付No. が必須
  constraint intakes_no_required check (status in ('waiting', 'excluded') or intake_no is not null),
  -- 受付登録した後は、売り先と加工場所が必須
  constraint intakes_registered_required check (
    status not in ('registered', 'dispatched', 'closed')
    or (customer_id is not null and site_id is not null)
  ),
  -- 納期: 確定・仮納期は日付が必須、後報・最短出荷（と未入力）は日付なし（orders と同じ）。
  -- is distinct from は「NULL も 1 つの値として比べる」不等号（due_date_type が NULL でも true になる）
  constraint intakes_due_date check (
    (due_date_type in ('確定', '仮納期') and due_date is not null)
    or (
      due_date_type is distinct from '確定'
      and due_date_type is distinct from '仮納期'
      and due_date is null
    )
  )
);

comment on table public.intakes is
  '受付。メール・FAX・口頭の 1 件。受付登録で受付No. を採番し、振り分けで加工区分（work_units）に分ける。';

-- 一覧の絞り込み・並び替えに使う列の索引
create index intakes_status_idx on public.intakes (status);
create index intakes_received_idx on public.intakes (received_at desc);
create index intakes_site_idx on public.intakes (site_id);

create trigger intakes_touch
  before update on public.intakes
  for each row execute function public.intake_touch_row();


-- ============================================================
-- 2. 受付の入れ先
-- ============================================================
-- 1 つの受付に、入れ先（納入先）を複数、順番つきで持つ。
-- destination_id が NULL の行は「0 売り先と同じ」（受注の delivery_destination_id と同じ考え方）。
-- 画面で並びを変えたら、行を消して入れ直す（このテーブルだけ削除を許可する）。
create table public.intake_destinations (
  id uuid primary key default gen_random_uuid(),
  -- 受付を消すと一緒に消える（受付は論理削除なので、実際に消えるのはテストのときくらい）
  intake_id uuid not null references public.intakes (id) on delete cascade,
  -- 表示順 1, 2, 3 …
  seq smallint not null,
  destination_id uuid references public.delivery_destinations (id),
  created_at timestamptz not null default now(),
  constraint intake_destinations_intake_seq_key unique (intake_id, seq)
);

comment on table public.intake_destinations is
  '受付の入れ先（複数・順序つき）。destination_id が NULL の行は「売り先と同じ」。';

-- 「売り先と同じ」の行は 1 つの受付に 1 行まで、同じ納入先も 1 つの受付に 1 行まで。
-- where を付けた一意の索引（部分一意インデックス）で、条件に当てはまる行の中だけで重複を禁止する
create unique index intake_destinations_same_as_customer_unique
  on public.intake_destinations (intake_id) where destination_id is null;
create unique index intake_destinations_destination_unique
  on public.intake_destinations (intake_id, destination_id) where destination_id is not null;


-- ============================================================
-- 3. 加工場所の変更履歴
-- ============================================================
create table public.intake_site_changes (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.intakes (id),
  from_site_id uuid references public.sites (id),
  to_site_id uuid references public.sites (id),
  reason text,
  changed_by uuid default auth.uid() references public.users (id),
  changed_at timestamptz not null default now()
);

comment on table public.intake_site_changes is
  '受付の加工場所の変更履歴。アプリからは書かず、トリガー（intakes_log_site_change）が作る。';

create index intake_site_changes_intake_idx on public.intake_site_changes (intake_id);

-- 受付の加工場所が変わったら、変更履歴の行を作る。
-- 理由は同じ update で送られた site_change_reason_input から取り、受付の側は空に戻す。
-- intake_site_changes はアプリから直接書かせない（insert の権限を付けない）ため、
-- security definer（関数所有者の権限）で書く。search_path を固定するのは、
-- 呼び出した側が用意した同じ名前のテーブルや関数に差し替えられないようにするため。
create or replace function public.intakes_log_site_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- old は「更新する前の行」。is distinct from で、NULL から値になった場合も「変わった」とみなす
  if old.site_id is distinct from new.site_id then
    insert into public.intake_site_changes (intake_id, from_site_id, to_site_id, reason)
    -- btrim は前後の空白を取る。nullif で空文字を NULL にする
    values (new.id, old.site_id, new.site_id, nullif(btrim(new.site_change_reason_input), ''));
  end if;
  new.site_change_reason_input := null;
  return new;
end;
$$;

create trigger intakes_log_site_change
  before update on public.intakes
  for each row execute function public.intakes_log_site_change();


-- ============================================================
-- 4. 受付No. のカウンター（private スキーマ）
-- ============================================================
-- private スキーマは Data API で公開していない（20260930100000_add_order_no_numbering.sql で作成）。
-- 受注番号のカウンター（private.order_no_counters）と同じ作りにする。
create table private.intake_no_counters (
  -- 西暦 4 桁（2026）
  year smallint primary key,
  -- その年に最後に使った連番
  last_seq integer not null default 0,
  updated_at timestamptz not null default now()
);

-- RLS を有効にしてポリシーは作らない → 所有者以外からの読み書きはすべて拒否される。
-- 採番の関数 private.assign_intake_no() は security definer（このテーブルの所有者の権限）で動くため、
-- 関数の中からだけ読み書きできる
alter table private.intake_no_counters enable row level security;
revoke all on table private.intake_no_counters from anon, authenticated;


-- ============================================================
-- 5. 加工区分（先寸／アイトレ）
-- ============================================================
-- 振り分け完了で受付ごとに作られ、受注登録待ち・CAD の一覧の 1 行になる。
--   先寸（sakisun）   : ready（受注登録待ち）→ done（起票完了）
--   アイトレ（aitore）: cad_waiting（CAD 作業待ち）→ cad_working（作業中）→ ready（CSV 登録済）→ done
create table public.work_units (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.intakes (id),
  kind text not null check (kind in ('sakisun', 'aitore')),
  -- 作られ方（split 振り分け / oversight 見落とし追加 / verbal 口頭 / other その他）
  origin text not null default 'split' check (origin in ('split', 'oversight', 'verbal', 'other')),
  -- insert で省略すると、トリガーが先寸は ready、アイトレは cad_waiting を入れる
  status text not null check (status in ('cad_waiting', 'cad_working', 'ready', 'done')),
  -- CAD の担当と作業開始の日時（cad_working にするとトリガーが記録する）
  cad_assignee uuid references public.users (id),
  cad_started_at timestamptz,
  -- 受注登録待ちに入った日時
  ready_at timestamptz,
  -- 起票完了の日時
  done_at timestamptz,
  -- メモ（追加の理由の詳細など）
  note text,
  created_by uuid default auth.uid() references public.users (id),
  updated_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 先寸には CAD の作業がないため、ready・done だけ
  constraint work_units_kind_status_check check (kind = 'aitore' or status in ('ready', 'done')),
  -- ファイル（と、のちに受注）から「同じ受付の加工区分」を参照するための一意制約
  constraint work_units_id_intake_key unique (id, intake_id)
);

comment on table public.work_units is
  '加工区分（先寸／アイトレ）。受注登録待ち・CAD の一覧の 1 行。1 つの加工区分から複数の受注（枝番）を登録できる。';

create index work_units_intake_idx on public.work_units (intake_id);
create index work_units_status_idx on public.work_units (status);

create trigger work_units_touch
  before update on public.work_units
  for each row execute function public.intake_touch_row();

-- 状態に合わせて日時を記録し、起票完了（done）から戻すのを止める。
-- tg_op はトリガーを起こした操作（'INSERT' / 'UPDATE'）。insert のときは old がないため、
-- 「insert か、前の状態と違う」ときだけ日時を入れる
create or replace function public.work_units_before_write()
returns trigger
language plpgsql
as $$
begin
  -- status を省略して insert したら、先寸は ready、アイトレは cad_waiting にする。
  -- not null の制約は before のトリガーの後で確かめられるため、ここで入れれば通る
  if tg_op = 'INSERT' and new.status is null then
    new.status := case new.kind when 'sakisun' then 'ready' else 'cad_waiting' end;
  end if;

  if new.status = 'ready' and (tg_op = 'INSERT' or old.status <> 'ready') then
    new.ready_at := now();
  end if;

  if new.status = 'cad_working' and (tg_op = 'INSERT' or old.status <> 'cad_working') then
    new.cad_started_at := now();
    -- 担当を指定しなければ、作業を始めた人を担当にする
    new.cad_assignee := coalesce(new.cad_assignee, auth.uid());
  end if;

  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.done_at := now();
  end if;

  if tg_op = 'UPDATE' and old.status = 'done' and new.status <> 'done' then
    raise exception '起票完了の加工区分は戻せません (id=%)', old.id;
  end if;

  return new;
end;
$$;

create trigger work_units_before_write
  before insert or update on public.work_units
  for each row execute function public.work_units_before_write();

-- 受付のすべての加工区分が done になったら、受付を closed（完了）にする。
-- 「受注登録待ちに追加」で加工区分が増えたときに dispatched へ戻すのは、add_work_unit() で行う
create or replace function public.work_units_after_write()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and not exists (
    select 1 from public.work_units where intake_id = new.intake_id and status <> 'done'
  ) then
    update public.intakes set status = 'closed' where id = new.intake_id and status = 'dispatched';
  end if;
  return new;
end;
$$;

create trigger work_units_after_write
  after insert or update on public.work_units
  for each row execute function public.work_units_after_write();


-- ============================================================
-- 6. ファイル
-- ============================================================
-- ファイルの実体は Storage のバケット intake-files に置き、ここには情報だけを持つ。
-- パスは {intake_id}/{id}.{拡張子}（日本語のファイル名はパスに使わず、original_name に残す）
create table public.intake_files (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.intakes (id),
  -- 加工区分（振り分け完了の後・追加分・CSV）
  work_unit_id uuid,
  -- 種類（order_pdf 注文書 / original 元データ / split 振り分け済み / added 追加分 / csv CAD の CSV / other）
  kind text not null check (kind in ('order_pdf', 'original', 'split', 'added', 'csv', 'other')),
  -- 振り分けの枠（kind が split のとき必須）
  slot text check (slot in ('sakisun', 'aitore')),
  storage_path text not null unique,
  -- 元のファイル名
  original_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  -- 論理削除（元データは振り分け完了で入る）
  deleted_at timestamptz,
  uploaded_by uuid default auth.uid() references public.users (id),
  updated_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 別の受付の加工区分には付けられないよう、(加工区分, 受付) の組で参照する。
  -- work_unit_id が NULL の行は、この参照の確認の対象外になる
  constraint intake_files_unit_same_intake_fkey foreign key (work_unit_id, intake_id)
    references public.work_units (id, intake_id),
  constraint intake_files_split_needs_slot_check check (kind <> 'split' or slot is not null)
);

comment on table public.intake_files is
  '受付のファイルの情報（注文書 PDF・元データ・振り分け済み・追加分・CAD の CSV）。実体は Storage のバケット intake-files。';

create index intake_files_intake_idx on public.intake_files (intake_id) where deleted_at is null;
create index intake_files_unit_idx on public.intake_files (work_unit_id) where deleted_at is null;
-- 振り分けの枠の中は、同じ名前のファイルを 1 つだけにする（同じ名前は差し替え＝update で扱う）
create unique index intake_files_split_name_unique
  on public.intake_files (intake_id, slot, original_name)
  where kind = 'split' and deleted_at is null;

create trigger intake_files_touch
  before update on public.intake_files
  for each row execute function public.intake_touch_row();

-- CAD の CSV が登録されたら、そのアイトレを ready（受注登録待ち）にする
create or replace function public.intake_files_after_insert()
returns trigger
language plpgsql
as $$
begin
  if new.kind = 'csv' and new.work_unit_id is not null then
    update public.work_units
    set status = 'ready'
    where id = new.work_unit_id
      and kind = 'aitore'
      and status in ('cad_waiting', 'cad_working');
  end if;
  return new;
end;
$$;

create trigger intake_files_after_insert
  after insert on public.intake_files
  for each row execute function public.intake_files_after_insert();
