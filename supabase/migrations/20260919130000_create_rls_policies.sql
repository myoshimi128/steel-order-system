-- RLS（Row Level Security）ポリシー作成
-- docs/basic-design.md「権限設計」、docs/table-design.md「RLS方針」に基づく
--
-- ロールは3種類（public.users.role）
--   office  : 事務。受注登録・編集、送り状発行、帳票印刷、進捗確認
--   factory : 現場。加工指示の閲覧、ステータス更新（加工完了）のみ。MVPでは実運用しないが枠組みとして用意する
--   admin   : 管理者。上記すべて＋マスタ管理＋価格参照
--
-- 権限制御はクライアント側の表示制御だけに頼らず、DB側（RLS）でも強制する。


-- ============================================================
-- ヘルパー関数：ログイン中ユーザーのロールを返す
-- ============================================================
--
-- RLSポリシーの中で「public.users テーブルを直接 select」してロールを調べると、
-- users テーブル自身にも RLS がかかっているため、ポリシー評価がポリシー評価を
-- 呼び出す無限ループ（再帰）を起こしてしまう。
-- これを避けるため、関数を security definer（関数の所有者の権限で実行）にして
-- RLSを経由せずに users テーブルを読めるようにする。
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.users where id = auth.uid();
$$;

comment on function public.current_user_role() is
  'ログイン中ユーザー（auth.uid()）の role（office/factory/admin）を返す。RLSポリシーから利用する。';


-- ============================================================
-- 全テーブルで RLS を有効化
-- ============================================================
-- RLSを有効にしただけではポリシーが1つもない状態＝全ロール全操作が拒否される。
-- この後の CREATE POLICY で許可する操作だけを明示的に開ける。

alter table public.customers enable row level security;
alter table public.delivery_destinations enable row level security;
alter table public.materials enable row level security;
alter table public.products enable row level security;
alter table public.prices enable row level security;
alter table public.process_types enable row level security;
alter table public.manufacturers enable row level security;
alter table public.users enable row level security;
alter table public.notices enable row level security;
alter table public.stamps enable row level security;
alter table public.customer_stamps enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_processes enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;
alter table public.attachments enable row level security;
alter table public.order_stamps enable row level security;


-- ============================================================
-- users（ユーザー）
-- ============================================================
-- 設計書に users 自体のRLS方針の明記はないため、以下は実装上の判断：
--   ・氏名表示（起案者、出荷担当者など）のためどのロールも全件参照できる必要がある → 参照は全ロール許可
--   ・ユーザーの追加・ロール変更は人事的な操作のため管理者のみ許可
create policy users_select_all_roles
  on public.users for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));

create policy users_admin_all
  on public.users for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');


-- ============================================================
-- マスタ各種（table-design.md の RLS方針表「マスタ各種」に該当）
-- customers / delivery_destinations / materials / products /
-- process_types / manufacturers / notices / stamps / customer_stamps
-- ============================================================
-- 方針は共通：office/factory は参照のみ、admin はすべて（登録・更新・削除も含む）。
-- ※ prices（価格）だけは「マスタ各種」ではなく別枠のルール（下記）が定められているため、
--    ここには含めない。

create policy customers_select_all_roles
  on public.customers for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy customers_admin_all
  on public.customers for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy delivery_destinations_select_all_roles
  on public.delivery_destinations for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy delivery_destinations_admin_all
  on public.delivery_destinations for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy materials_select_all_roles
  on public.materials for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy materials_admin_all
  on public.materials for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy products_select_all_roles
  on public.products for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy products_admin_all
  on public.products for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy process_types_select_all_roles
  on public.process_types for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy process_types_admin_all
  on public.process_types for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy manufacturers_select_all_roles
  on public.manufacturers for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy manufacturers_admin_all
  on public.manufacturers for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy notices_select_all_roles
  on public.notices for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy notices_admin_all
  on public.notices for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy stamps_select_all_roles
  on public.stamps for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy stamps_admin_all
  on public.stamps for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy customer_stamps_select_all_roles
  on public.customer_stamps for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy customer_stamps_admin_all
  on public.customer_stamps for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');


-- ============================================================
-- prices（価格）
-- ============================================================
-- table-design.md RLS方針表：office 参照不可 / factory 参照不可 / admin すべて。
-- 仕入単価を含むため、office/factory 向けのポリシーは一切作らない
-- （ポリシーが無い＝全操作拒否がRLSのデフォルト挙動）。
create policy prices_admin_all
  on public.prices for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');


-- ============================================================
-- orders（受注ヘッダー）
-- ============================================================
-- table-design.md RLS方針表：
--   office  参照・登録・更新
--   factory 参照・ステータス更新のみ
--   admin   すべて

create policy orders_select_all_roles
  on public.orders for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));

