-- 価格体系の再設計。
--
-- 単一の prices テーブル（材質×板厚×形状×切断方法×重量区分の5条件で単価を持つ）から、
-- 「種類（plate_types）」を軸に、切断単価・各種エキストラ加算・定尺単価・特殊製品単価・
-- 単位質量を別テーブルに分けた構成に置き換える。詳細な考え方は docs/table-design.md
-- 「マスタテーブル定義」の各テーブルの説明を参照。
--
-- このマイグレーションは prices テーブルを削除するため、prices を参照している
-- 既存の画面（/masters/prices 配下）はこのマイグレーション適用後、
-- 別タスクで作り直すまで動作しなくなる（想定内）。
--
-- 注意: products に plate_type_id を not null で追加するため、
-- 既に products にテスト行が入っている場合はこのマイグレーションが失敗する。
-- その場合は先に products の行を削除してから実行すること。

drop table public.prices;


-- ============================================================
-- plate_types（種類：普通板・縞板・ボンデ・ミガキ）
-- ============================================================
-- name は customers/materials と同様の自由入力マスタとする
-- （CHECK制約で値を固定せず、マスタ画面から新しい種類を追加できるようにする）。
create table public.plate_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- 材質エキストラ（material_extras）を適用する種類かどうか。普通板のみ true になる想定
  applies_material_extra boolean not null default false,
  is_active boolean not null default true
);


-- ============================================================
-- special_product_types（特殊製品種別：スプライス・ササラ・ベタ丸・ドーナツ）
-- ============================================================
-- name は plate_types と同じ理由で自由入力とする。
create table public.special_product_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weight_basis text not null check (
    weight_basis in ('実重量', '角重量', '使用材重量')
  ),
  -- 最低保証重量。スプライスは 3、それ以外は NULL（保証なし）
  min_weight numeric,
  applies_thickness_extra boolean not null default false,
  applies_large_plate_extra boolean not null default false,
  -- ベタ丸・ドーナツのように常に1枚単価で表示するかどうか
  always_piece_price boolean not null default false,
  is_active boolean not null default true
);


-- ============================================================
-- cutting_prices（切断単価）
-- ============================================================
create table public.cutting_prices (
  id uuid primary key default gen_random_uuid(),
  plate_type_id uuid not null references public.plate_types (id),
  -- NULL は SS400 ベースの共通単価（材質エキストラを加算して使う）。
  -- 値が入っている行は SN400C・SM400A など専用単価を持つ材質専用で、材質エキストラは加算しない
  material_id uuid references public.materials (id),
  thickness_min numeric not null,
  thickness_max numeric not null,
  cutting_method text not null check (
    cutting_method in ('シャーリング', 'ガス', 'レーザー', 'プラズマ')
  ),
  cutting_type text not null check (cutting_type in ('寸法切', 'アイトレ')),
  -- NULL は都度見積もり（マスタに単価を持たない）
  unit_price numeric,
  valid_from date not null,
  constraint cutting_prices_thickness_range_check check (
    thickness_min <= thickness_max
  ),
  constraint cutting_prices_condition_key unique (
    plate_type_id, material_id, thickness_min, thickness_max,
    cutting_method, cutting_type, valid_from
  )
);


-- ============================================================
-- material_extras（材質エキストラ：材質 × 製鋼法）
-- ============================================================
create table public.material_extras (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id),
  steel_making text not null check (steel_making in ('電炉材', '高炉材')),
  extra_price numeric not null,
  constraint material_extras_material_steel_making_key unique (
    material_id, steel_making
  )
);


-- ============================================================
-- thickness_extras（板厚エキストラ）
-- ============================================================
create table public.thickness_extras (
  id uuid primary key default gen_random_uuid(),
  thickness numeric not null,
  extra_price numeric not null,
  constraint thickness_extras_thickness_key unique (thickness)
);


-- ============================================================
-- large_plate_extras（大板加算）
-- ============================================================
create table public.large_plate_extras (
  id uuid primary key default gen_random_uuid(),
  thickness numeric not null,
  extra_price numeric not null,
  constraint large_plate_extras_thickness_key unique (thickness)
);


