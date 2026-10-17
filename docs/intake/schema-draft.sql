-- =====================================================================
-- 受付〜受注登録機能 マイグレーションの下書き
--
-- ・docs/intake/table-design.md と同じ内容を SQL にしたもの。実装前の下書きであり、そのまま実行しない
-- ・実装の PR で supabase/migrations/ に本物のマイグレーション（いくつかのファイルに分ける）を作ったら、
--   このファイルは削除する（設計書と SQL が二重に残って食い違わないようにするため）
-- ・既存のテーブル名・ロール判定（current_user_role()）・private スキーマの使い方は本体に合わせている
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. 共通：updated_at / updated_by を自動で入れる
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- 1. 営業所（加工場所・ユーザーの所属）
-- ---------------------------------------------------------------------
create table public.sites (
  id         uuid primary key default gen_random_uuid(),
  -- 画面の番号（1 本社 / 2 A営業所 / 3 B営業所）。並び順にも使う
  number     integer not null unique check (number >= 1),
  code       text not null unique,
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id)
);
create trigger sites_touch before update on public.sites
  for each row execute function public.intake_touch_row();

insert into public.sites (number, code, name)
values (1, 'honsha', '本社'), (2, 'a', 'A営業所'), (3, 'b', 'B営業所');


-- ---------------------------------------------------------------------
-- 2. users：部署・営業所、社員No. の一意制約
-- ---------------------------------------------------------------------
alter table public.users
  add column department text
    check (department in ('sales', 'processing', 'shearing', 'delivery', 'general')),
  add column site_id uuid references public.sites (id),
  add constraint users_employee_no_key unique (employee_no);

-- 通知の RLS で使う、ログイン中のユーザーの部署。
-- current_user_role() と同じく security definer にして、users の RLS を経由せずに読む
create or replace function public.current_user_department()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select department from public.users where id = auth.uid();
$$;

-- ログインのメールアドレスの決まった形：{社員No. を小文字にしたもの}@staff.invalid
-- （.invalid は実在しないことが保証されたドメイン）。
-- handle_new_auth_user() で、メールアドレスの @ より前を大文字にして employee_no に入れるよう作り直す。


-- ---------------------------------------------------------------------
-- 3. 受付
-- ---------------------------------------------------------------------
create table public.intakes (
  id               uuid primary key default gen_random_uuid(),
  intake_no        text unique,                 -- 26-1003（受付登録で採番）
  intake_year      smallint,
  intake_seq       integer,
  last_branch      integer not null default 0,  -- 受注No. の枝番のカウンター

  channel          text not null check (channel in ('mail', 'fax', 'verbal', 'visit', 'other')),
  received_at      timestamptz not null default now(),
  status           text not null default 'waiting'
                     check (status in ('waiting', 'registered', 'dispatched', 'closed', 'estimate', 'excluded')),

  -- 受注情報（受付と受注で共通の入力欄）
  intake_date          date,                                          -- 受付日
  staff_id             uuid references public.users (id),             -- 担当者（自社）
  customer_id          uuid references public.customers (id),         -- 売り先
  customer_contact     text,                                          -- 客先担当
  project_name         text,                                          -- 工事名
  due_date_type        text check (due_date_type in ('確定', '仮納期', '後報', '最短出荷')),
  due_date             date,                                          -- 代表の納期
  delivery_method_id   uuid references public.delivery_methods (id),  -- 配達
  delivery_method_note text,
  is_urgent            boolean not null default false,                -- 至急
  site_id              uuid references public.sites (id),             -- 加工場所
  site_change_reason_input text,  -- 加工場所を変えるときに理由を一緒に送る欄（トリガーが履歴に移して空にする）
  memo                 text,

  registered_by    uuid references public.users (id),  -- 「受付登録」を押した人（記録用）
  registered_at    timestamptz,
  handling_by      uuid references public.users (id),  -- 対応中の人（二重登録の防止）
  handling_at      timestamptz,

  -- Phase 2：メール自動取り込み
  email_from       text,
  email_subject    text,
  email_body       text,
  email_message_id text unique,

  deleted_at       timestamptz,  -- 受付登録の「2 削除」（論理削除）
  created_by       uuid default auth.uid() references public.users (id),
  updated_by       uuid references public.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint intakes_no_set_together check (
    (intake_no is null and intake_year is null and intake_seq is null)
    or (intake_no is not null and intake_year is not null and intake_seq is not null)),
  constraint intakes_year_seq_unique unique (intake_year, intake_seq),
  constraint intakes_no_required check (status in ('waiting', 'excluded') or intake_no is not null),
  -- 受付登録した後は、売り先と加工場所が必須
  constraint intakes_registered_required check (
    status not in ('registered', 'dispatched', 'closed')
    or (customer_id is not null and site_id is not null)),
  -- 納期：確定・仮納期は日付が必須、後報・最短出荷（と未入力）は日付なし（orders と同じ）
  constraint intakes_due_date check (
    (due_date_type in ('確定', '仮納期') and due_date is not null)
    or (due_date_type is distinct from '確定' and due_date_type is distinct from '仮納期' and due_date is null))
);
create index intakes_status_idx   on public.intakes (status);
create index intakes_received_idx on public.intakes (received_at desc);
create index intakes_site_idx     on public.intakes (site_id);
create trigger intakes_touch before update on public.intakes
  for each row execute function public.intake_touch_row();

