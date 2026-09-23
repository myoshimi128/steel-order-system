-- 得意先マスタの contact_person を sales_rep（営業担当）にリネームし、
-- orders に customer_contact（客先担当）を追加する設計見直し。
--
-- 経緯: customers.contact_person は当初「客先担当」として設計していたが、
-- 実際に必要なのは自社側の営業担当者名であり、客先側の窓口担当者は
-- 受注ごとに異なるため得意先マスタに固定で持つのは適切ではなかった
-- （docs/screen-design.md の受注登録画面ヘッダーにも「客先担当」が別項目として
-- 明記されている）。そのため、
--   - customers 側の項目は意味に合わせて sales_rep にリネーム
--   - 客先側の窓口担当者は orders.customer_contact として受注ヘッダーに追加
-- という2つの変更をあわせて行う。

alter table public.customers
  rename column contact_person to sales_rep;

comment on column public.customers.sales_rep is
  '自社側の営業担当者名。得意先側の窓口担当者は orders.customer_contact に持つ。';

alter table public.orders
  add column customer_contact text;

comment on column public.orders.customer_contact is
  '客先担当。得意先側の窓口担当者で、受注ごとに異なるため得意先マスタではなく受注側に持つ。';
