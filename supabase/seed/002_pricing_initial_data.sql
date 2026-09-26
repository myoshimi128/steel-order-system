-- 価格マスタの初期データ。
--
-- 対象テーブル:
--   cutting_prices / material_extras / thickness_extras / large_plate_extras /
--   standard_plate_prices / special_product_types / special_product_prices / unit_weights
--   （unit_weights が参照するため、manufacturers に仮のメーカー2件も登録する）
--
-- 出典:
--   ・単価表（シャーリング部 単価表 一部修正版、2026年5月21日～適用）
--   ・縞板の単位質量は、鋼材メーカー2社が公開している製品カタログの値
--
-- 前提: 001_products_initial_data.sql で plate_types / materials / products が投入済みであること。
--       マイグレーション 20260926100000_add_price_tier_flags.sql（最低保証重量のフラグ列）と
--       20260926110000_splice_weight_basis_and_irregular_cut_flag.sql（アイトレ別途のフラグ列）が
--       適用済みであること。
-- このスクリプトは空の価格系テーブルに対して一度だけ実行する想定（ON CONFLICT 処理は入れていない）。
--
-- ------------------------------------------------------------
-- 登録の方針（単価表からの読み替え）
-- ------------------------------------------------------------
-- 1. 単価表の「枚/○○」（2k以下・1.5k以下の行）は、kg単価 × 最低保証重量 の計算結果なので登録しない。
--    マスタに持つのは kg単価（2k以上の行の値）のみ。
--
-- 2. 単価表の「別途」は、すべて「2k以下」の行（ガス・プラズマの28mm以上）にだけ現れ、
--    同じ条件の「2k以上」には kg単価がある。cutting_prices には重量区分の列がないため
--    kg単価と NULL を同じキーで両方は登録できない。そのため kg単価を登録したうえで、
--    28mm以上の行に small_piece_quote_required = true（1枚2kg未満は別途見積もり）を立てる。
--    そのために、別途の境目（25mm以下 / 28mm以上）で板厚グループを分けて登録している。
--
-- 3. 単価表では28mm以上の単価が板厚ごとに +1 ずつ上がっている（例: ガス寸法切 175→176→177…）。
--    これは板厚エキストラ（28:+1, 32:+2, 36:+3 …）に分解でき、全ての表で矛盾なく一致する。
--    単価は「切断単価 + 板厚エキストラ + …」の積み上げで求めるため（docs/basic-design.md）、
--    cutting_prices には板厚エキストラを差し引いたグループ単価を登録し、差分は thickness_extras に登録する。
--    （単価表の値をそのまま入れると板厚エキストラが二重に加算されてしまう）
--
-- 4. 専用単価の材質（SN400C・SM400A・TMCP325C・TMCP385C）は、単価表の値が高炉材の価格になっているため、
--    高炉材加算の 10 を引いた電炉材ベースの値で登録する（高炉材加算は material_extras 側で加算される）。
--    SN400C・SM400A は切断方法によらず同一単価のため、各切断方法に同額で登録する。
--
-- ------------------------------------------------------------
-- 最低保証重量に関するフラグ（計算ロジックは lib/pricing を参照）
-- ------------------------------------------------------------
--   ・cutting_prices.has_light_tier（1.5kg の段があるか）:
--     SS400ベースの切断単価行（material_id が NULL の行）のシャーとレーザーのみ true。
--     SS400 だけでなく、SN400B・SM490A・SN490B・SN490C のように材質エキストラで計算する材質にも適用される。
--     専用単価を持つ特殊鋼（SN400C・SM400A・TMCP325C・TMCP385C）の行は false。
--   ・cutting_prices.small_piece_quote_required（1枚2kg未満は別途見積もり）:
--     SS400ベースのガス・プラズマで 28mm 以上の行のみ true（上記2を参照）。
--   ・special_product_types.has_light_tier: ベタ丸・ドーナツのみ true。
--   ・保証重量は、エキストラをすべて加算した後の kg単価に掛ける
--     （材質エキストラ・高炉材加算も 1.5kg 分・2kg 分として掛かる）。
--     1.5kg 保証の枚単価は 5円単位で切り捨てる（例: kg単価 185 → 185 × 1.5 = 277.5 → 275）。


