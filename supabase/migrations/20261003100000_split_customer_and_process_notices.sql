-- 注意事項を「得意先の注意事項」（notices）と「加工の注意事項」（process_notices）の 2 種類に分ける。
--
-- 得意先の注意事項（notices）: 受注登録画面の補助エリアに表示する
--   ・得意先を必須にする（customer_id を NOT NULL）
--   ・切断方法（cutting_method）を条件に追加する（例: ケガキマーキング不可でインクジェットマーキング指定）
--   ・得意先・切断方法・加工種別のうち、指定した条件がすべて受注に当てはまったら表示する
--
-- 加工の注意事項（process_notices）: 受注登録画面の加工の行のすぐ下に表示する
--   ・加工種別（必須）と、板厚の範囲・穴径の範囲（どちらも任意）で表示の条件を決める
--   ・板厚は加工の行の母材（材料の行）、穴径は加工の行の入力（入力の形が「穴」のとき）から取る
--
-- 詳しくは docs/basic-design.md「注意事項の表示」、docs/table-design.md「notices」「process_notices」。

-- ------------------------------------------------------------
-- 1. 加工の注意事項（process_notices）
-- ------------------------------------------------------------
-- 範囲はどちらも「以上・以下」（境界の値を含む）。片方だけの指定もできる（例: 板厚 13 以上）。
-- 範囲を指定しない注意事項は、その加工種別の行すべてに表示する。
create table public.process_notices (
  id uuid primary key default gen_random_uuid(),
  process_type_id uuid not null references public.process_types (id),
  -- 板厚の範囲（mm）。母材の板厚で判定する
  thickness_min numeric,
  thickness_max numeric,
  -- 穴径の範囲（mm）。入力の形が「穴」の加工の行で、入力した穴径で判定する
  hole_diameter_min numeric,
  hole_diameter_max numeric,
  body text not null,
  is_active boolean not null default true,
  constraint process_notices_thickness_positive_check check (
    (thickness_min is null or thickness_min > 0) and (thickness_max is null or thickness_max > 0)
  ),
  constraint process_notices_thickness_range_check check (
    thickness_min is null or thickness_max is null or thickness_min <= thickness_max
  ),
  constraint process_notices_hole_diameter_positive_check check (
    (hole_diameter_min is null or hole_diameter_min > 0)
    and (hole_diameter_max is null or hole_diameter_max > 0)
  ),
  constraint process_notices_hole_diameter_range_check check (
    hole_diameter_min is null or hole_diameter_max is null or hole_diameter_min <= hole_diameter_max
  )
);

comment on table public.process_notices is
  '加工の注意事項。加工種別と板厚・穴径の範囲に当てはまる加工の行の下に表示する（受注には保存しない）。';

-- RLS: ほかのマスタ（マスタ各種）と同じく、参照は全ロール、登録・更新・削除は admin のみ
alter table public.process_notices enable row level security;

create policy process_notices_select_all_roles
  on public.process_notices for select
  to authenticated
  using (public.current_user_role() in ('office', 'factory', 'admin'));
create policy process_notices_admin_all
  on public.process_notices for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ------------------------------------------------------------
-- 2. 得意先のない注意事項を、加工の注意事項に移す
-- ------------------------------------------------------------
-- これまでの notices は「得意先だけ」「加工種別だけ」「その組み合わせ」の 3 通りだった。
-- 加工種別だけの注意事項（customer_id が NULL）は加工の注意事項に移してから消す
-- （範囲の条件は持っていなかったため、範囲なし＝その加工種別の行すべてに表示、として移す）。
-- notices を参照しているテーブルはないため、行を消しても影響はない。
insert into public.process_notices (process_type_id, body, is_active)
select process_type_id, body, is_active
from public.notices
where customer_id is null;

delete from public.notices
where customer_id is null;

-- ------------------------------------------------------------
-- 3. 得意先の注意事項（notices）
-- ------------------------------------------------------------
-- 得意先が必須になるため、「得意先か加工種別のどちらかは必須」のチェック制約は不要になる
alter table public.notices
  drop constraint notices_target_required_check;

alter table public.notices
  alter column customer_id set not null;

-- 切断方法の条件。値域は cutting_prices.cutting_method・order_items.cutting_method と同じ
-- （定尺売りは切断を伴わないため、条件には使わない）
alter table public.notices
  add column cutting_method text;

alter table public.notices
  add constraint notices_cutting_method_check
    check (cutting_method in ('シャーリング', 'ガス', 'レーザー', 'プラズマ'));

comment on table public.notices is
  '得意先の注意事項。得意先・切断方法・加工種別のうち、指定した条件がすべて受注に当てはまったら補助エリアに表示する（受注には保存しない）。';
comment on column public.notices.cutting_method is
  '切断方法の条件（任意）。受注のどこかの材料の行がこの切断方法なら当てはまる。';
comment on column public.notices.process_type_id is
  '加工種別の条件（任意）。受注のどこかの加工の行がこの加工種別なら当てはまる。';
