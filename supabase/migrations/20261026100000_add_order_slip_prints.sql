-- 現場用伝票の印刷の記録（docs/table-design.md「order_slip_prints」、docs/screen-design.md「現場用伝票の印刷」）。
--
-- 伝票（現場用・単価記入用）を印刷するたびに 1 行残す。使い道は 2 つ。
--   ・伝票の右上に「発行 2 回目（再発行）」と出す。現場に 2 枚の伝票が回ったとき、新しい方が分かるようにする
--   ・印刷した後に受注を変更していたら、受注No. で呼び出す画面に「前回の印刷の後に変更されています」と出す
--     （印刷したときの orders.updated_at を残しておき、今の値と比べる。orders.updated_at は
--       update_order・delete_order だけが書き換えるため、状態（status）の更新では変わらない）
--
-- 書き込みは関数 record_order_slip_print だけにする（security definer）。
--   ・何回目の印刷かを、同じ受注の印刷と同時に数えても重ならないよう、受注の行をロックしてから数える
--   ・印刷した人（printed_by）を画面から渡さず、ログイン中のユーザー（auth.uid()）にする
-- 参照は事務・管理者だけ（RLS）。記録は消さない（削除・更新の権限は付けない）。


-- ============================================================
-- 1. テーブル
-- ============================================================
create table public.order_slip_prints (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  -- 伝票の種類。現場用（単価を出さない）/ 単価記入用（単価・金額を出す）
  copy_kind text not null check (copy_kind in ('現場用', '単価記入用')),
  -- 印刷したときの受注の更新日時（今の orders.updated_at と違えば、印刷の後に変更されている）
  order_updated_at timestamptz not null,
  printed_by uuid not null references public.users (id),
  printed_at timestamptz not null default now()
);

comment on table public.order_slip_prints is
  '現場用伝票の印刷の記録。発行の回数と、印刷の後に受注が変更されたかの判定に使う。';

-- 受注ごとに、印刷した順に読む（回数を数える・前回の印刷を探す）
create index order_slip_prints_order_id_idx on public.order_slip_prints (order_id, printed_at);


-- ============================================================
-- 2. RLS・権限（事務・管理者の参照だけ。書くのは関数）
-- ============================================================
alter table public.order_slip_prints enable row level security;

create policy order_slip_prints_select_office
  on public.order_slip_prints for select
  to authenticated
  using (public.current_user_role() in ('office', 'admin'));

-- Data API の「自動で公開」をオフにしているため、権限はここで authenticated にだけ付ける
-- （受付のマイグレーションと同じ。先にすべて外してから付け直す）
revoke all on table public.order_slip_prints from anon, authenticated;
grant select on table public.order_slip_prints to authenticated;


-- ============================================================
-- 3. 印刷を記録する関数
-- ============================================================
-- 戻り値は、その伝票の種類で何回目の印刷か（1 なら初めての印刷）。
-- 削除した受注は印刷できない（ORDER_DELETED）。
create or replace function public.record_order_slip_print(p_order_id uuid, p_copy_kind text)
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
  if p_copy_kind is null or p_copy_kind not in ('現場用', '単価記入用') then
    raise exception '伝票の種類が正しくありません: %', coalesce(p_copy_kind, '(なし)');
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

  insert into public.order_slip_prints (order_id, copy_kind, order_updated_at, printed_by)
  values (p_order_id, p_copy_kind, v_updated_at, auth.uid());

  select count(*) into v_count
  from public.order_slip_prints
  where order_id = p_order_id and copy_kind = p_copy_kind;

  return v_count;
end;
$$;

comment on function public.record_order_slip_print(uuid, text) is
  '現場用伝票の印刷を記録し、その伝票の種類で何回目の印刷かを返す。削除した受注は断る。事務・管理者だけ。';

revoke execute on function public.record_order_slip_print(uuid, text) from public, anon;
grant execute on function public.record_order_slip_print(uuid, text) to authenticated;
