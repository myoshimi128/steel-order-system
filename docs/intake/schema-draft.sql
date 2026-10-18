-- =====================================================================
-- 受付〜受注登録機能 マイグレーションの下書き（残りの分）
--
-- ・受付のテーブル・関数・トリガー・ビュー・RLS・Realtime・Storage は、PR 3 で本物のマイグレーションにした
--   （supabase/migrations/20261018100000〜20261018100600）。その分はこの下書きから消した
-- ・ここに残っているのは、まだマイグレーションにしていない次の 2 つ。そのまま実行しない
--     A. 社員No. の一意制約（ログインを社員No. に切り替える PR 4）
--     B. 受注（orders）の変更と受注No. の切り替え（受注登録画面と受付をつなぐ PR 9）
-- ・PR 9 で B をマイグレーションにしたら、このファイルは削除する
--   （設計書と SQL が二重に残って食い違わないようにするため）
-- =====================================================================


-- ---------------------------------------------------------------------
-- A. users：社員No. の一意制約（PR 4）
-- ---------------------------------------------------------------------
alter table public.users
  add constraint users_employee_no_key unique (employee_no);

-- ログインのメールアドレスの決まった形：{社員No. を小文字にしたもの}@staff.invalid
-- （.invalid は実在しないことが保証されたドメイン）。
-- handle_new_auth_user() で、メールアドレスの @ より前を大文字にして employee_no に入れるよう作り直す。


-- ---------------------------------------------------------------------
-- B-1. 受注No. の枝番の採番（PR 9。create_order の中からだけ呼ぶ）
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- B-2. 受注（orders）の変更（PR 9）
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
  add column staff_id     uuid not null default auth.uid() references public.users (id),
  add constraint orders_unit_same_intake foreign key (work_unit_id, intake_id)
    references public.work_units (id, intake_id),
  add constraint orders_intake_branch_key unique (intake_id, branch_no);
create index orders_work_unit_idx on public.orders (work_unit_id);

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

-- create_order は、受注登録画面の作り直しの PR の版（member_class・site_id を受け取る版）を作り直す。違いは次のとおり（明細・加工・スタンプの登録は同じ）:
--   1. p_order から intake_id・work_unit_id・staff_id を受け取る（site_id は受け取り済み）
--   2. orders の insert の前に private.issue_order_branch(intake_id) を呼び、branch_no と order_no を決めて insert に含める
--   3. site_id が受付の加工場所と違えば、受付の site_id を更新する（変更履歴はトリガーが残す）
--   受注の insert と枝番の採番は同じ transaction の中で行われるため、登録に失敗すると枝番も取り消される

-- attachments は使わない（intake_files に一本化）。参照しているコードを外したあとのマイグレーションで drop する