-- 受付の入れ先（複数）。destination_id が NULL の行は「0 売り先と同じ」
create table public.intake_destinations (
  id             uuid primary key default gen_random_uuid(),
  intake_id      uuid not null references public.intakes (id) on delete cascade,
  seq            smallint not null,  -- 表示順 1, 2, 3 …
  destination_id uuid references public.delivery_destinations (id),
  created_at     timestamptz not null default now(),
  unique (intake_id, seq)
);
-- 「売り先と同じ」は 1 つの受付に 1 行まで、同じ納入先も 1 行まで
create unique index intake_destinations_same_as_customer_unique
  on public.intake_destinations (intake_id) where destination_id is null;
create unique index intake_destinations_destination_unique
  on public.intake_destinations (intake_id, destination_id) where destination_id is not null;

-- 加工場所の変更履歴
create table public.intake_site_changes (
  id           uuid primary key default gen_random_uuid(),
  intake_id    uuid not null references public.intakes (id),
  from_site_id uuid references public.sites (id),
  to_site_id   uuid references public.sites (id),
  reason       text,
  changed_by   uuid default auth.uid() references public.users (id),
  changed_at   timestamptz not null default now()
);

create or replace function public.intakes_log_site_change()
returns trigger
language plpgsql
security definer  -- intake_site_changes はアプリから直接書かせないため、トリガーは所有者の権限で書く
set search_path = public, pg_temp
as $$
begin
  if old.site_id is distinct from new.site_id then
    insert into public.intake_site_changes (intake_id, from_site_id, to_site_id, reason)
    values (new.id, old.site_id, new.site_id, nullif(btrim(new.site_change_reason_input), ''));
  end if;
  new.site_change_reason_input := null;
  return new;
end;
$$;
create trigger intakes_log_site_change before update on public.intakes
  for each row execute function public.intakes_log_site_change();