-- ============================================================
-- cutting_prices（切断単価）
-- ============================================================
-- 列の意味: (板厚の下限, 板厚の上限, 切断方法, 切断区分, kg単価)
-- 単価表のシャー（切断）は寸法切のみのため、切断区分は「寸法切」で登録する。

-- --- 普通板・SS400ベース（material_id = NULL） ---
-- 単価表の見出し「SS400（電炉材・ベース単価）規格EX+K/1.3込み」の表。
-- material_id を NULL にした行は全材質で共有し、SS400 以外は材質エキストラを加算して使う。
-- 最低保証重量のフラグは切断方法・板厚から決まるため、values に列を並べず式で求める。
--   has_light_tier             : シャーリング・レーザーの行
--   small_piece_quote_required : ガス・プラズマで 28mm 以上の行
-- （この節以外の cutting_prices の行は、どちらも既定値の false）
insert into public.cutting_prices
  (plate_type_id, material_id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from,
   has_light_tier, small_piece_quote_required)
select
  (select id from public.plate_types where name = '普通板'),
  null,
  thickness_min, thickness_max, cutting_method, cutting_type, unit_price,
  date '2026-05-21',
  cutting_method in ('シャーリング', 'レーザー'),
  cutting_method in ('ガス', 'プラズマ') and thickness_min >= 28
from (values
  -- シャー切断
  (1.6, 1.6, 'シャーリング', '寸法切', 180),
  (2.3, 2.3, 'シャーリング', '寸法切', 175),
  (3.2, 12,  'シャーリング', '寸法切', 160),
  -- ガス寸法切り（単価表の「3.2～12」列は「k/170(t12)」で、12mm のみの単価。3.2～9mm は取り扱いなし。
  -- 28～50 は板厚エキストラを差し引いた値）
  (12,  12,  'ガス', '寸法切', 170),
  (14,  25,  'ガス', '寸法切', 175),
  (28,  50,  'ガス', '寸法切', 175),
  -- ガスアイトレ（3.2～12 は取り扱いなし）
  (14,  25,  'ガス', 'アイトレ', 185),
  (28,  50,  'ガス', 'アイトレ', 185),
  -- プラズマ寸法切り（3.2～12 と 40mm 以上は取り扱いなし）
  (14,  25,  'プラズマ', '寸法切', 185),
  (28,  36,  'プラズマ', '寸法切', 185),
  -- プラズマアイトレ
  (14,  25,  'プラズマ', 'アイトレ', 190),
  (28,  36,  'プラズマ', 'アイトレ', 190),
  -- レーザー寸法切り（28mm 以上は取り扱いなし）
  (1.6, 1.6, 'レーザー', '寸法切', 220),
  (2.3, 2.3, 'レーザー', '寸法切', 200),
  (3.2, 12,  'レーザー', '寸法切', 170),
  (14,  25,  'レーザー', '寸法切', 185),
  -- レーザーアイトレ
  (1.6, 1.6, 'レーザー', 'アイトレ', 240),
  (2.3, 2.3, 'レーザー', 'アイトレ', 220),
  (3.2, 12,  'レーザー', 'アイトレ', 175),
  (14,  25,  'レーザー', 'アイトレ', 190)
) as t(thickness_min, thickness_max, cutting_method, cutting_type, unit_price);

-- --- 普通板・SN400C（専用単価） ---
-- 単価表の値（高炉材）: 寸法切 16～25:245 / 28:246 / 32:247 / 36:248、アイトレ 255～258。
-- 高炉材加算 10 と板厚エキストラを差し引くと、寸法切 235・アイトレ 245 で一定になる。
-- 切断方法によらず同一単価のため、16～36mm で SS400ベースに単価がある各切断方法に同額で登録する
-- （ガス・プラズマは 16～36、レーザーは 25mm まで。シャーは 12mm までのため対象外）。
insert into public.cutting_prices
  (plate_type_id, material_id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from)
