-- 受付のテーブルの RLS・権限と Realtime（docs/intake/table-design.md「RLS・権限・Realtime・Storage」）。
--
-- 本体のロール（current_user_role(): office 事務 / factory 現場 / admin 管理者）で制御する。
--
--   | テーブル                                       | office            | factory   | admin             |
--   | intakes / intake_destinations / work_units /  | 参照・登録・更新  | 参照不可  | 参照・登録・更新  |
--   |   intake_files                                 |                   |           |                   |
--   | intake_site_changes                            | 参照              | 参照不可  | 参照              |
--   | notifications                                  | 自分の部署の行だけ参照（全ロール）            |
--   | notification_reads                             | 自分の行だけ参照・登録（全ロール）            |
--   | lead_time_items / _messages / _history         | 参照・登録・更新  | 参照      | 参照・登録・更新  |
--
--   ・業務データは物理削除しない（論理削除）。intake_destinations だけ、入れ先の入れ直しのため削除を許可する
--   ・intake_site_changes と notifications は、トリガー（security definer）だけが書く
--   ・価格マスタが管理者だけなのは変えない（このマイグレーションでは扱わない）
--
-- 権限（grant）について:
--   Data API の「自動で公開」をオフにしているため、新しいテーブルには権限が付いていない。
--   これまでは Data API の設定画面で公開していたが、画面から公開すると anon（ログインしていない人）にも
--   権限が付くことがあるため、このマイグレーションで authenticated にだけ、必要な操作の分を付ける。
--   念のため、先に anon と authenticated の権限をすべて外してから付け直す。
--   実行後は、Data API の設定画面で公開されているかを確認するだけにする（画面から公開の操作はしない）。


-- ============================================================
-- 1. 受付の業務のテーブル（事務・管理者は参照・登録・更新、現場は参照不可）
-- ============================================================
-- 4 つのテーブルに同じポリシーを作るため、do ブロック（その場で実行する無名の手続き）で繰り返す。
-- format の %I はテーブル名などを識別子として埋め込む（必要なら "" で囲む）。$p$ ... $p$ は文字列の囲み
do $$
declare
  t text;
begin
  foreach t in array array['intakes', 'intake_destinations', 'work_units', 'intake_files']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      $p$create policy %I on public.%I for select to authenticated
         using (public.current_user_role() in ('office', 'admin'))$p$,
      t || '_select_office', t);
    execute format(
      $p$create policy %I on public.%I for insert to authenticated
         with check (public.current_user_role() in ('office', 'admin'))$p$,
      t || '_insert_office', t);
    execute format(
      $p$create policy %I on public.%I for update to authenticated
         using (public.current_user_role() in ('office', 'admin'))
         with check (public.current_user_role() in ('office', 'admin'))$p$,
      t || '_update_office', t);

    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on table public.%I to authenticated', t);
  end loop;
end
$$;

-- 受付の入れ先は、画面で並びを変えたら消して入れ直すため削除を許可する
create policy intake_destinations_delete_office
  on public.intake_destinations for delete
  to authenticated
  using (public.current_user_role() in ('office', 'admin'));
grant delete on table public.intake_destinations to authenticated;


-- ============================================================
-- 2. 加工場所の変更履歴（参照だけ。書くのはトリガー）
-- ============================================================
alter table public.intake_site_changes enable row level security;

create policy intake_site_changes_select_office
  on public.intake_site_changes for select
  to authenticated
  using (public.current_user_role() in ('office', 'admin'));

revoke all on table public.intake_site_changes from anon, authenticated;
grant select on table public.intake_site_changes to authenticated;


-- ============================================================
-- 3. 通知（自分の部署の行だけ参照。書くのはトリガー）
-- ============================================================
alter table public.notifications enable row level security;

-- 部署が未設定（NULL）のユーザーは、= の結果が NULL になるため 1 行も見えない
create policy notifications_select_own_dept
  on public.notifications for select
  to authenticated
  using (dept = public.current_user_department());

revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to authenticated;

-- 既読: 自分の行だけ参照・登録できる。既読を取り消す操作はないため、更新・削除の権限は付けない
alter table public.notification_reads enable row level security;

create policy notification_reads_select_own
  on public.notification_reads for select
  to authenticated
  using (user_id = auth.uid());
create policy notification_reads_insert_own
  on public.notification_reads for insert
  to authenticated
  with check (user_id = auth.uid());

revoke all on table public.notification_reads from anon, authenticated;
grant select, insert on table public.notification_reads to authenticated;


-- ============================================================
-- 4. 目安納期（参照は全ロール、登録・更新は事務・管理者）
-- ============================================================
-- 参照を全ロールにするのは、ホーム（現場も見る）に目安納期を表示するため
do $$
declare
  t text;
begin
  foreach t in array array['lead_time_items', 'lead_time_messages', 'lead_time_history']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      $p$create policy %I on public.%I for select to authenticated
         using (public.current_user_role() in ('office', 'factory', 'admin'))$p$,
      t || '_select_all_roles', t);
    execute format(
      $p$create policy %I on public.%I for insert to authenticated
         with check (public.current_user_role() in ('office', 'admin'))$p$,
      t || '_insert_office', t);
    execute format(
      $p$create policy %I on public.%I for update to authenticated
         using (public.current_user_role() in ('office', 'admin'))
         with check (public.current_user_role() in ('office', 'admin'))$p$,
      t || '_update_office', t);

    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on table public.%I to authenticated', t);
  end loop;
end
$$;


-- ============================================================
-- 5. ビュー
-- ============================================================
-- ビューは security_invoker のため、元のテーブルの RLS と権限がそのまま効く（現場には 0 行になる）
revoke all on table public.work_unit_queue_view from anon, authenticated;
grant select on table public.work_unit_queue_view to authenticated;


-- ============================================================
-- 6. Realtime（通知と一覧の自動更新）
-- ============================================================
-- supabase_realtime は、変更をブラウザへ配信するテーブルの一覧（publication）。
-- 配信も RLS に従うため、見えない行の変更は届かない
alter publication supabase_realtime
  add table public.notifications, public.intakes, public.work_units;
