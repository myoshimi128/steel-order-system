-- 商品マスタ（plate_types / materials / products）の初期データ。
--
-- 出典: 社内の在庫表をもとに作成（2026年3月時点）。
--
-- 在庫表は拠点別にも集計されているが、products は
-- 「会社として取り扱いがあるか」を表すマスタであり拠点別の在庫数を持たないため、
-- 拠点名を含まない全社共通の集計ページ（3ページ目）を採用した。
-- ○（在庫あり）・△（少量/端材のみ）はどちらも「取り扱いあり」として products に登録し、
-- ×（取り扱いなし）は登録しない。
--
-- 在庫表に登場する材質・板厚は「普通板」と「ボンデ鋼板」「ミガキ鋼板」のみで、
-- 「縞板」のデータは含まれていなかった。縞板（SS400、2.3〜12mm、定尺）は
-- 在庫表とは別に指示された内容をもとに追加している。
--
-- 3'x6'・4'x8'・5'x10' など定尺の具体的なサイズは products では区別しない
-- （products.shape は '定尺' / '大板' の2値のみ。サイズは standard_plate_prices.plate_size 側で扱う）。
--
-- 表のセル読み取りは手作業でのOCR/目視確認によるため、下記1点は読み取りが
-- 曖昧だった。適用前に元の在庫表と突き合わせて確認することを推奨する。
--   ・SN490B の定尺（メーカーA）欄
--
-- 定尺（5'x10'＝1524×3048）を超えるサイズは大板として扱う
-- （docs/table-design.md products の説明を参照）。SM490A の 5'x20'（1524x6096）は
-- この基準により大板・6mm として登録している。
--
-- このスクリプトは空の products/plate_types/materials テーブルに対して
-- 一度だけ実行する想定（ON CONFLICT 処理は入れていない）。


-- ============================================================
-- plate_types（種類）
-- ============================================================
-- 材質エキストラ（material_extras）を適用するのは普通板のみ
-- （docs/table-design.md plate_types の説明を参照）。
insert into public.plate_types (name, applies_material_extra) values
  ('普通板', true),
  ('縞板', false),
  ('ボンデ', false),
  ('ミガキ', false);


-- ============================================================
-- materials（材質）
-- ============================================================
-- 在庫表に登場する9材質。line_mark（材質ラインの指示）・display_color（現場用伝票の
-- 表示色）は在庫表に記載がなく、実際の指示内容が分かっていないため、
-- 基本材質の SS400 と同様にいったん NULL のまま登録する
-- （運用しながらマスタ管理画面で埋めていく想定）。
-- has_dedicated_price（専用単価を持つか）は SN400C・SM400A・TMCP325C・TMCP385C のみ true。
-- それ以外は SS400 ベースの単価に材質エキストラを加算して求める（docs/basic-design.md 参照）。
insert into public.materials (name, has_dedicated_price) values
  ('SS400', false),
  ('SM490A', false),
  ('SM400A', true),
  ('SN400B', false),
  ('SN400C', true),
  ('SN490B', false),
  ('SN490C', false),
  ('TMCP325C', true),
  ('TMCP385C', true);


-- ============================================================
-- products（商品：種類 × 材質 × 板厚 × 形状）
-- ============================================================

-- --- 普通板・大板（2100 x 6096） ---
insert into public.products (plate_type_id, material_id, thickness, shape)
select
  (select id from public.plate_types where name = '普通板'),
  (select id from public.materials where name = material_name),
  thickness,
  '大板'
