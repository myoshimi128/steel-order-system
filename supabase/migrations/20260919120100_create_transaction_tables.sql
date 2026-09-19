-- トランザクション系テーブル作成
-- docs/table-design.md「トランザクションテーブル定義」に基づく
-- マスタ系テーブル作成後に実行すること
-- RLS ポリシーは別途作成する（このマイグレーションには含めない）

-- orders（受注ヘッダー）
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  order_date date not null,
  customer_id uuid not null references customers (id),
  delivery_destination_id uuid not null references delivery_destinations (id),
  project_name text,
  due_date_type text not null check (
    due_date_type in ('確定', '仮納期', '後報', '最短出荷')
  ),
  due_date date,
  status text not null default '加工待ち' check (
    status in ('加工待ち', '出荷待ち', '配送依頼済み', '完了')
  ),
  created_by uuid not null references users (id),
  remarks text,
  field_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_due_date_required_check check (
    due_date_type not in ('確定', '仮納期') or due_date is not null
  )
);

-- order_items（受注明細：材料）
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id),
  line_no integer not null,
  product_id uuid not null references products (id),
  cutting_method text not null check (
    cutting_method in ('シャーリング', 'ガス', 'レーザー', 'プラズマ', '定尺売り')
  ),
  width numeric,
  length numeric,
  quantity integer not null,
  unit_weight numeric,
  material_unit_price numeric,
  sales_unit_price numeric,
  manufacturer_specified_id uuid references manufacturers (id),
  manufacturer_used_id uuid references manufacturers (id),
  mill_sheet_no text,
  package_count integer,
  remarks text,
  field_note text
);

-- order_item_processes（加工明細：材料に紐づく加工）
create table order_item_processes (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items (id),
  line_no integer not null,
  process_type_id uuid not null references process_types (id),
  spec text,
  quantity integer,
  unit_price numeric,
  remarks text
);

-- shipments（出荷実績）
create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id),
  shipment_no text not null,
  shipped_date date not null,
  created_by uuid not null references users (id),
  created_at timestamptz not null default now()
);

-- shipment_items（出荷明細）
create table shipment_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments (id),
  order_item_id uuid not null references order_items (id),
  quantity integer not null check (quantity > 0),
  weight numeric
);

-- attachments（添付ファイル：注文書 PDF・DXF）
create table attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id),
  file_name text not null,
  file_type text not null check (file_type = 'pdf'),
  storage_path text not null,
  uploaded_by uuid not null references users (id),
  created_at timestamptz not null default now()
);

-- order_stamps（受注に付けたスタンプ）
create table order_stamps (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id),
  stamp_id uuid not null references stamps (id),
  constraint order_stamps_order_stamp_key unique (order_id, stamp_id)
);
