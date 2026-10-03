-- 加工の内容を自由な文章ではなく項目で入力するための列を追加し、create_order で項目も登録する。
--
-- 将来の加工の単価の自動計算に備え、加工の内容（伝票の「1S/ 12孔 38φ」のような文）を
-- 単価の決定要素となる項目（穴径・1 枚あたりの孔数・曲げのヶ所数など）で入力する
-- （docs/basic-design.md「加工の入力項目」）。
--
--   process_types.input_shape        : 加工種別ごとの「入力の形」。受注登録画面の入力欄を切り替える
--   order_item_processes.spec_fields : 加工の行の項目（形に応じた項目を JSON オブジェクトにまとめたもの）
--
-- 既存の加工種別の入力の形の設定・番号の振り直し・ガス孔の追加は seed 005 で行う
-- （このマイグレーションを適用した後に実行する）。

-- ------------------------------------------------------------
-- 加工種別の「入力の形」
-- ------------------------------------------------------------
-- 自由入力: これまでどおり加工内容を文字で入力する（形を決めていない加工種別）
-- 穴      : 1 枚あたりの孔数・穴径（レーザー・プラズマ孔・ガス孔・キリ孔）
-- 曲げ    : ヶ所数・曲げ方
-- 形を追加するときは、新しいマイグレーションでこのチェック制約を作り直して値を広げる
-- （制約名を決めておくと、作り直すときに drop constraint で指定できる）。
alter table public.process_types
  add column input_shape text not null default '自由入力';

alter table public.process_types
  add constraint process_types_input_shape_check
    check (input_shape in ('自由入力', '穴', '曲げ'));

comment on column public.process_types.input_shape is
  '入力の形。自由入力 / 穴 / 曲げ。受注登録画面の加工の項目の入力欄と、数量の求め方を決める。';

-- ------------------------------------------------------------
-- 加工の行の項目
-- ------------------------------------------------------------
-- 形ごとに項目が異なり、今後も形を追加していくため、列を増やさず JSON オブジェクトで持つ。
-- 中身の確認は保存する側（Server Action）で行い、DB ではオブジェクトであることだけを確かめる。
-- 自由入力の形の加工は NULL（加工内容は spec 列に文字で持つ）。
alter table public.order_item_processes
  add column spec_fields jsonb;

alter table public.order_item_processes
  add constraint order_item_processes_spec_fields_check
    check (spec_fields is null or jsonb_typeof(spec_fields) = 'object');

comment on column public.order_item_processes.spec_fields is
  '加工の項目（項目で入力する加工のみ）。例: {"shape": "穴", "holes_per_piece": 12, "hole_diameter": 38}。伝票の加工内容はここから組み立てる。';

-- ------------------------------------------------------------
-- create_order を作り直し、加工の行の spec_fields も登録する
-- ------------------------------------------------------------
-- 20261001100000_create_order_with_processes.sql の版との違いは、加工の行の insert に
-- spec_fields を加えたことだけ。引数の型が同じため create or replace で置き換える
-- （実行権限はそのまま引き継がれる）。
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

  return v_order_no;
end;
$$;

comment on function public.create_order(jsonb, jsonb) is
  '受注のヘッダー・材料の行・加工の行（項目を含む）を 1 つの transaction で登録し、受注番号を返す。RLS はそのまま適用される。';
