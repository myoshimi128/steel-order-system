-- 特殊製品種別に「寸法の形」の列を追加する。
--
-- 受注登録画面の明細では、区分によって寸法の入力欄を切り替える（docs/screen-design.md「切断方法と区分」）。
--   角       → 縦 × 横（スプライス、ササラは使用材の寸法）
--   円       → 直径（ベタ丸）
--   ドーナツ → 外径 × 内径（ドーナツ）
-- 既存の列（weight_basis・always_piece_price など）ではベタ丸とドーナツを区別できないため、
-- 種別名で分岐せずに済むよう、寸法の形をデータとして持つ。

alter table public.special_product_types
  add column dimension_shape text not null default '角'
    check (dimension_shape in ('角', '円', 'ドーナツ'));

comment on column public.special_product_types.dimension_shape is
  '受注明細の寸法の形。角（縦×横）/ 円（直径）/ ドーナツ（外径×内径）。';

-- 既存の行に寸法の形を入れる（スプライス・ササラは既定値の「角」のまま）
update public.special_product_types set dimension_shape = '円' where name = 'ベタ丸';
update public.special_product_types set dimension_shape = 'ドーナツ' where name = 'ドーナツ';
