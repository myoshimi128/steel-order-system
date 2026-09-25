-- 価格体系再設計（20260924100000）で新設した9テーブルの RLS ポリシー。
-- current_user_role() は supabase/migrations/20260919130000_create_rls_policies.sql で
-- 定義済みのヘルパー関数（public.users.role を security definer で読む）をそのまま使う。
--
-- 方針は docs/table-design.md RLS方針のとおり2グループに分ける。
--   価格系（cutting_prices, material_extras, thickness_extras, large_plate_extras,
--          standard_plate_prices, special_product_prices）
--     → 旧 prices と同じく admin のみ（office/factory は参照不可）
--   その他マスタ（plate_types, special_product_types, unit_weights）
--     → 既存の「マスタ各種」と同じく参照は全ロール、登録・更新・削除は admin のみ


-- ============================================================
-- 全テーブルで RLS を有効化
-- ============================================================

alter table public.plate_types enable row level security;
alter table public.special_product_types enable row level security;
alter table public.cutting_prices enable row level security;
alter table public.material_extras enable row level security;
alter table public.thickness_extras enable row level security;
alter table public.large_plate_extras enable row level security;
alter table public.standard_plate_prices enable row level security;
alter table public.special_product_prices enable row level security;
alter table public.unit_weights enable row level security;


-- ============================================================
-- その他マスタ（マスタ各種と同じパターン）
-- plate_types / special_product_types / unit_weights
-- ============================================================

create policy plate_types_select_all_roles
  on public.plate_types for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy plate_types_admin_all
  on public.plate_types for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy special_product_types_select_all_roles
  on public.special_product_types for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy special_product_types_admin_all
  on public.special_product_types for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy unit_weights_select_all_roles
  on public.unit_weights for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy unit_weights_admin_all
  on public.unit_weights for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');


-- ============================================================
-- 価格系（旧 prices と同じく admin のみ）
-- cutting_prices / material_extras / thickness_extras /
-- large_plate_extras / standard_plate_prices / special_product_prices
-- ============================================================

create policy cutting_prices_admin_all
  on public.cutting_prices for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy material_extras_admin_all
  on public.material_extras for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy thickness_extras_admin_all
  on public.thickness_extras for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy large_plate_extras_admin_all
  on public.large_plate_extras for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy standard_plate_prices_admin_all
  on public.standard_plate_prices for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy special_product_prices_admin_all
  on public.special_product_prices for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