from (values
  -- SS400: 3.2〜50（55以上は取り扱いなし）
  ('SS400', 3.2), ('SS400', 4.5), ('SS400', 6), ('SS400', 9), ('SS400', 12),
  ('SS400', 16), ('SS400', 19), ('SS400', 22), ('SS400', 25), ('SS400', 28),
  ('SS400', 32), ('SS400', 36), ('SS400', 40), ('SS400', 45), ('SS400', 50),
  -- SM490A: 6〜40（6mmは5'x20'の取り扱いがあるため含める）
  ('SM490A', 6),
  ('SM490A', 9), ('SM490A', 12), ('SM490A', 16), ('SM490A', 19), ('SM490A', 22),
  ('SM490A', 25), ('SM490A', 28), ('SM490A', 32), ('SM490A', 36), ('SM490A', 40),
  -- SM400A: 9〜19（19は△＝少量・端材のみ。22以上は取り扱いなし）
  ('SM400A', 9), ('SM400A', 12), ('SM400A', 16), ('SM400A', 19),
  -- SN400B: 6〜36
  ('SN400B', 6), ('SN400B', 9), ('SN400B', 12), ('SN400B', 16), ('SN400B', 19),
  ('SN400B', 22), ('SN400B', 25), ('SN400B', 28), ('SN400B', 32), ('SN400B', 36),
  -- SN400C: 16〜36（すべて△＝少量・端材のみ）
  ('SN400C', 16), ('SN400C', 19), ('SN400C', 22), ('SN400C', 25),
  ('SN400C', 28), ('SN400C', 32), ('SN400C', 36),
  -- SN490B: 6〜40
  ('SN490B', 6), ('SN490B', 9), ('SN490B', 12), ('SN490B', 16), ('SN490B', 19),
  ('SN490B', 22), ('SN490B', 25), ('SN490B', 28), ('SN490B', 32), ('SN490B', 36),
  ('SN490B', 40),
  -- SN490C: 16〜40
  ('SN490C', 16), ('SN490C', 19), ('SN490C', 22), ('SN490C', 25),
  ('SN490C', 28), ('SN490C', 32), ('SN490C', 36), ('SN490C', 40),
  -- TMCP325C: 45〜60
  ('TMCP325C', 45), ('TMCP325C', 50), ('TMCP325C', 55), ('TMCP325C', 60),
  -- TMCP385C: 36〜50（単価表に記載のある板厚のみを取り扱い品とする）
  ('TMCP385C', 36), ('TMCP385C', 40), ('TMCP385C', 45), ('TMCP385C', 50)
) as t(material_name, thickness);

-- --- 普通板・定尺（メーカーA） ---
insert into public.products (plate_type_id, material_id, thickness, shape)
select
  (select id from public.plate_types where name = '普通板'),
  (select id from public.materials where name = material_name),
  thickness,
  '定尺'
from (values
  -- SS400: 1.6〜19（3'x6'/4'x8'/5'x10' いずれも取り扱いあり）
  ('SS400', 1.6), ('SS400', 2.3), ('SS400', 3.2), ('SS400', 4.5), ('SS400', 6),
  ('SS400', 9), ('SS400', 12), ('SS400', 16), ('SS400', 19),
  -- SM490A: 6, 9, 12（5'x10'）
  ('SM490A', 6), ('SM490A', 9), ('SM490A', 12),
  -- SN400B: 6, 9, 12（5'x10'）
  ('SN400B', 6), ('SN400B', 9), ('SN400B', 12),
  -- SN490B: 6, 9, 12（5'x10'）
  ('SN490B', 6), ('SN490B', 9), ('SN490B', 12)
) as t(material_name, thickness);

-- --- ボンデ鋼板（電気亜鉛メッキ。無規格のため material_id は NULL） ---
insert into public.products (plate_type_id, material_id, thickness, shape)
select
  (select id from public.plate_types where name = 'ボンデ'),
  null,
  thickness,
  '定尺'
from (values (1.6), (2.3)) as t(thickness);

-- --- ミガキ鋼板（無規格のため material_id は NULL） ---
insert into public.products (plate_type_id, material_id, thickness, shape)
select
  (select id from public.plate_types where name = 'ミガキ'),
  null,
  thickness,
  '定尺'
from (values (1.2)) as t(thickness);

-- --- 縞板（SS400、定尺） ---
-- 在庫表には縞板のデータが無かったため、別途指示された内容をもとに登録する。
insert into public.products (plate_type_id, material_id, thickness, shape)
select
  (select id from public.plate_types where name = '縞板'),
  (select id from public.materials where name = 'SS400'),
  thickness,
  '定尺'
from (values (2.3), (3.2), (4.5), (6), (9), (12)) as t(thickness);