-- ============================================================
-- standard_plate_prices（定尺単価）
-- ============================================================
create table public.standard_plate_prices (
  id uuid primary key default gen_random_uuid(),
  plate_type_id uuid not null references public.plate_types (id),
  -- 無規格（ボンデ・ミガキ）は NULL
  material_id uuid references public.materials (id),
  thickness numeric not null,
  plate_size text not null check (plate_size in ('3x6', '4x8', '5x10')),
  unit_price numeric not null,
  valid_from date not null,
  constraint standard_plate_prices_condition_key unique (
    plate_type_id, material_id, thickness, plate_size, valid_from
  )
);


-- ============================================================
-- special_product_prices（特殊製品単価）
-- ============================================================
create table public.special_product_prices (
  id uuid primary key default gen_random_uuid(),
  special_product_type_id uuid not null references public.special_product_types (id),
  plate_type_id uuid not null references public.plate_types (id),
  -- ショット加工の有無（スプライスのみ使用。他の特殊製品では常に false）
  has_shot boolean not null default false,
  thickness_min numeric not null,
  thickness_max numeric not null,
  unit_price numeric not null,
  valid_from date not null,
  constraint special_product_prices_thickness_range_check check (
    thickness_min <= thickness_max
  ),
  constraint special_product_prices_condition_key unique (
    special_product_type_id, plate_type_id, has_shot,
    thickness_min, thickness_max, valid_from
  )
);


-- ============================================================
-- unit_weights（単位質量：縞板の重量計算用。種類 × メーカー × 板厚）
-- ============================================================
create table public.unit_weights (
  id uuid primary key default gen_random_uuid(),
  plate_type_id uuid not null references public.plate_types (id),
  manufacturer_id uuid not null references public.manufacturers (id),
  thickness numeric not null,
  unit_weight numeric not null,
  is_active boolean not null default true,
  constraint unit_weights_condition_key unique (
    plate_type_id, manufacturer_id, thickness
  )
);


-- ============================================================
-- products の変更
-- ============================================================
-- 種類（plate_type_id）を追加し、材質は無規格（ボンデ・ミガキ）で NULL を許す。
-- 一意制約も種類を含めた組み合わせに張り直す。
alter table public.products
  add column plate_type_id uuid not null references public.plate_types (id);

alter table public.products
  alter column material_id drop not null;

alter table public.products
  drop constraint products_material_thickness_shape_key;

alter table public.products
  add constraint products_plate_type_material_thickness_shape_key
  unique (plate_type_id, material_id, thickness, shape);


-- ============================================================
-- order_items の変更
-- ============================================================
-- 列名を実態に合わせてリネームする。
--   unit_weight        → square_weight（角重量。実重量と区別するため）
--   material_unit_price → cutting_unit_price（切断単価。各エキストラ加算後の値）
alter table public.order_items
  rename column unit_weight to square_weight;

alter table public.order_items
  rename column material_unit_price to cutting_unit_price;

-- 特殊製品（スプライス・ササラ・ベタ丸・ドーナツ）や定尺売りを表現するための列を追加
alter table public.order_items
  add column cutting_type text check (cutting_type in ('寸法切', 'アイトレ')),
  add column special_product_type_id uuid references public.special_product_types (id),
  add column steel_making text check (steel_making in ('電炉材', '高炉材')),
  add column outer_diameter numeric,
  add column inner_diameter numeric,
  add column actual_weight numeric,
  add column material_weight numeric,
  add column price_unit text check (price_unit in ('kg', '枚'));

-- 定尺売り（切断を伴わない）の場合は cutting_method が NULL になるよう、
-- NOT NULL を外し、値の候補から「定尺売り」を除く
-- （定尺売りは standard_plate_prices 側で表現するようになったため）。
alter table public.order_items
  alter column cutting_method drop not null;

alter table public.order_items
  drop constraint order_items_cutting_method_check;

alter table public.order_items
  add constraint order_items_cutting_method_check check (
    cutting_method is null
    or cutting_method in ('シャーリング', 'ガス', 'レーザー', 'プラズマ')
  );
