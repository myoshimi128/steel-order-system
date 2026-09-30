-- 受注（ヘッダーと明細）をまとめて 1 回で登録する関数 create_order。
--
-- Supabase のクライアント（PostgREST）は、複数の insert を 1 つの transaction にまとめられない。
-- ヘッダーだけ登録されて明細の登録が失敗する、といった中途半端な状態を防ぐため、
-- 登録処理を DB の関数にする。関数の中の処理は 1 つの transaction で実行されるため、
-- 途中でエラーになると、それまでの登録（ヘッダー・明細・受注番号の採番）もすべて取り消される。
--
-- security invoker（呼び出したユーザーの権限で実行）にして、orders・order_items の RLS を
-- そのまま効かせる（登録できるのは事務・管理者のみ）。
-- 起案者（created_by）は引数で受け取らず、ログイン中のユーザー（auth.uid()）を入れる。
--
-- 入力内容の確認と、重量・仕入単価の計算は、呼び出し側の Server Action（app/orders/new/actions.ts）で
-- 済ませてから渡す。ここでは受け取った値をそのまま登録し、最終的な制約は各テーブルの制約で守る。
--
-- 引数:
--   p_order: ヘッダー（orders の列名をキーにした JSON オブジェクト）
--   p_items: 明細（order_items の列名をキーにした JSON オブジェクトの配列。1 件以上）
-- 返り値: 採番された受注番号

create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_no text;
begin
  -- 明細が 1 行もない受注は登録しない
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

  -- 明細。jsonb_to_recordset で JSON の配列を行の集まりに変換してから登録する
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
  from jsonb_to_recordset(p_items) as item(
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
  );

  return v_order_no;
end;
$$;

comment on function public.create_order(jsonb, jsonb) is
  '受注のヘッダーと明細を 1 つの transaction で登録し、受注番号を返す。RLS はそのまま適用される。';

-- 実行権限: 作成時に付く PUBLIC への権限を外し、ログイン済みユーザーにだけ付与する
-- （誰が登録できるかは orders・order_items の RLS で決まる）
revoke execute on function public.create_order(jsonb, jsonb) from public, anon;
grant execute on function public.create_order(jsonb, jsonb) to authenticated;