select
  (select id from public.plate_types where name = '普通板'),
  (select id from public.materials where name = 'SN400C'),
  thickness_min, thickness_max, cutting_method, cutting_type, unit_price,
  date '2026-05-21'
from (values
  (16, 36, 'ガス',     '寸法切',   235),
  (16, 36, 'ガス',     'アイトレ', 245),
  (16, 36, 'プラズマ', '寸法切',   235),
  (16, 36, 'プラズマ', 'アイトレ', 245),
  (16, 25, 'レーザー', '寸法切',   235),
  (16, 25, 'レーザー', 'アイトレ', 245)
) as t(thickness_min, thickness_max, cutting_method, cutting_type, unit_price);

-- --- 普通板・SM400A（専用単価） ---
-- 単価表の値（高炉材）: 寸法切 9:189.5 / 12～19:188.5、アイトレ 9:199.5 / 12～19:198.5。
-- 高炉材加算 10 を差し引いて登録する（25mm 以下のため板厚エキストラはなし）。
-- 切断方法によらず同一単価のため、各板厚で SS400ベースに単価がある切断方法・区分に同額で登録する。
--   9mm   : シャー寸法切、レーザー寸法切・アイトレ
--   12mm  : シャー寸法切、レーザー寸法切・アイトレ、ガス寸法切（ガスは t12 のみ）
--   16/19 : ガス・プラズマ・レーザーの寸法切・アイトレ
insert into public.cutting_prices
  (plate_type_id, material_id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from)
select
  (select id from public.plate_types where name = '普通板'),
  (select id from public.materials where name = 'SM400A'),
  thickness_min, thickness_max, cutting_method, cutting_type, unit_price,
  date '2026-05-21'
from (values
  (9,  9,  'シャーリング', '寸法切',   179.5),
  (12, 12, 'シャーリング', '寸法切',   178.5),
  (9,  9,  'レーザー',     '寸法切',   179.5),
  (12, 19, 'レーザー',     '寸法切',   178.5),
  (9,  9,  'レーザー',     'アイトレ', 189.5),
  (12, 19, 'レーザー',     'アイトレ', 188.5),
  (12, 19, 'ガス',         '寸法切',   178.5),
  (16, 19, 'ガス',         'アイトレ', 188.5),
  (16, 19, 'プラズマ',     '寸法切',   178.5),
  (16, 19, 'プラズマ',     'アイトレ', 188.5)
) as t(thickness_min, thickness_max, cutting_method, cutting_type, unit_price);

-- --- 普通板・TMCP325C（専用単価。単価表にガスと明記） ---
-- 単価表の値（高炉材）: 寸法切 45:272 / 50:273 / 55:274 / 60:275、アイトレ 282～285。
-- 高炉材加算 10 と板厚エキストラ（45:+5 … 60:+8）を差し引くと、寸法切 257・アイトレ 267 で一定になる。
insert into public.cutting_prices
  (plate_type_id, material_id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from)
select
  (select id from public.plate_types where name = '普通板'),
  (select id from public.materials where name = 'TMCP325C'),
  thickness_min, thickness_max, cutting_method, cutting_type, unit_price,
  date '2026-05-21'
from (values
  (45, 60, 'ガス', '寸法切',   257),
  (45, 60, 'ガス', 'アイトレ', 267)
) as t(thickness_min, thickness_max, cutting_method, cutting_type, unit_price);

-- --- 普通板・TMCP385C（専用単価。単価表にガスと明記） ---
-- 単価表の値（高炉材）: 寸法切 36:293 / 40:294 / 45:295 / 50:296、アイトレ 303～306。
-- 高炉材加算 10 と板厚エキストラ（36:+3 … 50:+6）を差し引くと、寸法切 280・アイトレ 290 で一定になる。
insert into public.cutting_prices
  (plate_type_id, material_id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from)
select
  (select id from public.plate_types where name = '普通板'),
  (select id from public.materials where name = 'TMCP385C'),
  thickness_min, thickness_max, cutting_method, cutting_type, unit_price,
  date '2026-05-21'
