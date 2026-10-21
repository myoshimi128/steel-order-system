-- 受注と受付のつながり（PR 9）を確かめる SQL（読むだけ。データは変えない）。
--
-- マイグレーション 20261024100000_link_orders_to_intakes.sql を実行した後と、受注登録の画面で登録した後に、
-- SQL Editor で確かめるために使う。'26-0001' の部分（2 か所）を確かめたい受付No. に書き換えて実行する。


-- ============================================================
-- 1. 今の採番（2600001 の形）の関数とカウンターが消えていること（どちらも 0 件なら消えている）
-- ============================================================
select 'private.next_order_no' as name, count(*) as remaining
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private' and p.proname = 'next_order_no'
union all
select 'private.order_no_counters', count(*)
from pg_tables where schemaname = 'private' and tablename = 'order_no_counters'
union all
select 'public.attachments', count(*)
from pg_tables where schemaname = 'public' and tablename = 'attachments';


-- ============================================================
-- 2. 受注が受付・加工区分につながっていること（受付のない受注は 0 件）
-- ============================================================
select count(*) as orders_total,
       count(*) filter (where intake_id is null or work_unit_id is null) as orders_without_intake
from public.orders;


-- ============================================================
-- 3. 受付の受注（受注No. が {受付No.}-{枝番}、枝番が 1 から順に振られていること）
-- ============================================================
-- last_branch は受付の枝番のカウンター（最後に振った枝番）
select i.intake_no, i.last_branch, i.status as intake_status, s.name as intake_site,
       o.order_no, o.branch_no, o.member_class, o.is_urgent, u.name as staff, wu.kind, wu.status as unit_status
from public.intakes i
left join public.sites s on s.id = i.site_id
left join public.orders o on o.intake_id = i.id and o.deleted_at is null
left join public.users u on u.id = o.staff_id
left join public.work_units wu on wu.id = o.work_unit_id
where i.intake_no = '26-0001'  -- ← 確かめたい受付No.
order by o.branch_no;


-- ============================================================
-- 4. 加工場所の変更の履歴（受注情報で加工場所を変えて登録したとき）
-- ============================================================
select c.changed_at, f.name as from_site, t.name as to_site
from public.intake_site_changes c
join public.intakes i on i.id = c.intake_id
left join public.sites f on f.id = c.from_site_id
left join public.sites t on t.id = c.to_site_id
where i.intake_no = '26-0001'  -- ← 確かめたい受付No.
order by c.changed_at;
