-- 加工種別マスタ（process_types）の番号と初期データ。
--
-- 前提: マイグレーション 20260929100000_add_master_numbers_and_delivery_methods.sql が適用済みであること。
-- number は受注登録画面で加工方法を選ぶ番号（docs/screen-design.md「番号の一覧」）。
-- 番号は加工の順番に合わせる（docs/table-design.md「process_types」）。
--   10 番台: 切断機で行う加工 / 20 番台: 二次加工（工程順。曲げは最後）
-- 当初の番号（11 キリ孔 / 21 レーザー孔 など）から振り直した。すでに当初の番号で投入済みの DB は、
-- このファイルではなく seed 005 で振り直す（このファイルは番号が空の行と、まだない行にしか番号を入れないため、
-- 投入済みの DB で先に実行すると番号が重なってエラーになる）。
--
-- 加工種別はマスタ画面から登録されている可能性があるため、
--   1. 同じ名前の行が既にあれば、その行に番号を付ける
--   2. なければ行を追加する
-- の 2 段階で投入する。何度実行しても結果が変わらないように書いている。
-- 集計用の区分（category）は決まっていないため、追加する行では NULL のままにする。

-- 投入する番号と名前の一覧を一時的な表（with 句）として定義し、以下の 2 つの文で使う
-- （with 句は 1 つの文の中でしか使えないため、それぞれの文に同じ一覧を書いている）

-- 1. 既存の行に番号を付ける
with v(number, name) as (values
  (11, 'レーザー・プラズマ孔'),
  (12, 'ガス孔'),
  (13, '中抜き'),
  (14, '長孔'),
  (15, 'ピアス孔'),
  (16, 'マーキング'),
  (17, '切り込み'),
  (20, 'キリ孔'),
  (21, 'タップ孔'),
  (22, 'ショット'),
  (23, '開先'),
  (24, '曲げ')
)
update public.process_types as t
set number = v.number
from v
where t.name = v.name
  and t.number is null;

-- 2. まだない加工種別を追加する
with v(number, name) as (values
  (11, 'レーザー・プラズマ孔'),
  (12, 'ガス孔'),
  (13, '中抜き'),
  (14, '長孔'),
  (15, 'ピアス孔'),
  (16, 'マーキング'),
  (17, '切り込み'),
  (20, 'キリ孔'),
  (21, 'タップ孔'),
  (22, 'ショット'),
  (23, '開先'),
  (24, '曲げ')
)
insert into public.process_types (number, name)
select v.number, v.name
from v
where not exists (select 1 from public.process_types as t where t.name = v.name);