from (values
  (36, 50, 'ガス', '寸法切',   280),
  (36, 50, 'ガス', 'アイトレ', 290)
) as t(thickness_min, thickness_max, cutting_method, cutting_type, unit_price);

-- --- 縞板（material_id = NULL。縞板は材質エキストラを適用しない） ---
-- 単価表では特定メーカーの縞目を前提とした表として記載されているが、
-- cutting_prices はメーカーを持たないため縞板共通の単価として登録する。
-- 単価表の列は 2.3 / 3.2～9 / 12。プラズマ・レーザーは 3.2～9 と 12 が同額のため 3.2～12 にまとめた。
-- シャーは 12mm が取り扱いなし。「シャー型切り」はアイトレのことなので、アイトレとして登録する。
insert into public.cutting_prices
  (plate_type_id, material_id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from)
select
  (select id from public.plate_types where name = '縞板'),
  null,
  thickness_min, thickness_max, cutting_method, cutting_type, unit_price,
  date '2026-05-21'
from (values
  (2.3, 2.3, 'シャーリング', '寸法切',   205),
  (3.2, 9,   'シャーリング', '寸法切',   195),
  (2.3, 2.3, 'シャーリング', 'アイトレ', 210),
  (3.2, 9,   'シャーリング', 'アイトレ', 200),
  (2.3, 2.3, 'プラズマ',     '寸法切',   215),
  (3.2, 12,  'プラズマ',     '寸法切',   205),
  (2.3, 2.3, 'プラズマ',     'アイトレ', 220),
  (3.2, 12,  'プラズマ',     'アイトレ', 210),
  (2.3, 2.3, 'レーザー',     '寸法切',   225),
  (3.2, 12,  'レーザー',     '寸法切',   215),
  (2.3, 2.3, 'レーザー',     'アイトレ', 230),
  (3.2, 12,  'レーザー',     'アイトレ', 220)
) as t(thickness_min, thickness_max, cutting_method, cutting_type, unit_price);

-- --- ボンデ（無規格のため material_id = NULL） ---
-- 1.6 と 2.3 が同額のため 1.6～2.3 にまとめた。
insert into public.cutting_prices
  (plate_type_id, material_id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from)
select
  (select id from public.plate_types where name = 'ボンデ'),
  null,
  thickness_min, thickness_max, cutting_method, cutting_type, unit_price,
  date '2026-05-21'
from (values
  (1.6, 2.3, 'シャーリング', '寸法切',   240),
  (1.6, 2.3, 'レーザー',     '寸法切',   270),
  (1.6, 2.3, 'レーザー',     'アイトレ', 280)
) as t(thickness_min, thickness_max, cutting_method, cutting_type, unit_price);

-- --- ミガキ（無規格のため material_id = NULL） ---
insert into public.cutting_prices
  (plate_type_id, material_id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from)
select
  (select id from public.plate_types where name = 'ミガキ'),
  null,
  thickness_min, thickness_max, cutting_method, cutting_type, unit_price,
  date '2026-05-21'
from (values
  (1.2, 1.2, 'シャーリング', '寸法切',   310),
  (1.2, 1.2, 'レーザー',     '寸法切',   350),
  (1.2, 1.2, 'レーザー',     'アイトレ', 360)
) as t(thickness_min, thickness_max, cutting_method, cutting_type, unit_price);


-- ============================================================
-- material_extras（材質エキストラ・高炉材加算。材質ごとに1行）
-- ============================================================
-- extra_price        : SS400ベースの単価にこの材質を使う場合の加算（単価表の「規格EX」）
-- blast_furnace_extra: 受注が高炉材の場合の加算（単価表「高炉材 電炉材ベースに +K/10」）
--
-- ・SS400 は単価表の見出しに「規格EX+K/1.3込み」とあり、ベース単価に既に含まれているため extra_price は 0。
--   高炉材加算は、単価表では一律 +10 と書かれているが、設計書の方針（SS400 には適用しない）に従い 0 とする。
-- ・専用単価の材質は材質差が単価に織り込まれているため extra_price は使われない（0）。高炉材加算は 10。
insert into public.material_extras (material_id, extra_price, blast_furnace_extra)
select
  (select id from public.materials where name = material_name),
  extra_price,
  blast_furnace_extra
