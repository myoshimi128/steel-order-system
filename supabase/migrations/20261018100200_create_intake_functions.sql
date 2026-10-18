-- 受付の関数（docs/intake/table-design.md「関数」）。
--
--   ・private.assign_intake_no(intake_id)  受付No. の採番（security definer。register_intake などの中から呼ぶ）
--   ・register_intake(intake_id)           受付登録（必須のチェック → 採番 → registered）
--   ・complete_split(intake_id, kinds)     振り分け完了（加工区分を作り、元データを論理削除する）
--   ・add_work_unit(intake_id, kind, ...)  受注登録待ちに追加（見落とし・口頭など）
--   ・complete_work_unit(work_unit_id)     加工区分の起票完了（ready → done）
--
-- private 以外の関数は security invoker（呼び出したユーザーの権限で実行）にして、RLS をそのまま効かせる。
-- 現場（factory）が呼んでも、受付の行が RLS で見えないため「見つかりません」になる。
--
-- 受注No. の枝番の採番（private.issue_order_branch）と create_order の変更は、
-- 受注登録画面と受付をつなぐ PR（「実装の順序」PR 9）で作る。


-- ============================================================
-- 1. 受付No. の採番
-- ============================================================
-- 受付No. は YY-NNNN（例: 2026 年の 1003 件目 → 26-1003）。年は日本時間の採番日の年。
-- 10000 件目からは桁を増やす（26-10000）。一度振った番号は再利用しない。
--
-- security definer（関数所有者の権限で実行）にする。カウンター（private.intake_no_counters）は
-- authenticated の権限を外しているため、security invoker の register_intake から呼ぶと
-- 呼び出したユーザーの権限ではカウンターを読み書きできない。受注番号の採番（private.next_order_no）と同じ作り。
-- search_path を空にして、テーブル・関数はすべてスキーマ名つきで書く（定義者の権限で動く関数の決まりごと）。
--
-- 同じ受付で何度呼んでも同じ番号を返す（すでに番号があれば、それを返して終わる）。
-- 同時に 2 件採番しても重複しないよう、insert ... on conflict do update でカウンターの行をロックしてから進める。
-- 呼び出した transaction が取り消されたら、カウンターの更新も取り消される（番号は飛ばない）。
create or replace function private.assign_intake_no(p_intake_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_no text;
  v_year smallint;
  v_seq integer;
begin
  -- for update で受付の行をロックし、同じ受付への同時の採番を 1 件ずつにする
  select intake_no into v_no from public.intakes where id = p_intake_id for update;
  if not found then
    raise exception '受付が見つかりません (id=%)', p_intake_id;
  end if;
  if v_no is not null then
    return v_no;
  end if;

  -- DB のタイムゾーンは UTC のため、日本時間に変換してから年を取る
  v_year := extract(year from (now() at time zone 'Asia/Tokyo'))::smallint;

  -- as c はテーブルの別名。on conflict の中で「今ある行」を c で指す
  insert into private.intake_no_counters as c (year, last_seq)
  values (v_year, 1)
  on conflict (year) do update
    set last_seq = c.last_seq + 1, updated_at = now()
  returning last_seq into v_seq;

  -- 年の下 2 桁 + '-' + 連番（4 桁に 0 埋め。10000 以上はそのまま）
  v_no := lpad((v_year % 100)::text, 2, '0') || '-'
    || case when v_seq < 10000 then lpad(v_seq::text, 4, '0') else v_seq::text end;

  update public.intakes
  set intake_no = v_no, intake_year = v_year, intake_seq = v_seq
  where id = p_intake_id;

  return v_no;
end;
$$;

comment on function private.assign_intake_no(uuid) is
  '受付No.（YY-NNNN）を採番する。すでに番号があれば同じ番号を返す。security definer。register_intake などの中からだけ呼ぶ。';

-- private スキーマは Data API で公開していないため、ブラウザから直接は呼べない。
-- register_intake（ログイン中のユーザーの権限で動く）の中から呼ぶために、authenticated にだけ実行権限を付ける
revoke execute on function private.assign_intake_no(uuid) from public, anon;
grant execute on function private.assign_intake_no(uuid) to authenticated;


-- ============================================================
-- 2. 受付登録
-- ============================================================
-- 受付待ち（waiting）の受付を、受付登録済（registered）にする。受付No. を採番して返す。
-- 受注情報の各欄は、この関数を呼ぶ前に画面から intakes を update して入れておく。
create or replace function public.register_intake(p_intake_id uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  -- %rowtype は「そのテーブルの 1 行と同じ形」の変数
  v public.intakes%rowtype;
  v_no text;
begin
  select * into v from public.intakes where id = p_intake_id for update;
  if not found or v.deleted_at is not null then
    raise exception '受付が見つかりません';
  end if;
  if v.status <> 'waiting' then
    raise exception '受付待ちではありません (状態=%)', v.status;
  end if;
  -- 画面での必須は売り先だけ。加工場所は画面で必ず初期値が入るが、念のため確認する
  if v.customer_id is null then
    raise exception '売り先を入力してください';
  end if;
  if v.site_id is null then
    raise exception '加工場所を入力してください';
  end if;

  v_no := private.assign_intake_no(p_intake_id);

  -- 登録した人と日時を記録し、対応中の表示を外す
  update public.intakes
  set status = 'registered',
      registered_by = auth.uid(),
      registered_at = now(),
      handling_by = null,
      handling_at = null
  where id = p_intake_id;

  return v_no;
end;
$$;

comment on function public.register_intake(uuid) is
  '受付登録。売り先・加工場所を確認し、受付No. を採番して registered にする。受付No. を返す。';


-- ============================================================
-- 3. 振り分け完了
-- ============================================================
-- 振り分けの枠（先寸・アイトレ）にファイルのある区分ごとに加工区分を作り、ファイルを紐付ける。
-- 図面なしで登録する区分は p_no_file_kinds で渡す（例: array['sakisun']）。
-- 元データ（kind='original'）は論理削除し、Storage から消すパスの配列を返す（Storage の削除はアプリが行う）。
create or replace function public.complete_split(p_intake_id uuid, p_no_file_kinds text[] default '{}')
returns text[]
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_unit uuid;
  v_kind text;
  v_paths text[];
begin
  select status into v_status
  from public.intakes
  where id = p_intake_id and deleted_at is null
  for update;
  -- 見つからないと v_status は NULL になる。NULL との <> は NULL（偽ではない）になり if を通り抜けるため、
  -- is null も一緒に確かめる
  if v_status is null or v_status <> 'registered' then
    raise exception '振り分け待ちではありません (状態=%)', coalesce(v_status, '受付なし');
  end if;

  -- 枠にファイルがある区分と、図面なしの区分を合わせて 1 つずつ処理する
  -- （union は重複を除くため、同じ区分が両方にあっても 1 回だけになる。unnest は配列を行に展開する）
  for v_kind in
    select slot from public.intake_files
    where intake_id = p_intake_id and kind = 'split' and deleted_at is null and work_unit_id is null
    union
    select unnest(p_no_file_kinds)
  loop
    insert into public.work_units (intake_id, kind, origin)
    values (p_intake_id, v_kind, 'split')
    returning id into v_unit;

    update public.intake_files
    set work_unit_id = v_unit
    where intake_id = p_intake_id
      and kind = 'split'
      and slot = v_kind
      and deleted_at is null
      and work_unit_id is null;
  end loop;

  if not exists (select 1 from public.work_units where intake_id = p_intake_id) then
    raise exception '先寸・アイトレのどちらにも振り分けられていません';
  end if;

  -- 元データを論理削除し、消したファイルのパスを集める
  -- （with ... update ... returning で、更新した行の値を次の select で使う）
  with deleted as (
    update public.intake_files
    set deleted_at = now()
    where intake_id = p_intake_id and kind = 'original' and deleted_at is null
    returning storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into v_paths from deleted;

  update public.intakes set status = 'dispatched' where id = p_intake_id;

  return v_paths;
end;
$$;

comment on function public.complete_split(uuid, text[]) is
  '振り分け完了。枠ごとに加工区分を作ってファイルを紐付け、元データを論理削除して dispatched にする。Storage から消すパスを返す。';


-- ============================================================
-- 4. 受注登録待ちに追加
-- ============================================================
-- 振り分けの見落とし・口頭での追加注文などで、振り分け完了後の受付に加工区分を足す。
-- 完了（closed）の受付に足したら、振り分け完了（dispatched）に戻す。
create or replace function public.add_work_unit(
  p_intake_id uuid,
  p_kind text,
  p_origin text,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_id uuid;
begin
  select status into v_status
  from public.intakes
  where id = p_intake_id and deleted_at is null
  for update;
  if v_status is null or v_status not in ('dispatched', 'closed') then
    raise exception 'この受付には追加できません (状態=%)。振り分け完了後に追加してください',
      coalesce(v_status, '受付なし');
  end if;
  -- 振り分け（split）は振り分け完了で作られる区分のため、追加では使わない
  if p_origin = 'split' then
    raise exception '追加の理由を選んでください';
  end if;

  insert into public.work_units (intake_id, kind, origin, note)
  values (p_intake_id, p_kind, p_origin, p_note)
  returning id into v_id;

  update public.intakes set status = 'dispatched' where id = p_intake_id and status = 'closed';

  return v_id;
end;
$$;

comment on function public.add_work_unit(uuid, text, text, text) is
  '受注登録待ちに加工区分を追加する（見落とし・口頭など）。振り分け完了後のみ。closed の受付は dispatched に戻す。';


-- ============================================================
-- 5. 起票完了
-- ============================================================
-- 1 つの加工区分から複数の受注（枝番）を登録できるため、done には自動ではせず、
-- 受注登録の画面の「この区分の起票を完了」で呼ぶ。
-- すべての加工区分が done になると、トリガー（work_units_after_write）が受付を closed にする。
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
  if not found then
    raise exception '加工区分が見つかりません';
  end if;
  if v_status <> 'ready' then
    raise exception '受注登録待ちではありません (状態=%)', v_status;
  end if;

  update public.work_units set status = 'done' where id = p_work_unit_id;
end;
$$;

comment on function public.complete_work_unit(uuid) is
  '加工区分の起票完了（ready → done）。すべての区分が done になると受付は closed になる。';


-- ============================================================
-- 6. 実行権限
-- ============================================================
-- ログイン済みのユーザー（authenticated）だけが RPC で呼べるようにする。
-- 関数は作成時に public（全員）へ実行権限が付くため、public と anon から外す
revoke execute on function
  public.register_intake(uuid),
  public.complete_split(uuid, text[]),
  public.add_work_unit(uuid, text, text, text),
  public.complete_work_unit(uuid)
from public, anon;

grant execute on function
  public.register_intake(uuid),
  public.complete_split(uuid, text[]),
  public.add_work_unit(uuid, text, text, text),
  public.complete_work_unit(uuid)
to authenticated;