-- ---------------------------------------------------------------------
-- 4. 受付No. の採番（private スキーマ）
-- ---------------------------------------------------------------------
create table private.intake_no_counters (
  year       smallint primary key,
  last_seq   integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table private.intake_no_counters enable row level security;
revoke all on table private.intake_no_counters from anon, authenticated;

-- 受付No. を採番する（何度呼んでも同じ番号）。register_intake などの中から呼ぶ
create or replace function private.assign_intake_no(p_intake_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_no   text;
  v_year smallint;
  v_seq  integer;
begin
  select intake_no into v_no from public.intakes where id = p_intake_id for update;
  if not found then raise exception '受付が見つかりません (id=%)', p_intake_id; end if;
  if v_no is not null then return v_no; end if;

  v_year := extract(year from (now() at time zone 'Asia/Tokyo'))::smallint;
  insert into private.intake_no_counters as c (year, last_seq) values (v_year, 1)
  on conflict (year) do update set last_seq = c.last_seq + 1, updated_at = now()
  returning last_seq into v_seq;

  -- 例：2026 年の 1003 件目 → '26-1003'。10000 件以上は桁を増やす
  v_no := lpad((v_year % 100)::text, 2, '0') || '-' ||
          case when v_seq < 10000 then lpad(v_seq::text, 4, '0') else v_seq::text end;
  update public.intakes set intake_no = v_no, intake_year = v_year, intake_seq = v_seq where id = p_intake_id;
  return v_no;
end;
$$;
revoke execute on function private.assign_intake_no(uuid) from public;
grant execute on function private.assign_intake_no(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 5. 加工区分（先寸／アイトレ）
-- ---------------------------------------------------------------------
create table public.work_units (
  id             uuid primary key default gen_random_uuid(),
  intake_id      uuid not null references public.intakes (id),
  kind           text not null check (kind in ('sakisun', 'aitore')),
  origin         text not null default 'split' check (origin in ('split', 'oversight', 'verbal', 'other')),
  status         text not null check (status in ('cad_waiting', 'cad_working', 'ready', 'done')),
  cad_assignee   uuid references public.users (id),
  cad_started_at timestamptz,
  ready_at       timestamptz,
  done_at        timestamptz,
  note           text,
  created_by     uuid default auth.uid() references public.users (id),
  updated_by     uuid references public.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint wu_kind_status check (kind = 'aitore' or status in ('ready', 'done')),
  constraint wu_id_intake unique (id, intake_id)
);
create index wu_intake_idx on public.work_units (intake_id);
create index wu_status_idx on public.work_units (status);
create trigger wu_touch before update on public.work_units
  for each row execute function public.intake_touch_row();

create or replace function public.work_units_before_write()
returns trigger
language plpgsql
as $$
begin
  -- status を省略して insert したら、先寸は ready、アイトレは cad_waiting にする
  if tg_op = 'INSERT' and new.status is null then
    new.status := case new.kind when 'sakisun' then 'ready' else 'cad_waiting' end;
  end if;
  if new.status = 'ready' and (tg_op = 'INSERT' or old.status <> 'ready') then new.ready_at := now(); end if;
  if new.status = 'cad_working' and (tg_op = 'INSERT' or old.status <> 'cad_working') then
    new.cad_started_at := now();
    new.cad_assignee := coalesce(new.cad_assignee, auth.uid());
  end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then new.done_at := now(); end if;
  if tg_op = 'UPDATE' and old.status = 'done' and new.status <> 'done' then
    raise exception '起票完了の加工区分は戻せません (id=%)', old.id;
  end if;
  return new;
end;
$$;
create trigger wu_before_write before insert or update on public.work_units
  for each row execute function public.work_units_before_write();

-- すべての加工区分が done になったら受付を closed にする
create or replace function public.work_units_after_write()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and not exists (
       select 1 from public.work_units where intake_id = new.intake_id and status <> 'done') then
    update public.intakes set status = 'closed' where id = new.intake_id and status = 'dispatched';
  end if;
  return new;
end;
$$;
create trigger wu_after_write after insert or update on public.work_units
  for each row execute function public.work_units_after_write();


-- ---------------------------------------------------------------------
-- 6. ファイル
-- ---------------------------------------------------------------------
create table public.intake_files (
  id            uuid primary key default gen_random_uuid(),
  intake_id     uuid not null references public.intakes (id),
  work_unit_id  uuid,
  kind          text not null check (kind in ('order_pdf', 'original', 'split', 'added', 'csv', 'other')),
  slot          text check (slot in ('sakisun', 'aitore')),  -- 振り分けの枠（kind='split' のとき）
  storage_path  text not null unique,
  original_name text not null,
  mime_type     text,
  size_bytes    bigint check (size_bytes >= 0),
  deleted_at    timestamptz,
  uploaded_by   uuid default auth.uid() references public.users (id),
  updated_by    uuid references public.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint files_unit_same_intake foreign key (work_unit_id, intake_id) references public.work_units (id, intake_id),
  constraint files_split_needs_slot check (kind <> 'split' or slot is not null)
);
create index files_intake_idx on public.intake_files (intake_id) where deleted_at is null;
create index files_unit_idx   on public.intake_files (work_unit_id) where deleted_at is null;
-- 振り分けの枠の中は同じ名前を 1 つだけ（差し替え用）
create unique index files_split_name_unique on public.intake_files (intake_id, slot, original_name)
  where kind = 'split' and deleted_at is null;
create trigger files_touch before update on public.intake_files
  for each row execute function public.intake_touch_row();

-- CAD の CSV が登録されたら、アイトレを ready（受注登録待ち）にする
create or replace function public.intake_files_after_insert()
returns trigger
language plpgsql
as $$
begin
  if new.kind = 'csv' and new.work_unit_id is not null then
    update public.work_units set status = 'ready'
     where id = new.work_unit_id and kind = 'aitore' and status in ('cad_waiting', 'cad_working');
  end if;
  return new;
end;
$$;
create trigger intake_files_after_insert after insert on public.intake_files
  for each row execute function public.intake_files_after_insert();


-- ---------------------------------------------------------------------
-- 7. 通知
-- ---------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  dept       text not null check (dept in ('sales', 'processing', 'shearing', 'delivery', 'general')),
  kind       text not null,  -- 'intake_new' など
  intake_id  uuid references public.intakes (id),
  title      text not null,
  body       text,
  created_at timestamptz not null default now()
);
create index notifications_dept_idx on public.notifications (dept, created_at desc);

create table public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id         uuid not null references public.users (id),
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- 受付待ちが追加されたら、シャーリング部への通知を作る
create or replace function public.intakes_notify_new()
returns trigger
language plpgsql
security definer  -- notifications はアプリから直接書かせないため、所有者の権限で書く
set search_path = public, pg_temp
as $$
begin
  if new.status = 'waiting' then
    insert into public.notifications (dept, kind, intake_id, title, body)
    values ('shearing', 'intake_new', new.id,
            case new.channel when 'mail' then '新しいメールが届きました'
                             when 'fax'  then '新しいFAXが届きました'
                             else '受付が追加されました' end,
            coalesce(new.email_from, '') ||
              case when new.email_subject is not null then '　' || new.email_subject else '' end);
  end if;
  return new;
end;
$$;
create trigger intakes_notify_new after insert on public.intakes
  for each row execute function public.intakes_notify_new();


-- ---------------------------------------------------------------------
-- 8. 目安納期（納期連絡）
-- ---------------------------------------------------------------------
create table public.lead_time_items (
  id         uuid primary key default gen_random_uuid(),
  dept       text not null check (dept in ('processing', 'shearing')),
  name       text not null,
  sort_order integer not null default 0,
  days       integer check (days >= 0),
  congestion text not null default 'normal' check (congestion in ('normal', 'busy', 'crowded', 'consult')),
  note       text,  -- 補足（ホームには出さない）
  updated_by uuid references public.users (id),
  updated_at timestamptz not null default now(),
  unique (dept, name)
);
create trigger lead_items_touch before update on public.lead_time_items
  for each row execute function public.intake_touch_row();

create table public.lead_time_messages (
  dept       text primary key check (dept in ('processing', 'shearing')),
  message    text,
  expires_on date,
  updated_by uuid references public.users (id),
  updated_at timestamptz not null default now()
);
create trigger lead_msgs_touch before update on public.lead_time_messages
  for each row execute function public.intake_touch_row();

create table public.lead_time_history (
  id         uuid primary key default gen_random_uuid(),
  dept       text not null,
  summary    text not null,
  changed_by uuid default auth.uid() references public.users (id),
  changed_at timestamptz not null default now()
);

insert into public.lead_time_items (dept, name, sort_order) values
  ('processing', '切断', 1), ('processing', '穴あけ', 2), ('processing', 'プレス', 3),
  ('processing', 'DS', 4), ('processing', 'ショット', 5), ('processing', 'CT', 6),
  ('shearing', 'レーザー', 1), ('shearing', 'プラズマ', 2);
insert into public.lead_time_messages (dept) values ('processing'), ('shearing');


-- ---------------------------------------------------------------------
-- 9. 受付の関数
-- ---------------------------------------------------------------------
-- 9.1 受付登録（必須のチェック → 採番 → registered）
create or replace function public.register_intake(p_intake_id uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v public.intakes%rowtype;
  v_no text;
begin
  select * into v from public.intakes where id = p_intake_id for update;
  if not found or v.deleted_at is not null then raise exception '受付が見つかりません'; end if;
  if v.status <> 'waiting' then raise exception '受付待ちではありません (状態=%)', v.status; end if;
  -- 画面での必須は売り先だけ。加工場所は画面で必ず初期値が入るが、念のため確認する
  if v.customer_id is null then raise exception '売り先を入力してください'; end if;
  if v.site_id is null then raise exception '加工場所を入力してください'; end if;

  v_no := private.assign_intake_no(p_intake_id);
  update public.intakes
     set status = 'registered', registered_by = auth.uid(), registered_at = now(),
         handling_by = null, handling_at = null
   where id = p_intake_id;
  return v_no;
end;
$$;

-- 9.2 振り分け完了
--   枠のファイルから加工区分を作り、元データを論理削除する。
--   戻り値：Storage から削除するパスの配列（アプリが削除する）
--   p_no_file_kinds：図面なしで登録する区分（例：array['sakisun']）
create or replace function public.complete_split(p_intake_id uuid, p_no_file_kinds text[] default '{}')
returns text[]
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_unit   uuid;
  v_kind   text;
  v_paths  text[];
begin
  select status into v_status from public.intakes where id = p_intake_id for update;
  if v_status <> 'registered' then raise exception '振り分け待ちではありません (状態=%)', v_status; end if;

  for v_kind in
    select distinct slot from public.intake_files
     where intake_id = p_intake_id and kind = 'split' and deleted_at is null and work_unit_id is null
    union
    select unnest(p_no_file_kinds)
  loop
    insert into public.work_units (intake_id, kind, origin) values (p_intake_id, v_kind, 'split')
    returning id into v_unit;
    update public.intake_files set work_unit_id = v_unit
     where intake_id = p_intake_id and kind = 'split' and slot = v_kind
       and deleted_at is null and work_unit_id is null;
  end loop;

  if not exists (select 1 from public.work_units where intake_id = p_intake_id) then
    raise exception '先寸・アイトレのどちらにも振り分けられていません';
  end if;

  with d as (
    update public.intake_files set deleted_at = now()
     where intake_id = p_intake_id and kind = 'original' and deleted_at is null
    returning storage_path)
  select coalesce(array_agg(storage_path), '{}') into v_paths from d;

  update public.intakes set status = 'dispatched' where id = p_intake_id;
  return v_paths;
end;
$$;

-- 9.3 受注登録待ちに追加（見落とし・口頭など）
create or replace function public.add_work_unit(p_intake_id uuid, p_kind text, p_origin text, p_note text default null)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_id     uuid;
begin
  select status into v_status from public.intakes where id = p_intake_id and deleted_at is null for update;
  if v_status is null or v_status not in ('dispatched', 'closed') then
    raise exception 'この受付には追加できません (状態=%)。振り分け完了後に追加してください', v_status;
  end if;
  if p_origin = 'split' then raise exception '追加の理由を選んでください'; end if;
  insert into public.work_units (intake_id, kind, origin, note)
  values (p_intake_id, p_kind, p_origin, p_note) returning id into v_id;
  update public.intakes set status = 'dispatched' where id = p_intake_id and status = 'closed';
  return v_id;
end;
$$;

-- 9.4 加工区分の起票完了
create or replace function public.complete_work_unit(p_work_unit_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select status into v_status from public.work_units where id = p_work_unit_id for update;
  if not found then raise exception '加工区分が見つかりません'; end if;
  if v_status <> 'ready' then raise exception '受注登録待ちではありません (状態=%)', v_status; end if;
  update public.work_units set status = 'done' where id = p_work_unit_id;
end;
$$;

-- 9.5 受注No. の枝番の採番（create_order の中からだけ呼ぶ）
create or replace function private.issue_order_branch(p_intake_id uuid, out branch_no integer, out order_no text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_no text;
begin
  -- update で受付の行をロックするため、同時に登録しても枝番は重複しない
  update public.intakes set last_branch = last_branch + 1
   where id = p_intake_id and intake_no is not null and deleted_at is null
  returning last_branch, intake_no into branch_no, v_no;
  if not found then raise exception '受付No. のない受付です (id=%)', p_intake_id; end if;
  order_no := v_no || '-' || branch_no;
end;
$$;
revoke execute on function private.issue_order_branch(uuid) from public;
grant execute on function private.issue_order_branch(uuid) to authenticated;

grant execute on function public.register_intake(uuid), public.complete_split(uuid, text[]),
  public.add_work_unit(uuid, text, text, text), public.complete_work_unit(uuid) to authenticated;
revoke execute on function public.register_intake(uuid), public.complete_split(uuid, text[]),
  public.add_work_unit(uuid, text, text, text), public.complete_work_unit(uuid) from public, anon;


-- ---------------------------------------------------------------------
-- 10. 受注（orders）の変更
-- ---------------------------------------------------------------------
-- テストデータの受注は消してよい（ユーザー確認済み）。新しい NOT NULL の列を足すため、先に消す
delete from public.shipment_items;
delete from public.shipments;
delete from public.attachments;
delete from public.order_stamps;
delete from public.order_item_processes;
delete from public.order_items;
delete from public.orders;

alter table public.orders
  add column intake_id    uuid not null references public.intakes (id),
  add column work_unit_id uuid not null,
  add column branch_no    integer not null,
  add column member_class text not null default 'NONE'
    check (member_class in ('NONE', 'DF', 'GPL', 'BH', 'SPL')),
  add column site_id      uuid not null references public.sites (id),
  add column staff_id     uuid not null default auth.uid() references public.users (id),
  add constraint orders_unit_same_intake foreign key (work_unit_id, intake_id)
    references public.work_units (id, intake_id),
  add constraint orders_intake_branch_key unique (intake_id, branch_no);
create index orders_work_unit_idx on public.orders (work_unit_id);

-- スプライス専用の受注は部材区分 SPL にまとめる（is_splice は廃止）
alter table public.orders drop constraint orders_splice_columns_check;
alter table public.orders drop column is_splice;
alter table public.orders
  add constraint orders_splice_columns_check check (
    (member_class <> 'SPL' and joint_no is null and splice_shot is null)
    or (
      member_class = 'SPL'
      and (joint_no is null or char_length(joint_no) between 1 and 10)
      and splice_shot is not null
    )
  );

-- 受注No. は create_order の中で {受付No.}-{枝番} を入れるため、旧来の採番（2600001）の初期値を外す
alter table public.orders alter column order_no drop default;
alter table public.orders alter column order_no set not null;
drop function private.next_order_no();
drop table private.order_no_counters;

-- 受注のある受付は削除できない
create or replace function public.intakes_prevent_deleting_ordered()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null
     and exists (select 1 from public.orders where intake_id = new.id and deleted_at is null) then
    raise exception '受注が登録されている受付は削除できません (受付No.=%)', new.intake_no;
  end if;
  return new;
end;
$$;
create trigger intakes_prevent_deleting_ordered before update on public.intakes
  for each row execute function public.intakes_prevent_deleting_ordered();

-- create_order は 20261003100100 の版を作り直す。違いは次のとおり（明細・加工・スタンプの登録は同じ）:
--   1. p_order から intake_id・work_unit_id・member_class・site_id・staff_id を受け取る
--   2. orders の insert の前に private.issue_order_branch(intake_id) を呼び、branch_no と order_no を決めて insert に含める
--   3. is_splice の代わりに member_class を insert する（SPL のとき joint_no・splice_shot を入れる）
--   4. site_id が受付の加工場所と違えば、受付の site_id を更新する（変更履歴はトリガーが残す）
--   受注の insert と枝番の採番は同じ transaction の中で行われるため、登録に失敗すると枝番も取り消される

-- attachments は使わない（intake_files に一本化）。参照しているコードを外したあとのマイグレーションで drop する


-- ---------------------------------------------------------------------
-- 11. ビュー：受注登録待ち・CAD の一覧
-- ---------------------------------------------------------------------
create view public.work_unit_queue_view with (security_invoker = true) as
select wu.id as work_unit_id, wu.kind, wu.origin, wu.status, wu.cad_assignee, wu.cad_started_at, wu.ready_at,
       i.id as intake_id, i.intake_no, i.customer_id, c.name as customer_name, i.project_name,
       i.due_date_type, i.due_date, i.is_urgent, i.site_id, i.staff_id, u.name as staff_name, i.registered_at,
       (select count(*) from public.intake_files f where f.work_unit_id = wu.id and f.deleted_at is null) as file_count
from public.work_units wu
join public.intakes i on i.id = wu.intake_id
left join public.customers c on c.id = i.customer_id
left join public.users u on u.id = i.staff_id
where wu.status <> 'done' and i.deleted_at is null;
-- 並び順はクエリ側：is_urgent desc, due_date asc nulls last, registered_at asc
grant select on public.work_unit_queue_view to authenticated;


-- ---------------------------------------------------------------------
-- 12. RLS（本体の 3 ロールで制御。物理削除は不可）
-- ---------------------------------------------------------------------
-- 受付の業務テーブル：事務・管理者は参照・登録・更新、現場は参照不可
do $$
declare t text;
begin
  foreach t in array array['intakes', 'intake_destinations', 'work_units', 'intake_files']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy %I on public.%I for select to authenticated
                     using (public.current_user_role() in ('office', 'admin'))$p$, t || '_select_office', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
                     with check (public.current_user_role() in ('office', 'admin'))$p$, t || '_insert_office', t);
    execute format($p$create policy %I on public.%I for update to authenticated
                     using (public.current_user_role() in ('office', 'admin'))
                     with check (public.current_user_role() in ('office', 'admin'))$p$, t || '_update_office', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;
-- 受付の入れ先は編集で入れ直すため削除を許可
create policy intake_destinations_delete_office on public.intake_destinations for delete to authenticated
  using (public.current_user_role() in ('office', 'admin'));
grant delete on public.intake_destinations to authenticated;

-- 加工場所の変更履歴：参照のみ（書くのはトリガー）
alter table public.intake_site_changes enable row level security;
create policy intake_site_changes_select_office on public.intake_site_changes for select to authenticated
  using (public.current_user_role() in ('office', 'admin'));
grant select on public.intake_site_changes to authenticated;

-- 営業所：参照は全ロール、登録・更新は管理者
alter table public.sites enable row level security;
create policy sites_select_all_roles on public.sites for select to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy sites_admin_all on public.sites for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- 通知：自分の部署の行だけ参照（書くのはトリガー）
alter table public.notifications enable row level security;
create policy notifications_select_own_dept on public.notifications for select to authenticated
  using (dept = public.current_user_department());
grant select on public.notifications to authenticated;

-- 既読：自分の行だけ参照・登録
alter table public.notification_reads enable row level security;
create policy notification_reads_own on public.notification_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert on public.notification_reads to authenticated;

-- 目安納期：参照は全ロール（ホームに表示するため）、登録・更新は事務・管理者
do $$
declare t text;
begin
  foreach t in array array['lead_time_items', 'lead_time_messages', 'lead_time_history']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy %I on public.%I for select to authenticated
                     using (public.current_user_role() in ('office', 'factory', 'admin'))$p$, t || '_select_all_roles', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
                     with check (public.current_user_role() in ('office', 'admin'))$p$, t || '_insert_office', t);
    execute format($p$create policy %I on public.%I for update to authenticated
                     using (public.current_user_role() in ('office', 'admin'))
                     with check (public.current_user_role() in ('office', 'admin'))$p$, t || '_update_office', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 13. Realtime（通知・一覧の自動更新）
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications, public.intakes, public.work_units;


-- ---------------------------------------------------------------------
-- 14. Storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('intake-files', 'intake-files', false, 52428800)  -- 50MB（未決 Q-4）
on conflict (id) do nothing;

create policy intake_files_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'intake-files' and public.current_user_role() in ('office', 'admin'));
create policy intake_files_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'intake-files' and public.current_user_role() in ('office', 'admin'));
create policy intake_files_obj_update on storage.objects for update to authenticated
  using (bucket_id = 'intake-files' and public.current_user_role() in ('office', 'admin'));
create policy intake_files_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'intake-files' and public.current_user_role() in ('office', 'admin'));
