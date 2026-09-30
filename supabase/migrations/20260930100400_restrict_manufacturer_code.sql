-- メーカーのコード（manufacturers.code）の制約。
--
-- 受注登録画面の明細では、メーカーをコードで選ぶ（テンキーだけで入力する。docs/screen-design.md「入力方式」）。
-- 得意先・納入先のコードと同じ理由で、次の制約を付ける。
--   1. 数字のみ        : テンキーで入力できるようにする
--   2. 「0」は使えない : 受注登録画面の「0 指定なし」（manufacturer_specified_id を NULL にする）と区別するため
--   3. 一意            : コードで 1 つのメーカーを特定するため。同じコードのメーカーが 2 つあると選べない
--
-- 注意: 既存の行に数字以外のコード・「0」・重複したコードがあると、このマイグレーションは失敗する。
-- 事前に確認用の SQL で確認し、マスタ画面でコードを直してから実行すること。

alter table public.manufacturers
  -- ~ は正規表現での一致。^[0-9]+$ は「先頭から末尾まで 1 文字以上の数字だけ」を表す
  add constraint manufacturers_code_digits_check check (code ~ '^[0-9]+$'),
  add constraint manufacturers_code_not_zero_check check (code <> '0'),
  add constraint manufacturers_code_key unique (code);
