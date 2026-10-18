-- 受注登録待ち・CAD の一覧のビュー（docs/intake/table-design.md「ビュー work_unit_queue_view」）。
--
-- 起票完了（done）していない加工区分に、受付の情報（受付No.・売り先・工事名・納期・至急など）を付けて 1 行にする。
--   ・受注登録待ち: status = 'ready'
--   ・CAD         : kind = 'aitore' and status in ('cad_waiting', 'cad_working')
-- 並び順はクエリ側で付ける（is_urgent desc, due_date asc nulls last, registered_at asc）。
--
-- security_invoker = true にして、ビューを読んだユーザーの権限で元のテーブルを読む（RLS がそのまま効く）。
-- 付けないと、ビューの所有者の権限で読まれ、現場（factory）にも受付が見えてしまう。
-- 権限（grant）は 20261018100500_create_intake_rls_and_realtime.sql で付ける。

create view public.work_unit_queue_view
with (security_invoker = true)
as
select
  wu.id as work_unit_id,
  wu.kind,
  wu.origin,
  wu.status,
  wu.cad_assignee,
  wu.cad_started_at,
  wu.ready_at,
  i.id as intake_id,
  i.intake_no,
  i.customer_id,
  c.name as customer_name,
  i.project_name,
  i.due_date_type,
  i.due_date,
  i.is_urgent,
  i.site_id,
  i.staff_id,
  u.name as staff_name,
  i.registered_at,
  -- 加工区分に紐付いたファイルの数（論理削除したものは数えない）
  (
    select count(*)
    from public.intake_files f
    where f.work_unit_id = wu.id and f.deleted_at is null
  ) as file_count
from public.work_units wu
join public.intakes i on i.id = wu.intake_id
left join public.customers c on c.id = i.customer_id
left join public.users u on u.id = i.staff_id
where wu.status <> 'done'
  and i.deleted_at is null;

comment on view public.work_unit_queue_view is
  '受注登録待ち・CAD の一覧。起票完了していない加工区分に受付の情報を付けたもの。security_invoker で RLS が効く。';
