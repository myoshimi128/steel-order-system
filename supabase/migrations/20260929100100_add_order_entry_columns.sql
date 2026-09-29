-- 受注登録画面の実装に向けた、受注系テーブルと得意先・納入先の変更。
-- 詳細は docs/table-design.md「受注登録画面のための追加方針」を参照。
--
-- 注意: orders に delivery_method_id を NOT NULL（既定値なし）で追加するため、
-- orders に行が 1 件でもあるとこのマイグレーションは失敗する。
-- 受注登録画面は未実装で orders は空のはずなので、そのまま追加する。
--
-- 注意: customers / delivery_destinations の code に数字以外が含まれる行があると、
-- 「数字のみ」のチェック制約の追加で失敗する。事前に確認用の SQL で確認すること。


-- ============================================================
-- orders（受注ヘッダー）
-- ============================================================
alter table public.orders
  -- スプライス専用の受注か。画面では番号の欄（0 通常 / 1 スプライス）で入力する
  add column is_splice boolean not null default false,
  -- 継手番号（4〜6 文字）。スプライス専用の受注のみ
  add column joint_no text,
  -- ショット加工の有無。スプライス専用の受注のみ。
  -- 明細の仕入単価（special_product_prices.has_shot）の引き当てと、
  -- 現場用伝票の「ショット加工」の印字に使う（order_stamps には保存しない）
  add column splice_shot boolean,
  -- 配達方法
  add column delivery_method_id uuid not null references public.delivery_methods (id),
  -- 配達がフリー（delivery_methods.requires_note が true）のときに入力する文字。
  -- 「フリーのときは必須」は別テーブルの値を見る条件のためチェック制約では書けず、
  -- アプリ側で検証する
  add column delivery_method_note text,
  -- 論理削除した日時。NULL は有効な受注
  add column deleted_at timestamptz;

-- スプライス関連の列の整合性:
--   通常の受注     → joint_no・splice_shot は NULL
--   スプライス受注 → joint_no（4〜6 文字）と splice_shot が必須
alter table public.orders
  add constraint orders_splice_columns_check check (
    (not is_splice and joint_no is null and splice_shot is null)
    or (
      is_splice
      and joint_no is not null
      and char_length(joint_no) between 4 and 6
      and splice_shot is not null
    )
  );


-- ============================================================
-- order_items（受注明細）
-- ============================================================
-- 定尺サイズ。定尺売りの場合のみ指定する（値域は standard_plate_prices.plate_size と同じ）
alter table public.order_items
  add column plate_size text check (plate_size in ('3x6', '4x8', '5x10'));


-- ============================================================
-- order_item_processes（加工明細）
-- ============================================================
-- 加工の仕入単価の単位。
--   個 → 仕入金額 = 仕入単価 × 数量
--   kg → 仕入金額 = 仕入単価 × 母材の合計重量
alter table public.order_item_processes
  add column price_unit text not null default '個' check (price_unit in ('個', 'kg'));


-- ============================================================
-- customers / delivery_destinations のコードを数字のみに制限
-- ============================================================
-- 受注登録画面で売り先・入れ先をテンキーだけで入力できるようにするため。
-- ~ は正規表現での一致。^[0-9]+$ は「先頭から末尾まで 1 文字以上の数字だけ」を表す。
alter table public.customers
  add constraint customers_code_digits_check check (code ~ '^[0-9]+$');

alter table public.delivery_destinations
  add constraint delivery_destinations_code_digits_check check (code ~ '^[0-9]+$');
