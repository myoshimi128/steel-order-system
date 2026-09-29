-- 価格マスタの行を取り出す関数 get_pricing_rows。
--
-- 価格マスタ（切断単価・各エキストラ・定尺単価・特殊製品単価）は admin 以外が参照できない
-- （RLS: *_admin_all のみ）。一方、受注登録では事務（office）が仕入単価を自動計算する必要がある。
-- そこで、明細 1 行分の条件に該当する行だけを返す関数を security definer で用意し、
-- 事務ロールにはこの関数の実行だけを許す。単価の計算そのものは lib/pricing（TypeScript）で行い、
-- SQL には計算ルールを書かない（docs/table-design.md「価格マスタの権限と単価計算」）。
--
-- 返り値は lib/pricing/types.ts の PricingMasters と同じ形の JSON:
--   { cuttingPrices: [...], materialExtras: [...], thicknessExtras: [...],
--     largePlateExtras: [...], specialProductPrices: [...], standardPlatePrices: [...] }
-- 各要素の列名も PricingMasters の各行の型（snake_case）に合わせている。
--
-- 料金改定で同じ条件の行が複数ある場合は、適用開始日が受注日以前の行をすべて返し、
-- その中から最新の行を選ぶのは lib/pricing 側（pickLatestValid）で行う。

create or replace function public.get_pricing_rows(
  -- 種類・板厚・受注日（単価の基準日）は必須
  p_plate_type_id uuid,
  p_thickness numeric,
  p_as_of date,
  -- 以下は明細の区分によって使うものだけ渡す（使わないものは省略 = NULL）
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
  -- 関数の中では RLS を越えて価格マスタを読めるため、呼び出せるロールをここで確認する。
  -- 現場（factory）は単価情報を参照できない方針のため拒否する。
  if public.current_user_role() is null
     or public.current_user_role() not in ('office', 'admin') then
    raise exception '価格マスタの行を取得する権限がありません';
  end if;

  -- jsonb_agg は行がないと NULL を返すため、coalesce で空配列にする
  return jsonb_build_object(
    -- 切断単価: 種類・切断方法・切断区分・板厚が一致する行。
    -- 材質指定（専用単価）の行と SS400 ベース（material_id が NULL）の行の両方を返し、
    -- どちらを使うかは lib/pricing で判断する
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

    -- 材質エキストラ: 指定した材質の行
    'materialExtras', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select material_id, extra_price, blast_furnace_extra
        from public.material_extras
        where material_id = p_material_id
      ) as r
    ), '[]'::jsonb),

    -- 板厚エキストラ: 指定した板厚の行
    'thicknessExtras', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select thickness, extra_price
        from public.thickness_extras
        where thickness = p_thickness
      ) as r
    ), '[]'::jsonb),

    -- 大板加算: 指定した板厚の行（大板かどうかの判断は lib/pricing で行う）
    'largePlateExtras', coalesce((
      select jsonb_agg(to_jsonb(r))
      from (
        select thickness, extra_price
        from public.large_plate_extras
        where thickness = p_thickness
      ) as r
    ), '[]'::jsonb),

    -- 特殊製品単価: 特殊製品種別・種類・ショットの有無・板厚が一致する行
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
          and p_thickness between thickness_min and thickness_max
          and valid_from <= p_as_of
      ) as r
    ), '[]'::jsonb),

    -- 定尺単価: 種類・材質・板厚・定尺サイズが一致する行。
    -- 無規格（ボンデ・ミガキ）は材質が NULL のため、is not distinct from で NULL 同士も一致とみなす
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

comment on function public.get_pricing_rows is
  '明細 1 行分の条件に該当する価格マスタの行だけを返す（計算は lib/pricing で行う）。office/admin のみ実行可。';

-- 実行権限: 関数は作成時に PUBLIC（全ロール）へ実行権限が付くため、いったん外してから
-- ログイン済みユーザー（authenticated）にだけ付与する。ロールの確認は関数の中で行う。
revoke execute on function public.get_pricing_rows(uuid, numeric, date, uuid, text, text, uuid, boolean, text)
  from public, anon;
grant execute on function public.get_pricing_rows(uuid, numeric, date, uuid, text, text, uuid, boolean, text)
  to authenticated;
