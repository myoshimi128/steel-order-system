-- 受注を登録する関数 create_order を作り直し、加工の行（order_item_processes）も一緒に登録する。
--
-- 20260930100300_create_create_order_function.sql で作成した関数は、ヘッダーと材料の行だけを登録していた。
-- 加工の行は材料の行（母材）にぶら下がる子テーブルのため、母材の id が決まってから登録する必要がある。
-- そこで材料の行を 1 行ずつ登録して id を受け取り、その行の processes（加工の行の配列）を続けて登録する。
-- これまでと同じく 1 つの transaction で実行されるため、途中で失敗すると全体が取り消される。
--
-- 引数の形（p_items の各要素）に processes を追加する。それ以外は前の版と同じ:
--   p_order: ヘッダー（orders の列名をキーにした JSON オブジェクト）
--   p_items: 材料の行（order_items の列名をキーにした JSON オブジェクトの配列。1 件以上）。
--            各要素の processes に、加工の行（order_item_processes の列名をキーにした配列）を持つ
-- 返り値: 採番された受注番号
--
-- 引数の型が同じため create or replace で置き換える（実行権限はそのまま引き継がれる）。

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
    order_date, is_splice, joint_no, splice_shot,
    customer_id, customer_contact, delivery_destination_id, project_name,
    due_date_type, due_date, delivery_method_id, delivery_method_note,
    created_by
  )
  values (
    (p_order ->> 'order_date')::date,
    coalesce((p_order ->> 'is_splice')::boolean, false),
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

    -- その材料の行にぶら下がる加工の行。processes がなければ空の配列として扱う
    insert into public.order_item_processes (
      order_item_id, line_no, process_type_id, spec, quantity, unit_price, price_unit, remarks
    )
    select
      v_item_id, process.line_no, process.process_type_id, process.spec,
      process.quantity, process.unit_price, coalesce(process.price_unit, '個'), process.remarks
    from jsonb_to_recordset(coalesce(v_item -> 'processes', '[]'::jsonb)) as process(
      line_no integer,
      process_type_id uuid,
      spec text,
      quantity integer,
      unit_price numeric,
      price_unit text,
      remarks text
    );
  end loop;

  return v_order_no;
end;
$$;

comment on function public.create_order(jsonb, jsonb) is
  '受注のヘッダー・材料の行・加工の行を 1 つの transaction で登録し、受注番号を返す。RLS はそのまま適用される。';
