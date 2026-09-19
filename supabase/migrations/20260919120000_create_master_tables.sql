-- マスタ系テーブル作成
-- docs/table-design.md「マスタテーブル定義」に基づく
-- RLS ポリシーは別途作成する（このマイグレーションには含めない）

create extension if not exists "pgcrypto";

-- customers（得意先）
create table customers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  contact_person text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- delivery_destinations（納入先）
create table delivery_destinations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  address text,
  area text,
  is_active boolean not null default true
);

-- materials（材質）
create table materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  line_mark text,
  display_color text,
  is_active boolean not null default true
);

-- products（商品：材質 × 板厚 × 形状）
create table products (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials (id),
  thickness numeric not null,
  shape text not null check (shape in ('定尺', '大板')),
  is_active boolean not null default true,
  constraint products_material_thickness_shape_key unique (material_id, thickness, shape)
);

-- prices（価格：5条件の組み合わせごとの単価）
create table prices (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials (id),
  thickness numeric not null,
  shape text not null check (shape in ('定尺', '大板')),
  cutting_method text not null check (
    cutting_method in ('シャーリング', 'ガス', 'レーザー', 'プラズマ', '定尺売り')
  ),
  weight_class text not null check (weight_class in ('2kg以下', '2kg超')),
  unit_price numeric not null,
  valid_from date not null,
  constraint prices_condition_key unique (
    material_id, thickness, shape, cutting_method, weight_class, valid_from
  )
);

-- process_types（加工種別）
create table process_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  is_active boolean not null default true
);

-- manufacturers（メーカー）
create table manufacturers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  is_active boolean not null default true
);

-- users（ユーザー。id は Supabase Auth の user id）
create table users (
  id uuid primary key references auth.users (id),
  employee_no text,
  name text not null,
  role text not null check (role in ('office', 'factory', 'admin')),
  is_active boolean not null default true
);

-- notices（注意事項：得意先・加工種別・その組み合わせに紐づく）
create table notices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id),
  process_type_id uuid references process_types (id),
  body text not null,
  priority integer not null default 0,
  is_active boolean not null default true,
  constraint notices_target_required_check check (
    customer_id is not null or process_type_id is not null
  )
);

-- stamps（現場用伝票に印字するスタンプ文言）
create table stamps (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  display_order integer not null default 0,
  is_active boolean not null default true
);

-- customer_stamps（得意先ごとに既定でチェックするスタンプ）
create table customer_stamps (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id),
  stamp_id uuid not null references stamps (id),
  constraint customer_stamps_customer_stamp_key unique (customer_id, stamp_id)
);
