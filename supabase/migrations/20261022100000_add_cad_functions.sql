-- CAD（S-05）で使う関数（docs/intake/table-design.md「関数」、docs/intake/screen-design.md「S-05 CAD」）。
--
--   ・start_cad_work(work_unit_id)   作業開始（CAD 作業待ち → 作業中。担当を自分にする）
--   ・cancel_cad_work(work_unit_id)  作業開始の取り消し（作業中 → 作業待ち。担当と開始日時を空にする）
--   ・add_cad_csv(...)               CAD の CSV の行を足す（同じ加工区分に同じ名前があれば差し替える）
--   ・remove_cad_csv(file_id)        CAD の CSV を外す（CSV が 0 件になったら作業中に戻す）
--   ・work_units_before_write（作り直し）  作業中に戻したときに、最初の作業開始の日時と担当を残す
--   ・CSV の名前の部分一意インデックス（同じ加工区分の中で、同じ名前の CSV は 1 つだけ）
--
-- CSV を足すと、今あるトリガー intake_files_after_insert（20261018100100_create_intake_tables.sql）が
-- そのアイトレを ready（受注登録待ち）にする。この関数ではトリガーに任せ、状態を自分では変えない。
--
-- 関数は security invoker（呼び出したユーザーの権限で実行）にして RLS をそのまま効かせ、ロールは関数の中でも確かめる。
-- エラーの文の先頭の CAD_STATUS_CHANGED は、画面がエラーの種類を見分けるための印
-- （ほかの人が先に状態を変えた → 一覧を読み直す案内を出す）。
--
-- 実行の手順:
--   1. SQL Editor でこのファイルを実行する
--   2. npm run db:types で型を再生成する（関数の型は、生成と同じ形で lib/database.types.ts に先に入れてある）
--   テーブルは増えないため、Data API の設定画面での確認は不要


-- ============================================================
-- 1. 加工区分のトリガーの作り直し
-- ============================================================
-- 前の作り（20261018100100_create_intake_tables.sql）では、作業中（cad_working）になるたびに
-- 作業開始の日時を今の時刻で上書きしていた。CSV を外して ready から作業中に戻したときに、
-- 最初に作業を始めた日時が消えないよう、「作業待ち（または insert）から作業中になったとき」だけ記録する。
-- それ以外は前の作りと同じ。
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

  -- 作業待ちから作業中になったときだけ、開始日時と担当を記録する
  -- （ready から作業中に戻したとき＝CSV を外したときは、前の開始日時と担当をそのまま残す）
  if new.status = 'cad_working' and (tg_op = 'INSERT' or old.status = 'cad_waiting') then
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


-- ============================================================
-- 2. CSV の名前の部分一意インデックス
-- ============================================================
-- 同じ加工区分の中では、同じ名前の CSV を 1 つだけにする（同じ名前で入れ直したら差し替え）。
-- where で、CSV のうち論理削除していない行だけを対象にする（部分一意インデックス）
create unique index intake_files_csv_name_unique
  on public.intake_files (work_unit_id, original_name)
  where kind = 'csv' and deleted_at is null;


