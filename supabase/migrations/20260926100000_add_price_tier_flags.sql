-- 最低保証重量の段と「小物は別途見積もり」を価格マスタのデータとして持たせる。
--
-- 単価表を整理した結果、最低保証重量の決まり方は単価の行によって異なることが分かった。
--   ・1.5kg の段（1.5kg未満は 1.5kg 分で計算）があるのは、普通板・SS400ベース（材質なし）の
--     シャーリング・レーザーの行と、特殊製品のベタ丸・ドーナツのみ。それ以外は 2kg の段だけ。
--   ・普通板・SS400ベースのガス・プラズマで 28mm 以上の行は、1枚 2kg 未満だと別途見積もりになる。
-- これをコードの条件分岐で書くと「価格ルールはデータとして持つ」方針に反するため、
-- 行ごとのフラグとして持つ（docs/basic-design.md「最低保証重量」を参照）。

-- ============================================================
-- cutting_prices（切断単価）
-- ============================================================
alter table public.cutting_prices
  -- 1.5kg の段があるか。false の行は「2kg未満は 2kg 分」の段のみ
  add column has_light_tier boolean not null default false,
  -- 1枚 2kg 未満の場合に別途見積もりとするか
  add column small_piece_quote_required boolean not null default false;


-- ============================================================
-- special_product_types（特殊製品種別）
-- ============================================================
alter table public.special_product_types
  -- 1.5kg の段があるか（ベタ丸・ドーナツのみ true）
  add column has_light_tier boolean not null default false;


-- ============================================================
-- 既存データの更新
-- ============================================================

-- 普通板・SS400ベース（material_id が NULL）のシャーリング・レーザーは 1.5kg の段あり。
-- SS400ベースの行は SN400B・SM490A・SN490B・SN490C（材質エキストラで計算する材質）も使うため、
-- それらの材質にも 1.5kg の段が適用される。専用単価の行（material_id あり）は対象外。
update public.cutting_prices
set has_light_tier = true
where plate_type_id = (select id from public.plate_types where name = '普通板')
  and material_id is null
  and cutting_method in ('シャーリング', 'レーザー');

-- 普通板・SS400ベースのガス・プラズマで 28mm 以上の行は、1枚 2kg 未満だと別途見積もり。
update public.cutting_prices
set small_piece_quote_required = true
where plate_type_id = (select id from public.plate_types where name = '普通板')
  and material_id is null
  and cutting_method in ('ガス', 'プラズマ')
  and thickness_min >= 28;

-- ベタ丸・ドーナツは 1.5kg の段あり。
update public.special_product_types
set has_light_tier = true
where name in ('ベタ丸', 'ドーナツ');
