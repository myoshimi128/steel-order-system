-- 得意先・納入先にふりがなの列を追加する。
--
-- 受注登録画面の売り先・入れ先は件数が多く、番号を覚えていないことがあるため、
-- 番号の欄で「/」を押すと検索の欄が付いた一覧を開き、ふりがな・名前で絞り込めるようにする
-- （docs/screen-design.md「入力方式」）。漢字の名前は読み方で探したいことが多いため、ふりがなを持つ。
--
-- 既存の行にはふりがなが入っていないため NULL 可とする（マスタ画面から順次入力する）。
-- ふりがながない行も、名前では検索できる。
-- ひらがな・カタカナのどちらで登録してもよい（検索時にひらがな・カタカナの違いを区別しないため）。

alter table public.customers
  add column name_kana text;

comment on column public.customers.name_kana is
  '得意先名のふりがな。受注登録画面の売り先の検索に使う。ひらがな・カタカナのどちらでもよい。';

alter table public.delivery_destinations
  add column name_kana text;

comment on column public.delivery_destinations.name_kana is
  '納入先名のふりがな。受注登録画面の入れ先の検索に使う。ひらがな・カタカナのどちらでもよい。';
