-- スプライスの判定重量の変更と、「アイトレは別途見積もり」フラグの追加。
--
-- 【スプライスの weight_basis を角重量に変更】
-- 請求は角重量が基本のため、スプライスも角重量で単価（3kg保証の判定を含む）を求める。
-- スプライスは寸法切であり、寸法切では角重量と実重量が同じ値になるため、請求額は変わらない。
--
-- 【special_product_types.irregular_cut_quote_required の追加】
-- スプライスは寸法切を前提としたセット価格のため、アイトレ（異形切り）の場合は別途見積もりとする。
-- これを種別名による条件分岐ではなく、特殊製品種別のフラグとして持つ
-- （docs/basic-design.md「特殊製品の単価」を参照）。

alter table public.special_product_types
  -- 切断区分がアイトレの場合に別途見積もりとするか（スプライスのみ true）
  add column irregular_cut_quote_required boolean not null default false;

update public.special_product_types
set weight_basis = '角重量',
    irregular_cut_quote_required = true
where name = 'スプライス';