-- 登録は事務・管理者のみ（現場は受注を起票しない）
create policy orders_insert_office_admin
  on public.orders for insert
  to authenticated
  with check (public.current_user_role() in ('office', 'admin'));

-- 更新は事務・現場・管理者に許可した上で、
-- 「現場は status 列しか変更できない」という列単位の制限は
-- RLS（行単位の制御）では表現できないため、下の trigger で別途強制する。
create policy orders_update_office_factory_admin
  on public.orders for update
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'))
  with check (public.current_user_role() in ('office', 'factory', 'admin'));

-- 削除は管理者のみ（office/factoryどちらの行にも「削除」の記載がないため）
create policy orders_delete_admin
  on public.orders for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- 現場ロールによる更新を status 列（と updated_at）のみに制限するトリガー。
-- RLSのUPDATEポリシーは「更新前の行」「更新後の行」をそれぞれ独立にしか
-- 検証できず、列同士を比較できないため、この制限はトリガーでのみ実現できる。
create or replace function public.restrict_orders_update_for_factory()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.current_user_role() = 'factory' then
    if new.order_no is distinct from old.order_no
      or new.order_date is distinct from old.order_date
      or new.customer_id is distinct from old.customer_id
      or new.delivery_destination_id is distinct from old.delivery_destination_id
      or new.project_name is distinct from old.project_name
      or new.due_date_type is distinct from old.due_date_type
      or new.due_date is distinct from old.due_date
      or new.created_by is distinct from old.created_by
      or new.remarks is distinct from old.remarks
      or new.field_note is distinct from old.field_note
    then
      raise exception '現場ロールは orders の status 列以外を更新できません';
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_restrict_factory_update
  before update on public.orders
  for each row
  execute function public.restrict_orders_update_for_factory();


-- ============================================================
-- order_items（受注明細）
-- ============================================================
-- table-design.md RLS方針表：
--   office  参照・登録・更新
--   factory 参照（単価列を除く）
--   admin   すべて
--
-- 「単価列を除く参照」は列単位の制御であり、RLSの USING 句（行単位）では
-- 表現できない。table-design.md 自身も「ビューを分けるか列レベルの制御を
-- 用いるかは実装時に検討する」としているため、ここではビュー方式を採用する。
--
-- 方式：
--   1. 実テーブル order_items への直接アクセスは office/admin のみ許可する
--      （factory 向けのポリシーは作らない＝直接アクセスは拒否）。
--   2. 単価列（material_unit_price, sales_unit_price）を除いたビューを作成し、
--      view を security_invoker = false（ビュー所有者の権限で実行）にすることで、
--      実テーブルのRLS（factory拒否）を越えて中身を読み、単価列だけを隠して返す。
--   3. factory を含む authenticated ロールにビューへの select 権限を付与する。

create policy order_items_select_office_admin
  on public.order_items for select
  to authenticated
  using (public.current_user_role() in ('office', 'admin'));

create policy order_items_insert_office_admin
  on public.order_items for insert
  to authenticated
  with check (public.current_user_role() in ('office', 'admin'));

create policy order_items_update_office_admin
  on public.order_items for update
  to authenticated
  using (public.current_user_role() in ('office', 'admin'))
  with check (public.current_user_role() in ('office', 'admin'));

create policy order_items_delete_admin
  on public.order_items for delete
  to authenticated
  using (public.current_user_role() = 'admin');

create view public.order_items_factory_view
  with (security_invoker = false)
  as
  select
    id,
    order_id,
    line_no,
    product_id,
    cutting_method,
    width,
    length,
    quantity,
    unit_weight,
    -- material_unit_price, sales_unit_price は現場ロールに非公開のため意図的に除外
    manufacturer_specified_id,
    manufacturer_used_id,
    mill_sheet_no,
    package_count,
    remarks,
    field_note
  from public.order_items;

comment on view public.order_items_factory_view is
  '現場ロール向けの order_items 参照用ビュー。単価列（material_unit_price, sales_unit_price）を含まない。';

grant select on public.order_items_factory_view to authenticated;


-- ============================================================
-- order_item_processes（加工明細）
-- ============================================================
-- table-design.md の RLS方針表に order_item_processes 単独の行はないが、
-- unit_price（加工単価）は order_items と同じ意味での「単価情報」にあたるため、
-- 「単価情報は現場ロールが参照できないことをDBレベルで保証する」という
-- 基本設計書の方針を踏襲し、order_items と同じ考え方（実テーブルは office/admin、
-- 現場は単価列を除いたビュー経由）を適用する。
-- ※ この部分は設計書に直接の記載がない拡張のため、方針が異なる場合は要調整。

create policy order_item_processes_select_office_admin
  on public.order_item_processes for select
  to authenticated
  using (public.current_user_role() in ('office', 'admin'));

