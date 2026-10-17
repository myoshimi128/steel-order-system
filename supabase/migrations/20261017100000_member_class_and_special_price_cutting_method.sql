-- 受注登録画面の作り直し（3 画面・明細は 1 件 1 行）に合わせた変更。
--
-- 【1. 部材区分（orders.member_class）】
--   受注に部材区分（NONE 無分類 / DF / GPL / BH / SPL）を持たせる。SPL がスプライス専用の受注。
--   これまでのスプライスの印（is_splice）は部材区分とは別に持つと食い違うおそれがあるため、
--   部材区分にまとめて is_splice は廃止する（docs/table-design.md「orders」）。
--   既存の受注のうち is_splice が true のものは SPL に、それ以外は NONE にする。
--   create_order も is_splice の代わりに member_class を受け取るよう作り直す。
--
-- 【2. 特殊製品単価の切断方法の条件（special_product_prices.cutting_method）】
--   ベタ丸・ドーナツの単価はレーザーで切る場合のもので、ガス・プラズマで切る場合は別途見積もりとする。
--   種別名で分岐せずに表すため、特殊製品単価に切断方法の条件を持たせる（NULL は切断方法を問わない）。
--   既存のベタ丸・ドーナツの行はレーザーにする。ササラ・スプライスの行は NULL のまま。
--   get_pricing_rows は、明細の切断方法と一致する行と NULL の行だけを返す
--   （docs/basic-design.md「特殊製品の単価」の「切断方法の条件」）。


-- ============================================================
-- 1. 部材区分
-- ============================================================
alter table public.orders
  add column member_class text not null default 'NONE'
    constraint orders_member_class_check check (member_class in ('NONE', 'DF', 'GPL', 'BH', 'SPL'));

comment on column public.orders.member_class is
  '部材区分。NONE（無分類）/ DF / GPL / BH / SPL。SPL がスプライス専用の受注（以前の is_splice の代わり）。';

-- 既存のスプライス専用の受注を SPL にする（制約を作り直す前に値を移す）
update public.orders set member_class = 'SPL' where is_splice;

-- スプライス関連の列の整合性チェックを、is_splice から member_class に置き換える
alter table public.orders drop constraint orders_splice_columns_check;
alter table public.orders drop column is_splice;
alter table public.orders
  add constraint orders_splice_columns_check check (
    (member_class <> 'SPL' and joint_no is null and splice_shot is null)
    or (
      member_class = 'SPL'
      and (joint_no is null or char_length(joint_no) between 1 and 10)
      and splice_shot is not null
    )
  );


-- ============================================================
-- 2. create_order を作り直す（is_splice の代わりに member_class を登録する）
-- ============================================================
-- 20261003100100_add_stamp_numbers_and_save_order_aux.sql の版との違いは、
-- orders の insert の is_splice を member_class に置き換えたことだけ。
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
    order_date, member_class, joint_no, splice_shot,
    customer_id, customer_contact, delivery_destination_id, project_name,
    due_date_type, due_date, delivery_method_id, delivery_method_note,
    field_note, created_by
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
  '受注のヘッダー（部材区分・フリーコメントを含む）・材料の行・加工の行（項目を含む）・スタンプを 1 つの transaction で登録し、受注番号を返す。RLS はそのまま適用される。';


-- ============================================================
-- 3. 特殊製品単価の切断方法の条件
-- ============================================================
alter table public.special_product_prices
  add column cutting_method text
    constraint special_product_prices_cutting_method_check
      check (cutting_method in ('シャーリング', 'ガス', 'プラズマ', 'レーザー'));

comment on column public.special_product_prices.cutting_method is
  '切断方法の条件。NULL は切断方法を問わない。値が入っている行は、その切断方法の明細だけに使う（ベタ丸・ドーナツはレーザー）。';