from (values
  -- ベース + エキストラの材質
  ('SS400',     0, 0),
  ('SN400B',   10, 10),
  ('SM490A',   12, 10),
  ('SN490B',   18, 10),
  ('SN490C',   23, 10),
  -- 専用単価の材質
  ('SN400C',    0, 10),
  ('SM400A',    0, 10),
  ('TMCP325C',  0, 10),
  ('TMCP385C',  0, 10)
) as t(material_name, extra_price, blast_furnace_extra);


-- ============================================================
-- thickness_extras（板厚エキストラ）
-- ============================================================
-- 単価表に独立した記載はなく、28mm 以上の単価の上がり幅から逆算した値（冒頭の方針3を参照）。
--   28～36: SS400ベース（ガス・プラズマ）と SN400C の表から一致を確認
--   40～50: SS400ベース（ガス）と TMCP385C の表から一致を確認
--   55・60: TMCP325C の表から求めた値（確認済み）
insert into public.thickness_extras (thickness, extra_price) values
  (28, 1),
  (32, 2),
  (36, 3),
  (40, 4),
  (45, 5),
  (50, 6),
  (55, 7),
  (60, 8);


-- ============================================================
-- large_plate_extras（大板加算）
-- ============================================================
-- 単価表「大板：3.2・4.5・6 +k/30　9・12 +k/15」。
insert into public.large_plate_extras (thickness, extra_price) values
  (3.2, 30),
  (4.5, 30),
  (6,   30),
  (9,   15),
  (12,  15);


-- ============================================================
-- standard_plate_prices（定尺単価）
-- ============================================================

-- --- 普通板（SS400） ---
-- 単価表の定尺の表には材質の記載がないため SS400 として登録する。
-- products には SM490A・SN400B・SN490B の定尺もあるが、単価表に記載がないため登録しない。
insert into public.standard_plate_prices
  (plate_type_id, material_id, thickness, plate_size, unit_price, valid_from)
select
  (select id from public.plate_types where name = '普通板'),
  (select id from public.materials where name = 'SS400'),
  thickness, plate_size, unit_price,
  date '2026-05-21'
from (values
  -- 3x6
  (1.6, '3x6', 126), (2.3, '3x6', 122), (3.2, '3x6', 120), (4.5, '3x6', 120), (6, '3x6', 120),
  (9,   '3x6', 122), (12,  '3x6', 122), (16,  '3x6', 140), (19,  '3x6', 140),
  -- 4x8（3x6 と同額）
  (1.6, '4x8', 126), (2.3, '4x8', 122), (3.2, '4x8', 120), (4.5, '4x8', 120), (6, '4x8', 120),
  (9,   '4x8', 122), (12,  '4x8', 122), (16,  '4x8', 140), (19,  '4x8', 140),
  -- 5x10
  (1.6, '5x10', 136), (2.3, '5x10', 126), (3.2, '5x10', 121), (4.5, '5x10', 121), (6, '5x10', 121),
  (9,   '5x10', 123), (12,  '5x10', 123), (16,  '5x10', 140), (19,  '5x10', 140)
) as t(thickness, plate_size, unit_price);

-- --- 縞板（SS400） ---
-- 単価表では板厚・サイズによらず k/155、ただし「CPL2.3は+10」のため 2.3mm のみ 165。
-- 取得側で分岐させないよう、products にある板厚 × 3サイズすべてに登録する。
insert into public.standard_plate_prices
  (plate_type_id, material_id, thickness, plate_size, unit_price, valid_from)
select
  (select id from public.plate_types where name = '縞板'),
  (select id from public.materials where name = 'SS400'),
  t.thickness,
  s.plate_size,
  case when t.thickness = 2.3 then 165 else 155 end,
  date '2026-05-21'
from (values (2.3), (3.2), (4.5), (6), (9), (12)) as t(thickness)
cross join (values ('3x6'), ('4x8'), ('5x10')) as s(plate_size);

