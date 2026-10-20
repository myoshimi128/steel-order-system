-- 振り分け（S-04d）と CAD（S-05）の結果を確かめる SQL（読むだけ。データは変えない）。
--
-- 振り分け完了で作られた加工区分と元データの削除（PR 6）、CAD の作業開始・CSV の登録（PR 7）を
-- SQL Editor で確かめるために使う。'26-0001' の部分（5 か所）を確かめたい受付No. に書き換えて実行する。


-- ============================================================
-- 1. 受付の状態（振り分け完了なら dispatched）
-- ============================================================
select intake_no, status, registered_at
from public.intakes
where intake_no = '26-0001';  -- ← 確かめたい受付No.


-- ============================================================
-- 2. 加工区分（先寸は ready ＝受注登録待ち、アイトレは cad_waiting ＝CAD 作業待ち）
-- ============================================================
-- 受注登録待ち・CAD の一覧のビュー（work_unit_queue_view）に出ているかも、ここで分かる
select v.intake_no, v.kind, v.status, v.origin, v.file_count, v.ready_at
from public.work_unit_queue_view v
where v.intake_no = '26-0001'  -- ← 確かめたい受付No.
order by v.kind;


-- ============================================================
-- 3. ファイル（元データは deleted_at が入り、枠のファイルは加工区分に付いている）
-- ============================================================
select f.kind, f.slot, f.original_name, f.split_done, f.work_unit_id is not null as has_unit, f.deleted_at
from public.intake_files f
join public.intakes i on i.id = f.intake_id
where i.intake_no = '26-0001'  -- ← 確かめたい受付No.
order by f.kind, f.slot, f.original_name;


-- ============================================================
-- 4. Storage の実物（元データの置き場所に実物が残っていないこと）
-- ============================================================
-- storage.objects は Storage のファイルの一覧。論理削除した元データの置き場所が 0 件なら、実物も消えている
select f.original_name, o.name as storage_path
from public.intake_files f
join public.intakes i on i.id = f.intake_id
left join storage.objects o on o.bucket_id = 'intake-files' and o.name = f.storage_path
where i.intake_no = '26-0001'  -- ← 確かめたい受付No.
  and f.kind = 'original'
  and o.name is not null;


-- ============================================================
-- 5. CAD（作業開始で cad_working と担当・開始日時、CSV を入れると ready と ready_at）
-- ============================================================
-- CSV の行（kind = csv）は加工区分に付き、外した CSV は deleted_at が入る
select wu.status, u.name as cad_assignee, wu.cad_started_at, wu.ready_at,
       f.original_name as csv_name, f.deleted_at as csv_deleted_at
from public.work_units wu
join public.intakes i on i.id = wu.intake_id
left join public.users u on u.id = wu.cad_assignee
left join public.intake_files f on f.work_unit_id = wu.id and f.kind = 'csv'
where i.intake_no = '26-0001'  -- ← 確かめたい受付No.
  and wu.kind = 'aitore'
order by f.created_at;
