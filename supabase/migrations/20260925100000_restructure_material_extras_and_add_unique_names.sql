-- 材質エキストラの構造見直しと、マスタ名称の一意制約追加。
--
-- 【material_extras の変更】
-- これまでは (material_id, steel_making) の組み合わせごとに加算値を持っていたが、
-- 実際の運用では次の2種類の加算を分けて考える必要があることが分かった。
--   ・extra_price        : SS400ベースの単価にこの材質を使う場合の加算（材質そのものの価格差）
--   ・blast_furnace_extra: 受注が高炉材のときに加算する値（通常10、SS400は0）
-- 単価計算のルールは次のとおり（docs/basic-design.md 母材費の自動計算を参照）。
--   ・SS400ベースの行（cutting_prices.material_id が NULL）を使う場合 → extra_price を加算する
--   ・専用単価の行（cutting_prices.material_id が指定されている）を使う場合 → extra_price は加算しない
--   ・どちらの場合も、受注明細（order_items.steel_making）が高炉材なら blast_furnace_extra を加算する
-- そのため、専用単価を持つ材質（SN400C・SM400A・TMCP325C・TMCP385C）についても
-- material_extras に行を持たせる（extra_price は使われないため 0、blast_furnace_extra は 10）。
-- 材質ごとに1行になるため、一意制約も material_id 単体に張り直す。
--
-- 注意: 既存の material_extras にテスト行が入っている場合、
-- steel_making 列の削除・blast_furnace_extra の not null 追加は失敗する。
-- その場合は先に material_extras の行を削除してから実行すること。

alter table public.material_extras
  drop constraint material_extras_material_steel_making_key;

alter table public.material_extras
  drop column steel_making;

alter table public.material_extras
  add column blast_furnace_extra numeric not null;

alter table public.material_extras
  add constraint material_extras_material_id_key unique (material_id);


-- 【materials.has_dedicated_price の追加】
-- 専用単価（cutting_prices.material_id を指定した行）を持つ材質かどうかを表すフラグ。
-- cutting_prices の材質選択で「専用単価を持つ材質だけ」を候補として絞り込むために使う。
alter table public.materials
  add column has_dedicated_price boolean not null default false;

update public.materials
  set has_dedicated_price = true
  where name in ('SN400C', 'SM400A', 'TMCP325C', 'TMCP385C');


-- 【マスタ名称の一意制約】
-- plate_types / materials / special_product_types はいずれも名称で人が識別するマスタであり、
-- 同じ名前の行が複数登録されると選択時に区別できず事故のもとになるため一意制約を追加する。
alter table public.plate_types
  add constraint plate_types_name_key unique (name);

alter table public.materials
  add constraint materials_name_key unique (name);

alter table public.special_product_types
  add constraint special_product_types_name_key unique (name);