-- ============================================================
-- 3. 作業開始
-- ============================================================
-- 作業待ちのアイトレを作業中にし、担当を自分にする（開始日時はトリガーが入れる）。
-- 「作業待ちのときだけ」の条件を付けた update 1 回で決めるため、2 人が同時に押しても 1 人に決まる。
-- 戻り値は、その後の担当（ほかの人が先に始めていたら、その人の id。画面が「○○さんが先に作業を始めました」と出す）
create or replace function public.start_cad_work(p_work_unit_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_assignee uuid;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'CAD の作業を記録できるのは事務・管理者だけです';
  end if;

  update public.work_units wu
  set status = 'cad_working', cad_assignee = auth.uid()
  where wu.id = p_work_unit_id
    and wu.kind = 'aitore'
    and wu.status = 'cad_waiting'
    -- 論理削除した受付の加工区分は動かさない
    and exists (select 1 from public.intakes i where i.id = wu.intake_id and i.deleted_at is null)
  returning cad_assignee into v_assignee;
  if found then
    return v_assignee;
  end if;

  -- 作業待ちでなかった: 今の状態を読んで、ほかの人が始めていたらその人を返す
  select status, cad_assignee into v_status, v_assignee
  from public.work_units
  where id = p_work_unit_id and kind = 'aitore';
  if v_status = 'cad_working' then
    return v_assignee;
  end if;
  raise exception 'CAD_STATUS_CHANGED: 作業待ちではありません (状態=%)', coalesce(v_status, '加工区分なし');
end;
$$;

comment on function public.start_cad_work(uuid) is
  'CAD の作業開始。作業待ちのアイトレを作業中にして担当を自分にする。その後の担当を返す（先にほかの人が始めていたらその人）。';


-- ============================================================
-- 4. 作業開始の取り消し
-- ============================================================
-- 作業中のアイトレを作業待ちに戻し、担当と開始日時を空にする（押し間違い・担当の交代のため）。
-- 担当以外の人も取り消せる（画面で確認のダイアログを出す）
create or replace function public.cancel_cad_work(p_work_unit_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'CAD の作業を記録できるのは事務・管理者だけです';
  end if;

  update public.work_units
  set status = 'cad_waiting', cad_assignee = null, cad_started_at = null
  where id = p_work_unit_id and kind = 'aitore' and status = 'cad_working';
  if not found then
    raise exception 'CAD_STATUS_CHANGED: 作業中ではありません';
  end if;
end;
$$;

comment on function public.cancel_cad_work(uuid) is
  'CAD の作業開始の取り消し。作業中のアイトレを作業待ちに戻し、担当と開始日時を空にする。';


-- ============================================================
-- 5. CSV を足す
-- ============================================================
-- 実物（Storage）は呼び出す前にブラウザが置いておく。ここではファイルの行（kind = 'csv'）だけを作る。
-- 入れられるのは作業中（cad_working）と CSV 登録済（ready）のアイトレ。
--   ・作業中   : 1 つ目の CSV。insert のトリガーが ready（受注登録待ち）にする
--   ・CSV 登録済: 足りなかった CSV の追加と、同じ名前での差し替え
-- 作業待ち（作業開始を押す前）には入れられない（作業開始 → 部品作成 → CSV の出力の流れのため）。
-- 同じ加工区分に同じ名前の CSV があれば、前の行を論理削除してから足す（差し替え）。
-- 前のファイルの置き場所を返すので、呼び出した側が Storage から実物を消す（差し替えがなければ null）。
create or replace function public.add_cad_csv(
  p_work_unit_id uuid,
  p_file_id uuid,
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
  v_intake_id uuid;
  v_replaced_path text;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'CSV を登録できるのは事務・管理者だけです';
  end if;
  if lower(p_original_name) not like '%.csv' then
    raise exception 'CSV のファイルを入れてください';
  end if;

  -- 加工区分の行をロックして、作業開始の取り消し・ほかの人の CSV の登録と同時に動かないようにする
  select wu.status, wu.intake_id into v_status, v_intake_id
  from public.work_units wu
  join public.intakes i on i.id = wu.intake_id and i.deleted_at is null
  where wu.id = p_work_unit_id and wu.kind = 'aitore'
  for update of wu;
  if v_status is null or v_status not in ('cad_working', 'ready') then
    raise exception 'CAD_STATUS_CHANGED: CSV を入れられる状態ではありません (状態=%)', coalesce(v_status, '加工区分なし');
  end if;

  -- 同じ加工区分の同じ名前の CSV を論理削除する（with ... update ... returning で、消した行の置き場所を受け取る）
  with replaced as (
    update public.intake_files
    set deleted_at = now()
    where work_unit_id = p_work_unit_id
      and kind = 'csv'
      and original_name = p_original_name
      and deleted_at is null
    returning storage_path
  )
  select storage_path into v_replaced_path from replaced limit 1;

  -- この insert で、トリガー intake_files_after_insert が作業中のアイトレを ready にする
  insert into public.intake_files (id, intake_id, work_unit_id, kind, original_name, storage_path, mime_type, size_bytes)
  values (p_file_id, v_intake_id, p_work_unit_id, 'csv', p_original_name, p_storage_path, p_mime_type, p_size_bytes);

  return v_replaced_path;
end;
$$;

comment on function public.add_cad_csv(uuid, uuid, text, text, text, bigint) is
  'CAD の CSV の行を足す（トリガーで受注登録待ちになる）。同じ名前は差し替え（前の置き場所を返す）。作業中・CSV 登録済のアイトレだけ。';


-- ============================================================
-- 6. CSV を外す
-- ============================================================
-- 間違えた CSV を外す（論理削除して置き場所を返す。呼び出した側が Storage から実物を消す）。
-- 外せるのは CSV 登録済（ready）の間だけ。起票完了（done）の後は外さない。
-- 外して CSV が 0 件になったら、作業中に戻す（担当と最初の開始日時はトリガーが残す）。
-- 担当以外の人も外せる（画面で確認のダイアログを出す）。
-- 受注が加工区分を参照するようになったら（PR 9）、受注のある加工区分では外せないようにする
create or replace function public.remove_cad_csv(p_file_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_work_unit_id uuid;
  v_status text;
  v_path text;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'CSV を外せるのは事務・管理者だけです';
  end if;

  select work_unit_id into v_work_unit_id
  from public.intake_files
  where id = p_file_id and kind = 'csv' and deleted_at is null;
  if v_work_unit_id is null then
    raise exception 'CSV が見つかりません（ほかの人が外した可能性があります）';
  end if;

  select status into v_status from public.work_units where id = v_work_unit_id for update;
  if v_status <> 'ready' then
    raise exception 'CAD_STATUS_CHANGED: CSV を外せる状態ではありません (状態=%)', v_status;
  end if;

  update public.intake_files
  set deleted_at = now()
  where id = p_file_id
  returning storage_path into v_path;

  if not exists (
    select 1 from public.intake_files
    where work_unit_id = v_work_unit_id and kind = 'csv' and deleted_at is null
  ) then
    update public.work_units set status = 'cad_working' where id = v_work_unit_id;
  end if;

  return v_path;
end;
$$;

comment on function public.remove_cad_csv(uuid) is
  'CAD の CSV を外す（論理削除。置き場所を返す）。CSV 登録済の間だけ。0 件になったら作業中に戻す。';


-- ============================================================
-- 7. 実行の権限
-- ============================================================
-- 関数は作った時点で public（全員）に実行の権限が付くため、外してから authenticated にだけ付ける
revoke execute on function
  public.start_cad_work(uuid),
  public.cancel_cad_work(uuid),
  public.add_cad_csv(uuid, uuid, text, text, text, bigint),
  public.remove_cad_csv(uuid)
from public, anon;

grant execute on function
  public.start_cad_work(uuid),
  public.cancel_cad_work(uuid),
  public.add_cad_csv(uuid, uuid, text, text, text, bigint),
  public.remove_cad_csv(uuid)
to authenticated;
