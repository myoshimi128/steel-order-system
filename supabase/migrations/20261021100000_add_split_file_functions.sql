-- 振り分け（S-04d）で使う列と関数（docs/intake/table-design.md「関数」、docs/intake/screen-design.md「S-04d 振り分け」）。
--
--   ・intake_files.split_done            元データの「分割して保存済」の印（人がチェックする）
--   ・add_split_file(...)                振り分けの枠にファイルを 1 つ足す（同じ枠に同じ名前があれば差し替える）
--   ・remove_split_file(file_id)         振り分けの枠からファイルを外す
--   ・set_original_split_done(file_id, done)  元データの「分割して保存済」の印を付け外しする
-- 振り分け完了は、今ある complete_split をそのまま使う。
--
-- 枠のファイルは、枠に入れた時点で保存する（「一時保存」のボタンは置かない）。
-- 枠を触れるのは受付登録済（registered）の受付だけ。振り分け完了の後は、元データが消えているため振り分けをやり直さない
-- （見落としは受注登録待ち一覧の「受注登録待ちに追加」で直す）。
--
-- 関数は security invoker（呼び出したユーザーの権限で実行）にして RLS をそのまま効かせ、ロールは関数の中でも確かめる。
--
-- 実行の手順:
--   1. SQL Editor でこのファイルを実行する
--   2. npm run db:types で型を再生成する（列と関数の型は、生成と同じ形で lib/database.types.ts に先に入れてある）
--   テーブルは増えないため、Data API の設定画面での確認は不要


-- ============================================================
-- 1. 元データの「分割して保存済」の印
-- ============================================================
-- 1 つの DXF に複数の部品が入っているときは、図面ソフトで先寸・アイトレの部品だけを残して別の名前で保存し、枠に入れる。
-- 枠のファイルと元データの名前が違うため、どの元データを振り分け終えたかは人がこの印で示す。
-- 元データ（kind = 'original'）の行だけで使う。振り分け完了の前に「未振り分けの元データ」を数えるのに使う
alter table public.intake_files
  add column split_done boolean not null default false;

comment on column public.intake_files.split_done is
  '元データの「分割して保存済」の印。人がチェックする。元データ（kind = original）の行だけで使う。';


-- ============================================================
-- 2. 枠にファイルを足す
-- ============================================================
-- 実物（Storage）は呼び出す前に置いておく（パソコンからドロップしたファイルはブラウザが、
-- 元データを枠へドラッグしたときはサーバーが Storage の中で複製する）。ここではファイルの行だけを作る。
-- 同じ枠に同じ名前のファイルがあれば、前の行を論理削除してから足す（差し替え）。
-- 前のファイルの置き場所を返すので、呼び出した側が Storage から実物を消す（差し替えがなければ null）。
-- 前の行の論理削除と新しい行の追加を 1 つの transaction で行うため、途中で失敗しても前のファイルは残る。
create or replace function public.add_split_file(
  p_intake_id uuid,
  p_file_id uuid,
  p_slot text,
  p_original_name text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_replaced_path text;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '振り分けできるのは事務・管理者だけです';
  end if;
  if p_slot not in ('sakisun', 'aitore') then
    raise exception '振り分けの枠が正しくありません';
  end if;

  -- 受付の行をロックして、振り分け完了と同時に枠を変えられないようにする
  select status into v_status
  from public.intakes
  where id = p_intake_id and deleted_at is null
  for update;
  if v_status is null or v_status <> 'registered' then
    raise exception 'SPLIT_NOT_REGISTERED: 振り分け待ちではありません (状態=%)', coalesce(v_status, '受付なし');
  end if;

  -- 同じ枠の同じ名前のファイルを論理削除する（with ... update ... returning で、消した行の置き場所を受け取る）
  with replaced as (
    update public.intake_files
    set deleted_at = now()
    where intake_id = p_intake_id
      and kind = 'split'
      and slot = p_slot
      and original_name = p_original_name
      and deleted_at is null
    returning storage_path
  )
  select storage_path into v_replaced_path from replaced limit 1;

  insert into public.intake_files (id, intake_id, kind, slot, original_name, storage_path, mime_type, size_bytes)
  values (p_file_id, p_intake_id, 'split', p_slot, p_original_name, p_storage_path, p_mime_type, p_size_bytes);

  return v_replaced_path;
end;
$$;

comment on function public.add_split_file(uuid, uuid, text, text, text, text, bigint) is
  '振り分けの枠にファイルの行を足す。同じ枠の同じ名前は差し替え（前の行を論理削除し、その置き場所を返す）。受付登録済の受付だけ。';


-- ============================================================
-- 3. 枠からファイルを外す
-- ============================================================
-- 論理削除して、置き場所を返す（呼び出した側が Storage から実物を消す）
create or replace function public.remove_split_file(p_file_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_intake_id uuid;
  v_status text;
  v_path text;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '振り分けできるのは事務・管理者だけです';
  end if;

  select intake_id into v_intake_id
  from public.intake_files
  where id = p_file_id and kind = 'split' and deleted_at is null;
  if v_intake_id is null then
    raise exception '枠のファイルが見つかりません';
  end if;

  select status into v_status from public.intakes where id = v_intake_id for update;
  if v_status <> 'registered' then
    raise exception 'SPLIT_NOT_REGISTERED: 振り分け待ちではありません (状態=%)', v_status;
  end if;

  update public.intake_files
  set deleted_at = now()
  where id = p_file_id
  returning storage_path into v_path;

  return v_path;
end;
$$;

comment on function public.remove_split_file(uuid) is
  '振り分けの枠からファイルを外す（論理削除）。Storage から消す置き場所を返す。受付登録済の受付だけ。';


-- ============================================================
-- 4. 元データの「分割して保存済」の印
-- ============================================================
create or replace function public.set_original_split_done(p_file_id uuid, p_done boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_intake_id uuid;
  v_status text;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '振り分けできるのは事務・管理者だけです';
  end if;

  select intake_id into v_intake_id
  from public.intake_files
  where id = p_file_id and kind = 'original' and deleted_at is null;
  if v_intake_id is null then
    raise exception '元データが見つかりません';
  end if;

  select status into v_status from public.intakes where id = v_intake_id;
  if v_status <> 'registered' then
    raise exception 'SPLIT_NOT_REGISTERED: 振り分け待ちではありません (状態=%)', v_status;
  end if;

  update public.intake_files set split_done = p_done where id = p_file_id;
end;
$$;

comment on function public.set_original_split_done(uuid, boolean) is
  '元データの「分割して保存済」の印を付け外しする。受付登録済の受付だけ。';


-- ============================================================
-- 5. 実行の権限
-- ============================================================
-- 関数は作った時点で public（全員）に実行の権限が付くため、外してから authenticated にだけ付ける
revoke execute on function
  public.add_split_file(uuid, uuid, text, text, text, text, bigint),
  public.remove_split_file(uuid),
  public.set_original_split_done(uuid, boolean)
from public, anon;

grant execute on function
  public.add_split_file(uuid, uuid, text, text, text, text, bigint),
  public.remove_split_file(uuid),
  public.set_original_split_done(uuid, boolean)
to authenticated;