-- 同じ条件の行を 2 つ登録しないための一意制約に、切断方法を加える。
-- nulls not distinct で、切断方法が NULL の行どうしも同じ条件とみなす
alter table public.special_product_prices drop constraint special_product_prices_condition_key;
alter table public.special_product_prices
  add constraint special_product_prices_condition_key unique nulls not distinct (
    special_product_type_id, plate_type_id, has_shot, cutting_method,
    thickness_min, thickness_max, valid_from
  );

-- 既存のベタ丸・ドーナツの行は、レーザーで切る場合の単価にする（ガス・プラズマは別途見積もりになる）
update public.special_product_prices
set cutting_method = 'レーザー'
where special_product_type_id in (
  select id from public.special_product_types where name in ('ベタ丸', 'ドーナツ')
);


-- ============================================================
-- 4. get_pricing_rows: 特殊製品単価を切断方法で絞り込む
-- ============================================================
-- 20260929100300_create_get_pricing_rows_function.sql の版との違いは、
-- 特殊製品単価の条件に「切断方法が一致する行か、切断方法が NULL の行」を加えたことだけ。
create or replace function public.get_pricing_rows(
  p_plate_type_id uuid,
  p_thickness numeric,
  p_as_of date,
  p_material_id uuid default null,
  p_cutting_method text default null,
  p_cutting_type text default null,
  p_special_product_type_id uuid default null,
  p_has_shot boolean default false,
  p_plate_size text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- 関数の中では RLS を越えて価格マスタを読めるため、呼び出せるロールをここで確認する
  if public.current_user_role() is null
     or public.current_user_role() not in ('office', 'admin') then
    raise exception '価格マスタの行を取得する権限がありません';
  end if;

  return jsonb_build_object(
    'cuttingPrices', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select
          plate_type_id, material_id, thickness_min, thickness_max,
          cutting_method, cutting_type, unit_price, valid_from,
          has_light_tier, small_piece_quote_required
        from public.cutting_prices
        where plate_type_id = p_plate_type_id
          and cutting_method = p_cutting_method
          and cutting_type = p_cutting_type
          and p_thickness between thickness_min and thickness_max
          and valid_from <= p_as_of
          and (material_id is null or material_id = p_material_id)
      ) as r
    ), '[]'::jsonb),

    'materialExtras', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select material_id, extra_price, blast_furnace_extra
        from public.material_extras
        where material_id = p_material_id
      ) as r
    ), '[]'::jsonb),

    'thicknessExtras', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select thickness, extra_price
        from public.thickness_extras
        where thickness = p_thickness
      ) as r
    ), '[]'::jsonb),

    'largePlateExtras', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select thickness, extra_price
        from public.large_plate_extras
        where thickness = p_thickness
      ) as r
    ), '[]'::jsonb),

    -- 特殊製品単価: 特殊製品種別・種類・ショットの有無・板厚が一致し、
    -- 切断方法の条件が明細の切断方法と一致する（または切断方法を問わない NULL の）行。
    -- 当てはまる行がなければ、lib/pricing で別途見積もりになる
    'specialProductPrices', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select
          special_product_type_id, plate_type_id, has_shot,
          thickness_min, thickness_max, unit_price, valid_from
        from public.special_product_prices
        where special_product_type_id = p_special_product_type_id
          and plate_type_id = p_plate_type_id
          and has_shot = p_has_shot
          and (cutting_method is null or cutting_method = p_cutting_method)
          and p_thickness between thickness_min and thickness_max
          and valid_from <= p_as_of
      ) as r
    ), '[]'::jsonb),

    'standardPlatePrices', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select plate_type_id, material_id, thickness, plate_size, unit_price, valid_from
        from public.standard_plate_prices
        where plate_type_id = p_plate_type_id
          and material_id is not distinct from p_material_id
          and thickness = p_thickness
          and plate_size = p_plate_size
          and valid_from <= p_as_of
      ) as r
    ), '[]'::jsonb)
  );
end;
$$;