create policy order_item_processes_insert_office_admin
  on public.order_item_processes for insert
  to authenticated
  with check (public.current_user_role() in ('office', 'admin'));

create policy order_item_processes_update_office_admin
  on public.order_item_processes for update
  to authenticated
  using (public.current_user_role() in ('office', 'admin'))
  with check (public.current_user_role() in ('office', 'admin'));

create policy order_item_processes_delete_admin
  on public.order_item_processes for delete
  to authenticated
  using (public.current_user_role() = 'admin');

create view public.order_item_processes_factory_view
  with (security_invoker = false)
  as
  select
    id,
    order_item_id,
    line_no,
    process_type_id,
    spec,
    quantity,
    -- unit_price（加工単価）は現場ロールに非公開のため意図的に除外
    remarks
  from public.order_item_processes;

comment on view public.order_item_processes_factory_view is
  '現場ロール向けの order_item_processes 参照用ビュー。単価列（unit_price）を含まない。';

grant select on public.order_item_processes_factory_view to authenticated;


-- ============================================================
-- shipments / shipment_items（送り状）
-- ============================================================
-- table-design.md の RLS方針表に明記はないが、基本設計書の権限設計で
-- 「送り状発行」は事務の業務として説明されており、現場の業務
-- （加工指示の閲覧・ステータス更新）には含まれていないため、
-- office/admin のみアクセス可、factory はアクセス不可とする。
-- ※ この部分も設計書に直接の記載がない拡張のため、方針が異なる場合は要調整。

create policy shipments_select_office_admin
  on public.shipments for select
  to authenticated
  using (public.current_user_role() in ('office', 'admin'));
create policy shipments_insert_office_admin
  on public.shipments for insert
  to authenticated
  with check (public.current_user_role() in ('office', 'admin'));
create policy shipments_update_office_admin
  on public.shipments for update
  to authenticated
  using (public.current_user_role() in ('office', 'admin'))
  with check (public.current_user_role() in ('office', 'admin'));
create policy shipments_delete_admin
  on public.shipments for delete
  to authenticated
  using (public.current_user_role() = 'admin');

create policy shipment_items_select_office_admin
  on public.shipment_items for select
  to authenticated
  using (public.current_user_role() in ('office', 'admin'));
create policy shipment_items_insert_office_admin
  on public.shipment_items for insert
  to authenticated
  with check (public.current_user_role() in ('office', 'admin'));
create policy shipment_items_update_office_admin
  on public.shipment_items for update
  to authenticated
  using (public.current_user_role() in ('office', 'admin'))
  with check (public.current_user_role() in ('office', 'admin'));
create policy shipment_items_delete_admin
  on public.shipment_items for delete
  to authenticated
  using (public.current_user_role() = 'admin');


-- ============================================================
-- attachments（添付ファイル）
-- ============================================================
-- table-design.md の RLS方針表に明記はないが、注文書のアップロード・確認は
-- 現場用伝票のチェック工程で事務が行う業務として説明されているため、
-- office/admin のみアクセス可、factory はアクセス不可とする。
-- ※ この部分も設計書に直接の記載がない拡張のため、方針が異なる場合は要調整。

create policy attachments_select_office_admin
  on public.attachments for select
  to authenticated
  using (public.current_user_role() in ('office', 'admin'));
create policy attachments_insert_office_admin
  on public.attachments for insert
  to authenticated
  with check (public.current_user_role() in ('office', 'admin'));
create policy attachments_update_office_admin
  on public.attachments for update
  to authenticated
  using (public.current_user_role() in ('office', 'admin'))
  with check (public.current_user_role() in ('office', 'admin'));
create policy attachments_delete_admin
  on public.attachments for delete
  to authenticated
  using (public.current_user_role() = 'admin');


-- ============================================================
-- order_stamps（受注に付けたスタンプ）
-- ============================================================
-- table-design.md の RLS方針表に明記はないが、印字されるスタンプ文言は
-- 現場用伝票の内容そのもの（＝「加工指示の閲覧」に含まれる情報）であり、
-- かつ単価情報のような機密性もないため、参照は office/factory/admin に許可し、
-- 登録・更新は受注登録を行う office/admin のみに許可する。
-- ※ この部分も設計書に直接の記載がない拡張のため、方針が異なる場合は要調整。

create policy order_stamps_select_all_roles
  on public.order_stamps for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy order_stamps_insert_office_admin
  on public.order_stamps for insert
  to authenticated
  with check (public.current_user_role() in ('office', 'admin'));
create policy order_stamps_update_office_admin
  on public.order_stamps for update
  to authenticated
  using (public.current_user_role() in ('office', 'admin'))
  with check (public.current_user_role() in ('office', 'admin'));
create policy order_stamps_delete_admin
  on public.order_stamps for delete
  to authenticated
  using (public.current_user_role() = 'admin');
