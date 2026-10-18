-- 受付のファイルを置く Storage のバケット（docs/intake/table-design.md「ファイルの保存」）。
--
--   ・バケット intake-files: 非公開（URL を知っていてもログインしないと読めない）。1 ファイル 50MB まで（未決 Q-4 の初期値）
--   ・パス: {intake_id}/{file_id}.{拡張子}（日本語のファイル名はパスに使わず、intake_files.original_name に残す）
--   ・事務・管理者は参照・追加・更新・削除ができる（元データの削除と、振り分けの枠の差し替えのため）。現場は使えない
--
-- このファイルだけ分けているのは、SQL Editor で storage のテーブルを操作して権限のエラーになったときに、
-- 管理画面（Storage）で同じ設定を作れるようにするため。その場合の手順:
--   1. Storage → New bucket で、名前 intake-files、Public bucket をオフ、ファイルの上限 50MB で作る
--   2. Storage → Policies の intake-files に、下の 4 つのポリシーと同じ条件（対象のロールは authenticated）を作る


-- ============================================================
-- 1. バケット
-- ============================================================
-- storage.buckets はバケットの一覧のテーブル。52428800 バイト = 50MB。
-- すでに同じ名前のバケットがあれば何もしない（2 回実行してもエラーにしない）
insert into storage.buckets (id, name, public, file_size_limit)
values ('intake-files', 'intake-files', false, 52428800)
on conflict (id) do nothing;


-- ============================================================
-- 2. ファイルの操作のポリシー
-- ============================================================
-- storage.objects はファイル 1 つが 1 行のテーブル。すべてのバケットのファイルが入っているため、
-- bucket_id で intake-files のファイルだけに絞ってから、ロールを確かめる
create policy intake_files_objects_select
  on storage.objects for select
  to authenticated
  using (bucket_id = 'intake-files' and public.current_user_role() in ('office', 'admin'));

create policy intake_files_objects_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'intake-files' and public.current_user_role() in ('office', 'admin'));

-- 差し替え（同じパスへの上書き）は update になる
create policy intake_files_objects_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'intake-files' and public.current_user_role() in ('office', 'admin'))
  with check (bucket_id = 'intake-files' and public.current_user_role() in ('office', 'admin'));

create policy intake_files_objects_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'intake-files' and public.current_user_role() in ('office', 'admin'));