-- --- ボンデ（無規格のため material_id = NULL。一律 k/170） ---
insert into public.standard_plate_prices
  (plate_type_id, material_id, thickness, plate_size, unit_price, valid_from)
select
  (select id from public.plate_types where name = 'ボンデ'),
  null,
  t.thickness,
  s.plate_size,
  170,
  date '2026-05-21'
from (values (1.6), (2.3)) as t(thickness)
cross join (values ('3x6'), ('4x8'), ('5x10')) as s(plate_size);

-- --- ミガキ（無規格のため material_id = NULL。一律 k/210） ---
insert into public.standard_plate_prices
  (plate_type_id, material_id, thickness, plate_size, unit_price, valid_from)
select
  (select id from public.plate_types where name = 'ミガキ'),
  null,
  1.2,
  s.plate_size,
  210,
  date '2026-05-21'
from (values ('3x6'), ('4x8'), ('5x10')) as s(plate_size);


-- ============================================================
-- special_product_types（特殊製品種別）
-- ============================================================
-- 各フラグは docs/basic-design.md「特殊製品の単価」の表に従う。
--   スプライス: 角重量・3kg保証。板厚エキストラ・大板加算は適用しない（該当板厚は別途見積もり）。
--               寸法切を前提としたセット価格のため、アイトレは別途見積もり
--               （請求は角重量が基本。寸法切では角重量と実重量は同じ値になる）
--   ササラ    : 使用材の重量（手入力）。板厚エキストラ・大板加算は適用しない
--   ベタ丸    : 角重量。板厚エキストラ・大板加算を適用。常に枚単価で表示。1.5kg の段あり
--   ドーナツ  : ベタ丸と同じ
insert into public.special_product_types
  (name, weight_basis, min_weight, applies_thickness_extra, applies_large_plate_extra, always_piece_price,
   has_light_tier, irregular_cut_quote_required)
values
  ('スプライス', '角重量',     3,    false, false, false, false, true),
  ('ササラ',     '使用材重量', null, false, false, false, false, false),
  ('ベタ丸',     '角重量',     null, true,  true,  true,  true,  false),
  ('ドーナツ',   '角重量',     null, true,  true,  true,  true,  false);


-- ============================================================
-- special_product_prices（特殊製品単価）
-- ============================================================
-- 単価表の特殊製品欄に加え、社内で使っている計算用 Excel の値に基づいて登録する
-- （単価表には板厚区分が「PL-12まで / PL-16から」しか書かれていないため、
-- 薄板・厚板の単価や縞板の単価は計算用 Excel の値を採用した）。
--
-- 登録していない板厚・種類は別途見積もりとする（単価計算ロジックでは該当行なし＝別途として扱う）。
--   ・スプライス・ササラ: 28mm 以上は別途見積もり
--   ・13～15mm は取り扱いがないため空けている
--
-- 【スプライスについて】
-- 単価表は「SS400: 180 / ショットあり 190」「規格材: 190 / ショットあり 200 ＋規格EX」で、
-- 規格材の 190 / 200 は、SS400 の値に高炉材加算（material_extras.blast_furnace_extra = 10）を
-- 加えたもの。そのため SS400 の値のみを登録すれば、既存の計算式
-- （特殊製品単価 + 材質エキストラ + 高炉材加算）で規格材の単価も求まる。
--
-- 【ベタ丸・ドーナツの 28～36mm について】
-- 16～25mm と同じ値（ベタ丸 200 / ドーナツ 220）で登録しているが、ベタ丸・ドーナツは
-- 板厚エキストラを適用する（special_product_types.applies_thickness_extra = true）ため、
-- 実際の単価は 28:+1 / 32:+2 / 36:+3 が加算されて ベタ丸 201～203 / ドーナツ 221～223 になる。
-- （16～25 と 28～36 を1行にまとめないのは、単価表の板厚区分との対応を分かりやすくするため）
insert into public.special_product_prices
  (special_product_type_id, plate_type_id, has_shot, thickness_min, thickness_max, unit_price, valid_from)
select
  (select id from public.special_product_types where name = type_name),
  (select id from public.plate_types where name = plate_type_name),
  has_shot, thickness_min, thickness_max, unit_price,
  date '2026-05-21'
