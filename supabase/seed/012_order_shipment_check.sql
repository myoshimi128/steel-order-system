-- 送り状がある受注は変更・削除できないこと（PR 9b。20261025100000_add_order_edit_and_delete.sql のトリガー）を確かめる SQL。
--
-- 送り状の画面はまだないため、仮の送り状を 1 件入れてから、受注のヘッダー・明細・削除を試す。
-- どのブロックも begin ... rollback の中で試すため、データは残らない（最後に取り消す）。
-- エラーになれば正しく止まっている。エラーになると transaction はそこで止まるため、ブロックは 1 つずつ選んで実行する。
-- '26-0001-1' の部分を、確かめたい受注No. に書き換えて実行する。


-- ============================================================
-- 1. 送り状がある受注のヘッダーの変更 → 「送り状が発行されている受注は変更できません」
-- ============================================================
begin;
insert into public.shipments (order_id, shipment_no, shipped_date, created_by)
select id, 'TEST-SHIPMENT', current_date, created_by from public.orders where order_no = '26-0001-1';
update public.orders set project_name = coalesce(project_name, '') || '（試し）' where order_no = '26-0001-1';
rollback;


-- ============================================================
-- 2. 送り状がある受注の削除 → 「出荷実績がある受注は削除できません」
-- ============================================================
begin;
insert into public.shipments (order_id, shipment_no, shipped_date, created_by)
select id, 'TEST-SHIPMENT', current_date, created_by from public.orders where order_no = '26-0001-1';
update public.orders set deleted_at = now() where order_no = '26-0001-1';
rollback;


-- ============================================================
-- 3. 送り状がある受注の明細の変更 → 「送り状が発行されている受注の明細は変更できません」
-- ============================================================
begin;
insert into public.shipments (order_id, shipment_no, shipped_date, created_by)
select id, 'TEST-SHIPMENT', current_date, created_by from public.orders where order_no = '26-0001-1';
update public.order_items set quantity = quantity
where order_id = (select id from public.orders where order_no = '26-0001-1');
rollback;


-- ============================================================
-- 4. 送り状があっても、状態（status。出荷の進み具合）の更新はできる（エラーにならない。最後に取り消す）
-- ============================================================
begin;
insert into public.shipments (order_id, shipment_no, shipped_date, created_by)
select id, 'TEST-SHIPMENT', current_date, created_by from public.orders where order_no = '26-0001-1';
update public.orders set status = '出荷待ち' where order_no = '26-0001-1';
rollback;
