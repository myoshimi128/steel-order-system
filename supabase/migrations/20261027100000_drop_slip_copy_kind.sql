-- 現場用伝票の印刷の記録から、伝票の種類（copy_kind）をなくす
-- （docs/table-design.md「order_slip_prints」、docs/screen-design.md「現場用伝票の印刷」）。
--
-- 単価記入用の伝票をやめ、印刷する伝票は現場用だけにした（単価は仕入入力の画面（予定）で扱う）。
-- 伝票が 1 種類になったため、どの記録も同じ値になる copy_kind の列は持たない。
-- 発行の回数は、受注ごとに印刷した回数をそのまま数える。
--
--   1. 単価記入用の記録を消す（試しに印刷した記録が、現場用の回数に混ざらないようにするため）
--   2. 古い関数（伝票の種類を受け取る形）を消す。引数が変わるため、create or replace では置き換えられない
--   3. 列 copy_kind を消す（CHECK 制約も一緒に消える）
--   4. 関数を、受注だけを受け取る形で作り直す


-- ============================================================
-- 1. 単価記入用の記録を消す
-- ============================================================
delete from public.order_slip_prints where copy_kind = '単価記入用';


-- ============================================================
-- 2. 古い関数を消す
-- ============================================================
drop function public.record_order_slip_print(uuid, text);


-- ============================================================
-- 3. 列を消す
-- ============================================================
alter table public.order_slip_prints drop column copy_kind;


-- ============================================================
-- 4. 印刷を記録する関数（作り直し）
-- ============================================================
-- 戻り値は、その受注で何回目の印刷か（1 なら初めての印刷）。
-- 削除した受注は印刷できない（ORDER_DELETED）。
create function public.record_order_slip_print(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_no text;
  v_updated_at timestamptz;
  v_deleted_at timestamptz;
  v_count integer;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '伝票を印刷できるのは事務・管理者だけです';
  end if;

  -- 受注の行をロックする。同じ受注を同時に印刷しても、回数が重ならないようにするため
  -- （for share にすると 2 人が同時に数えて同じ回数になりうるため、for update にする）
  select order_no, updated_at, deleted_at into v_order_no, v_updated_at, v_deleted_at
  from public.orders
  where id = p_order_id
  for update;
  if v_order_no is null then
    raise exception 'ORDER_NOT_FOUND: 受注が見つかりません';
  end if;
  if v_deleted_at is not null then
    raise exception 'ORDER_DELETED: 削除された受注は印刷できません (受注No.=%)', v_order_no;
  end if;

  insert into public.order_slip_prints (order_id, order_updated_at, printed_by)
  values (p_order_id, v_updated_at, auth.uid());

  select count(*) into v_count
  from public.order_slip_prints
  where order_id = p_order_id;

  return v_count;
end;
$$;

comment on function public.record_order_slip_print(uuid) is
  '現場用伝票の印刷を記録し、その受注で何回目の印刷かを返す。削除した受注は断る。事務・管理者だけ。';

-- 関数を作り直したので、権限も付け直す（public と anon からは外し、authenticated にだけ付ける）
revoke execute on function public.record_order_slip_print(uuid) from public, anon;
grant execute on function public.record_order_slip_print(uuid) to authenticated;
