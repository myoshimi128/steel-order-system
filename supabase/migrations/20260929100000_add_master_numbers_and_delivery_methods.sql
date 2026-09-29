-- 受注登録画面のテンキー入力（番号で選ぶ方式）に向けたマスタの変更。
--
--   1. 種類・材質・特殊製品種別・加工種別に番号の列（number）を追加する
--   2. 特殊製品種別に「スプライス専用の受注で使う種別か」のフラグを追加する
--   3. 配達方法マスタ（delivery_methods）を新規作成する
--
-- 番号の考え方は docs/table-design.md「受注登録画面のための追加方針」を参照。
-- 固定の選択肢（切断方法・区分など）の番号はアプリ側の定数で持ち、
-- 今後増える可能性がある選択肢だけをマスタの number 列で持つ。


-- ============================================================
-- 1. 番号の列（number）
-- ============================================================
-- 種類・材質・特殊製品種別は、既存の行に名前から番号を入れたうえで NOT NULL にする。
-- 名前の対応表にない行（画面から追加された行など）があっても NOT NULL にできるよう、
-- 残った行には「既存の最大番号 + 1」から名前順に番号を振る。
-- 加工種別は seed がなく実データの内容が分からないため、NULL 可のまま始める
-- （マスタ画面では番号を必須にし、全行に番号が入った後で NOT NULL にする）。

-- --- plate_types（種類） ---
alter table public.plate_types add column number integer;

-- 画面デザインで決めた番号（0 普通板が初期値）
update public.plate_types as t
set number = v.number
from (values
  ('普通板', 0),
  ('縞板',   1),
  ('ボンデ', 2),
  ('ミガキ', 3)
) as v(name, number)
where t.name = v.name;

-- 対応表にない行に、最大番号の次から名前順で番号を振る
-- （row_number() は 1 から始まる連番。coalesce は全行 NULL の場合の対策）
update public.plate_types as t
set number = s.number
from (
  select
    id,
    (select coalesce(max(number), -1) from public.plate_types)
      + row_number() over (order by name) as number
  from public.plate_types
  where number is null
) as s
where t.id = s.id;

alter table public.plate_types
  alter column number set not null,
  add constraint plate_types_number_key unique (number),
  add constraint plate_types_number_check check (number >= 0);


-- --- materials（材質） ---
alter table public.materials add column number integer;

-- 画面デザインの材質の一覧（1 SS400 … 9 TMCP385C）どおりの番号
update public.materials as t
set number = v.number
from (values
  ('SS400',    1),
  ('SM490A',   2),
  ('SM400A',   3),
  ('SN400B',   4),
  ('SN490C',   5),
  ('SN400C',   6),
  ('SN490B',   7),
  ('TMCP325C', 8),
  ('TMCP385C', 9)
) as v(name, number)
where t.name = v.name;

update public.materials as t
set number = s.number
from (
  select
    id,
    (select coalesce(max(number), 0) from public.materials)
      + row_number() over (order by name) as number
  from public.materials
  where number is null
) as s
where t.id = s.id;

alter table public.materials
  alter column number set not null,
  add constraint materials_number_key unique (number),
  add constraint materials_number_check check (number >= 0);


-- --- special_product_types（特殊製品種別） ---
-- 特殊製品種別の番号は、受注登録画面の「区分」の番号として使う。
-- 区分の定数（1 寸法切 / 2 アイトレ / 3 定尺 / 9 加工）と重ならないよう、
-- 1・2・3・9 を使えないようにする。
alter table public.special_product_types add column number integer;

update public.special_product_types as t
set number = v.number
from (values
  ('スプライス', 4),
  ('ササラ',     5),
  ('ベタ丸',     7),
  ('ドーナツ',   8)
) as v(name, number)
where t.name = v.name;

-- 対応表にない行は 10 以上に振る（9 以下は区分の定数と重なる可能性があるため）
update public.special_product_types as t
set number = s.number
from (
  select
    id,
    greatest((select coalesce(max(number), 0) from public.special_product_types), 9)
      + row_number() over (order by name) as number
  from public.special_product_types
  where number is null
) as s
where t.id = s.id;

alter table public.special_product_types
  alter column number set not null,
  add constraint special_product_types_number_key unique (number),
  add constraint special_product_types_number_check check (
    number >= 0 and number not in (1, 2, 3, 9)
  );


-- --- process_types（加工種別） ---
-- NULL 可で始める。一意制約は NULL 同士を重複とみなさないため、
-- 番号が未入力の行が複数あっても登録できる。
alter table public.process_types
  add column number integer,
  add constraint process_types_number_key unique (number),
  add constraint process_types_number_check check (number >= 0);


-- ============================================================
-- 2. スプライス専用の受注で使う種別のフラグ
-- ============================================================
-- スプライス専用の受注（orders.is_splice）の明細に使う特殊製品種別を、
-- 種別名ではなくこのフラグで特定する（種別名で分岐しない方針のため）。
-- true の種別は、通常の受注の区分の一覧には出さない。
alter table public.special_product_types
  add column is_splice_order_type boolean not null default false;

update public.special_product_types
set is_splice_order_type = true
where name = 'スプライス';

-- true の行は 1 行だけ（部分一意インデックス: where 句に合う行だけで一意性を見る）
create unique index special_product_types_splice_order_type_key
  on public.special_product_types (is_splice_order_type)
  where is_splice_order_type;


-- ============================================================
-- 3. delivery_methods（配達方法）
-- ============================================================
-- 配達方法は今後増える可能性があるため、定数ではなくマスタで持つ。
-- 初期データは supabase/seed/003_delivery_methods_initial_data.sql で投入する。
create table public.delivery_methods (
  id uuid primary key default gen_random_uuid(),
  -- 受注登録画面の配達の番号（0 宵積み / 2 2便 … 9 フリー）
  number integer not null,
  name text not null,
  -- 選んだときに文字の入力欄を出すか（フリーのみ true）。
  -- 「フリー」を名前で判定しないためのフラグ
  requires_note boolean not null default false,
  is_active boolean not null default true,
  constraint delivery_methods_number_key unique (number),
  constraint delivery_methods_number_check check (number >= 0),
  constraint delivery_methods_name_key unique (name)
);

-- RLS: ほかのマスタ（マスタ各種）と同じく、参照は全ロール、登録・更新・削除は admin のみ
alter table public.delivery_methods enable row level security;

create policy delivery_methods_select_all_roles
  on public.delivery_methods for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy delivery_methods_admin_all
  on public.delivery_methods for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
