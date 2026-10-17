-- マスタのコード・番号の桁数の制約（docs/table-design.md「制約」、docs/screen-design.md「番号の桁数と自動で次へ」）。
--
-- 受注登録画面の番号の欄は、上限の桁まで打つと Enter を押さなくても次の欄へ進む（現行のシステムと同じ）。
-- 画面の上限の桁数（lib/code-lengths.ts）とマスタのコード・番号の桁数をそろえるため、DB でも制限する。
--
--   得意先・納入先のコード : 数字 4 桁（固定）
--   メーカーのコード       : 数字 1 桁（固定。1〜9。0 は「指定なし」に使う）
--   加工種別の番号         : 10〜99（2 桁固定）
--   種類・材質・特殊製品種別・配達方法の番号 : 0〜9（1 桁）
--   スタンプの番号         : 1〜99
--   営業所の番号           : 1〜9
--   商品の板厚             : 数字 2 桁まで（0.1〜9.9 または 1〜99 の整数）
--
-- 注意: 既存の行に形の合わないコード・番号があると、このマイグレーションは失敗する。
-- 先に確認用の SQL（下の「確認用」）で調べ、マスタ管理の画面か SQL Editor でコードを直してから実行すること。
--
-- 確認用（すべて 0 行なら実行できる）:
--   select 'customers' as tbl, code from public.customers where code !~ '^[0-9]{4}$'
--   union all select 'delivery_destinations', code from public.delivery_destinations where code !~ '^[0-9]{4}$'
--   union all select 'manufacturers', code from public.manufacturers where code !~ '^[1-9]$'
--   union all select 'process_types', number::text from public.process_types where number not between 10 and 99
--   union all select 'plate_types', number::text from public.plate_types where number not between 0 and 9
--   union all select 'materials', number::text from public.materials where number not between 0 and 9
--   union all select 'special_product_types', number::text from public.special_product_types where number not between 0 and 9
--   union all select 'delivery_methods', number::text from public.delivery_methods where number not between 0 and 9
--   union all select 'stamps', number::text from public.stamps where number not between 1 and 99
--   union all select 'sites', number::text from public.sites where number not between 1 and 9
--   union all select 'products', thickness::text from public.products
--     where not (thickness > 0 and thickness < 100
--       and (thickness = trunc(thickness) or (thickness < 10 and thickness * 10 = trunc(thickness * 10))));

-- --- 得意先・納入先のコード: 数字 4 桁 ---
-- ~ は正規表現での一致。^[0-9]{4}$ は「先頭から末尾まで、ちょうど 4 文字の数字」を表す。
-- 以前の「数字のみ」の制約（同じ名前）を置き換える
alter table public.customers
  drop constraint customers_code_digits_check,
  add constraint customers_code_digits_check check (code ~ '^[0-9]{4}$');

-- 納入先の「0 は使えない」の制約（delivery_destinations_code_not_zero_check）は、
-- 4 桁にしたことで不要になるが、害はないため残す
alter table public.delivery_destinations
  drop constraint delivery_destinations_code_digits_check,
  add constraint delivery_destinations_code_digits_check check (code ~ '^[0-9]{4}$');

-- --- メーカーのコード: 数字 1 桁（1〜9） ---
-- 「0 は使えない」の制約（manufacturers_code_not_zero_check）と一意制約はそのまま残す
alter table public.manufacturers
  drop constraint manufacturers_code_digits_check,
  add constraint manufacturers_code_digits_check check (code ~ '^[1-9]$');

-- --- マスタの番号（number 列） ---
-- 加工種別は切断・区分の「9」の後に同じ欄で打つ 2 桁の番号。number は NULL 可のまま（NULL は check を通る）
alter table public.process_types
  drop constraint process_types_number_check,
  add constraint process_types_number_check check (number between 10 and 99);

alter table public.plate_types
  drop constraint plate_types_number_check,
  add constraint plate_types_number_check check (number between 0 and 9);

-- 材質は 0〜9 の 10 個。10 種類目が必要になったら、画面の上限と合わせて 2 桁に広げる
alter table public.materials
  drop constraint materials_number_check,
  add constraint materials_number_check check (number between 0 and 9);

-- 特殊製品種別の番号は、切断・区分の 1 の位に使う。区分の定数（1 寸法切 / 2 アイトレ / 3 定尺 / 9 加工）とは重ねない
alter table public.special_product_types
  drop constraint special_product_types_number_check,
  add constraint special_product_types_number_check check (
    number between 0 and 9 and number not in (1, 2, 3, 9)
  );

alter table public.delivery_methods
  drop constraint delivery_methods_number_check,
  add constraint delivery_methods_number_check check (number between 0 and 9);

-- スタンプは 0 を使わず 1 から。番号の欄が 2 桁までのため 99 まで
alter table public.stamps
  drop constraint stamps_number_check,
  add constraint stamps_number_check check (number between 1 and 99);

-- 営業所（作成時の制約は number >= 1。名前は自動で sites_number_check になっている）
alter table public.sites
  drop constraint sites_number_check,
  add constraint sites_number_check check (number between 1 and 9);

-- --- 商品の板厚: 数字 2 桁まで ---
-- 受注登録画面の板厚の欄は、小数点を数えず数字 2 桁で自動で次へ進む（16・1.6 は進む。9 は Enter）。
-- 2 桁に収まる板厚は 1〜99 の整数と、0.1〜9.9（小数第 1 位まで）。trunc は小数点以下の切り捨て
alter table public.products
  add constraint products_thickness_digits_check check (
    thickness > 0
    and thickness < 100
    and (thickness = trunc(thickness) or (thickness < 10 and thickness * 10 = trunc(thickness * 10)))
  );
