-- スタンプに番号を付け、create_order でフリーコメントとスタンプも登録する。
--
-- 受注登録画面の補助エリア（docs/screen-design.md「補助エリア」）のため。
--   ・stamps.number: スタンプの番号。受注登録画面で番号を打って付け外しする（テンキーで操作するため）。
--     並び順も番号で決めるため、display_order は削除する（並び順の列が 2 つあると食い違うため）
--   ・create_order: ヘッダーの JSON の field_note（フリーコメント）と stamp_ids（スタンプの id の配列）も登録する

-- ------------------------------------------------------------
-- 1. スタンプの番号
-- ------------------------------------------------------------
alter table public.stamps
  add column number integer;

-- 既存の行には、これまでの並び順（display_order、同じなら文言の順）で 1 から番号を振る。
-- row_number() は並べた順に 1, 2, 3 … を返す関数
update public.stamps as s
set number = ordered.row_number
from (
  select id, row_number() over (order by display_order, body) as row_number
  from public.stamps
) as ordered
where s.id = ordered.id;

-- 全行に番号が入ったので NOT NULL にする。0 は「いつもの値」に取っておく考え方のため 1 以上とする
alter table public.stamps
  alter column number set not null;

alter table public.stamps
  add constraint stamps_number_key unique (number);

alter table public.stamps
  add constraint stamps_number_check check (number >= 1);

alter table public.stamps
  drop column display_order;

comment on column public.stamps.number is
  'スタンプの番号（一意）。受注登録画面で番号を打って付け外しする。並び順にも使う。';

-- ------------------------------------------------------------
-- 2. create_order を作り直し、フリーコメントとスタンプも登録する
-- ------------------------------------------------------------
-- 20261002100000_add_process_input_shapes.sql の版との違い:
--   ・orders の insert に field_note（フリーコメント）を加えた
--   ・材料の行・加工の行の後に、p_order の stamp_ids（スタンプの id の配列）を order_stamps に登録する
-- 引数の型が同じため create or replace で置き換える（実行権限はそのまま引き継がれる）。
-- スプライス専用の受注の「ショット加工」はスタンプとしては保存しない（orders.splice_shot から印字する）。
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
    field_note, created_by
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

  -- スタンプ。p_order の stamp_ids（スタンプの id の配列）を 1 件ずつ order_stamps に登録する。
  -- jsonb_array_elements_text で配列の要素を文字列として取り出し、uuid に変換する。
  -- stamp_ids がなければ空の配列として扱う
  insert into public.order_stamps (order_id, stamp_id)
  select v_order_id, stamp_id::uuid
  from jsonb_array_elements_text(coalesce(p_order -> 'stamp_ids', '[]'::jsonb)) as stamp_id;

  return v_order_no;
end;
$$;

comment on function public.create_order(jsonb, jsonb) is
  '受注のヘッダー（フリーコメントを含む）・材料の行・加工の行（項目を含む）・スタンプを 1 つの transaction で登録し、受注番号を返す。RLS はそのまま適用される。';
