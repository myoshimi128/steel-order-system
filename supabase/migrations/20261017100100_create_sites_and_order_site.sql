-- 営業所（sites）と、受注の加工場所（orders.site_id）。
--
-- 受付〜受注登録の設計（docs/intake/table-design.md）では受付のマイグレーションで作る予定だったが、
-- 受注登録の ① 受注情報の画面に加工場所の欄を置くため、部材区分と同じく前倒しして作る。
--   ・sites: 本社 / A営業所 / B営業所。画面の番号（1 / 2 / 3）で選ぶ。表示順も番号で決める
--   ・orders.site_id: 加工場所。出荷待ちを加工場所ごとに分けるのに使う。必須
--   ・create_order: ヘッダーの JSON の site_id を登録する（省略されたら本社）
-- ユーザーの所属する営業所（users.site_id）は、受付のマイグレーションで追加する。
-- それまでは画面の加工場所の初期値を「本社」にする。
--
-- 新しいテーブル sites は、実行後に Supabase の Data API の設定で公開する必要がある。


-- ============================================================
-- 1. 営業所
-- ============================================================
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  -- 画面の番号（1 本社 / 2 A営業所 / 3 B営業所）。並び順にも使う。
  -- 加工場所は必ず初期値が入るため、「いつもの値」の 0 は使わない
  number integer not null unique check (number >= 1),
  -- 画面やプログラムから営業所を指すための短い名前（honsha / a / b）
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sites is
  '営業所（本社 / A営業所 / B営業所）。受注・受付の加工場所と、ユーザーの所属に使う。';

insert into public.sites (number, code, name)
values (1, 'honsha', '本社'), (2, 'a', 'A営業所'), (3, 'b', 'B営業所');

-- RLS: ほかのマスタと同じく、参照は全ロール、登録・更新・削除は admin のみ
alter table public.sites enable row level security;

create policy sites_select_all_roles
  on public.sites for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy sites_admin_all
  on public.sites for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');


-- ============================================================
-- 2. 受注の加工場所
-- ============================================================
alter table public.orders
  add column site_id uuid references public.sites (id);

-- 既存の受注は本社にする（必須にする前に値を入れる）
update public.orders
set site_id = (select id from public.sites where code = 'honsha')
where site_id is null;

alter table public.orders alter column site_id set not null;

comment on column public.orders.site_id is
  '加工場所（営業所）。出荷待ちを加工場所ごとに分けるのに使う。';


-- ============================================================
-- 3. create_order を作り直す（加工場所も登録する）
-- ============================================================
-- 20261017100000_member_class_and_special_price_cutting_method.sql の版との違いは、
-- orders の insert に site_id を加えたことだけ（省略されたら本社）。
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_no text;
  -- 材料の行 1 行分の JSON と、登録した材料の行の id
  v_item jsonb;
  v_item_id uuid;
begin
  -- 明細（材料の行）が 1 行もない受注は登録しない
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '明細を 1 行以上入力してください';
  end if;

  -- ヘッダー。->> は JSON の値を文字列で取り出す演算子（値が null なら SQL の NULL になる）。
  -- 受注番号（order_no）は列の初期値（private.next_order_no()）で採番される
  insert into public.orders (
    order_date, member_class, joint_no, splice_shot,
    customer_id, customer_contact, delivery_destination_id, project_name,
    due_date_type, due_date, delivery_method_id, delivery_method_note,
    site_id, field_note, created_by
  )
  values (
    (p_order ->> 'order_date')::date,
    -- 部材区分。省略されたら無分類
    coalesce(p_order ->> 'member_class', 'NONE'),
    p_order ->> 'joint_no',
    (p_order ->> 'splice_shot')::boolean,
    (p_order ->> 'customer_id')::uuid,
    p_order ->> 'customer_contact',
    (p_order ->> 'delivery_destination_id')::uuid,
    p_order ->> 'project_name',
    p_order ->> 'due_date_type',
    (p_order ->> 'due_date')::date,
    (p_order ->> 'delivery_method_id')::uuid,
    p_order ->> 'delivery_method_note',
    -- 加工場所。省略されたら本社
    coalesce((p_order ->> 'site_id')::uuid, (select id from public.sites where code = 'honsha')),
    -- フリーコメント（現場用伝票に印字する）
    p_order ->> 'field_note',
    auth.uid()
  )
  returning id, order_no into v_order_id, v_order_no;

  -- 材料の行を 1 行ずつ登録する（jsonb_array_elements で配列の要素を 1 つずつ取り出す）
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id, line_no, product_id,
      cutting_method, cutting_type, special_product_type_id, plate_size, steel_making,
      width, length, outer_diameter, inner_diameter, quantity,
      square_weight, actual_weight, material_weight,
      cutting_unit_price, price_unit, manufacturer_specified_id, field_note
    )
    select
      v_order_id, item.line_no, item.product_id,
      item.cutting_method, item.cutting_type, item.special_product_type_id, item.plate_size,
      item.steel_making,
      item.width, item.length, item.outer_diameter, item.inner_diameter, item.quantity,
      item.square_weight, item.actual_weight, item.material_weight,
      item.cutting_unit_price, item.price_unit, item.manufacturer_specified_id, item.field_note
    -- jsonb_to_record で JSON オブジェクトを 1 行に変換する（processes など定義しないキーは無視される）
    from jsonb_to_record(v_item) as item(
      line_no integer,
      product_id uuid,
      cutting_method text,
      cutting_type text,
      special_product_type_id uuid,
      plate_size text,
      steel_making text,
      width numeric,
      length numeric,
      outer_diameter numeric,
      inner_diameter numeric,
      quantity integer,
      square_weight numeric,
      actual_weight numeric,
      material_weight numeric,
      cutting_unit_price numeric,
      price_unit text,
      manufacturer_specified_id uuid,
      field_note text
    )
    returning id into v_item_id;

    -- その材料の行にぶら下がる加工の行。processes がなければ空の配列として扱う。
    -- spec_fields は jsonb として受け取り、JSON のまま保存する
    insert into public.order_item_processes (
      order_item_id, line_no, process_type_id, spec, spec_fields,
      quantity, unit_price, price_unit, remarks
    )
    select
      v_item_id, process.line_no, process.process_type_id, process.spec, process.spec_fields,
      process.quantity, process.unit_price, coalesce(process.price_unit, '個'), process.remarks
    from jsonb_to_recordset(coalesce(v_item -> 'processes', '[]'::jsonb)) as process(
      line_no integer,
      process_type_id uuid,
      spec text,
      spec_fields jsonb,
      quantity integer,
      unit_price numeric,
      price_unit text,
      remarks text
    );
  end loop;

  -- スタンプ。p_order の stamp_ids（スタンプの id の配列）を 1 件ずつ order_stamps に登録する
  insert into public.order_stamps (order_id, stamp_id)
  select v_order_id, stamp_id::uuid
  from jsonb_array_elements_text(coalesce(p_order -> 'stamp_ids', '[]'::jsonb)) as stamp_id;

  return v_order_no;
end;
$$;

comment on function public.create_order(jsonb, jsonb) is
  '受注のヘッダー（部材区分・加工場所・フリーコメントを含む）・材料の行・加工の行（項目を含む）・スタンプを 1 つの transaction で登録し、受注番号を返す。RLS はそのまま適用される。';