from (values
  -- スプライス（普通板。3kg保証。切断・キリ孔・ショット込みのセット価格）
  ('スプライス', '普通板', false, 1.6, 25, 180),
  ('スプライス', '普通板', true,  1.6, 25, 190),
  -- ササラ（普通板。使用材の重量にて）
  ('ササラ',     '普通板', false, 1.6, 12, 200),
  ('ササラ',     '普通板', false, 16,  25, 220),
  -- ベタ丸（普通板。角重量にて）
  ('ベタ丸',     '普通板', false, 1.6, 1.6, 255),
  ('ベタ丸',     '普通板', false, 2.3, 2.3, 235),
  ('ベタ丸',     '普通板', false, 3.2, 12,  190),
  ('ベタ丸',     '普通板', false, 16,  25,  200),
  ('ベタ丸',     '普通板', false, 28,  36,  200),
  -- ドーナツ（普通板。角重量にて）
  ('ドーナツ',   '普通板', false, 1.6, 1.6, 275),
  ('ドーナツ',   '普通板', false, 2.3, 2.3, 255),
  ('ドーナツ',   '普通板', false, 3.2, 12,  210),
  ('ドーナツ',   '普通板', false, 16,  25,  220),
  ('ドーナツ',   '普通板', false, 28,  36,  220),
  -- ベタ丸（縞板）
  ('ベタ丸',     '縞板',   false, 2.3, 2.3, 245),
  ('ベタ丸',     '縞板',   false, 3.2, 12,  235),
  -- ドーナツ（縞板）
  ('ドーナツ',   '縞板',   false, 2.3, 2.3, 265),
  ('ドーナツ',   '縞板',   false, 3.2, 12,  255)
) as t(type_name, plate_type_name, has_shot, thickness_min, thickness_max, unit_price);


-- ============================================================
-- manufacturers（メーカー）※ unit_weights の参照先として仮登録
-- ============================================================
-- 実在の企業名はリポジトリに含めない方針のため、仮の名称・コードで登録する。
-- 実運用ではマスタ管理画面から実際の名称・コードに更新すること。
insert into public.manufacturers (code, name) values
  ('A', 'メーカーA'),
  ('B', 'メーカーB');


-- ============================================================
-- unit_weights（単位質量：縞板。メーカー × 板厚、kg/m²）
-- ============================================================
-- 各メーカーのカタログに記載されている縞鋼板の単位質量をそのまま登録する。
-- products の縞板（2.3～12mm）以外の板厚も、カタログに記載があるものはすべて登録している。

-- --- メーカーA ---
-- カタログの「縞鋼板」表の単位質量の列。値はおおむね 7.85 × 板厚 + 1.7 に一致する。
insert into public.unit_weights (plate_type_id, manufacturer_id, thickness, unit_weight)
select
  (select id from public.plate_types where name = '縞板'),
  (select id from public.manufacturers where name = 'メーカーA'),
  thickness, unit_weight
from (values
  (2.3, 19.76),
  (3.2, 26.82),
  (4.5, 37.02),
  (5,   40.94),
  (6,   48.80),
  (8,   64.50),
  (9,   72.34),
  (10,  80.20),
  (12,  95.90),
  (16,  127.3),
  (19,  150.9),
  (22,  174.4),
  (25,  197.9)
) as t(thickness, unit_weight);

-- --- メーカーB ---
-- カタログの「製造可能寸法及び質量」表の単位質量（W1）の列。
-- カタログ記載の計算式 W1 = 7.85t + 1.67 とすべて一致することを確認済み。
insert into public.unit_weights (plate_type_id, manufacturer_id, thickness, unit_weight)
select
  (select id from public.plate_types where name = '縞板'),
  (select id from public.manufacturers where name = 'メーカーB'),
  thickness, unit_weight
from (values
  (2.3, 19.73),
  (3.2, 26.79),
  (4.5, 36.99),
  (6,   48.77),
  (8,   64.47),
  (9,   72.32),
  (12,  95.87)
) as t(thickness, unit_weight);
