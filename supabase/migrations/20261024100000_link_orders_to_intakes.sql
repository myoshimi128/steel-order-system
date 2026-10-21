-- 受注（orders）を受付につなぎ、受注No. を受付No.＋枝番にする（docs/intake/table-design.md「orders（PR 9）」）。
--
--   1. テストの受注をすべて消す（出荷のテストデータも含む。すべてテストのデータとユーザー確認済み）
--   2. orders に列を足す: 受付（intake_id）・加工区分（work_unit_id）・枝番（branch_no）・自社の担当者（staff_id）・至急（is_urgent）
--   3. 受注No. の切り替え: 今の採番（2600001 の形。private.next_order_no とカウンター）をやめ、
--      create_order の中で private.issue_order_branch が {受付No.}-{枝番}（26-1003-1）を決める
--   4. create_order の作り直し（受付・加工区分を受け取り、枝番の採番と受注の登録を同じ transaction で行う）
--   5. 受注のある受付は削除させない（PR 3 からの持ち越し）
--   6. 受注のある加工区分の CSV は外させない（PR 7 からの持ち越し。remove_cad_csv の作り直し）
--   7. attachments（受注に直接付ける注文書）を廃止する（受付のファイル intake_files に一本化した）
--
-- 実行の手順:
--   1. SQL Editor でこのファイルを実行する（受注・出荷のデータがすべて消える。本番の DB では実行しない）
--   2. npm run db:types で型を再生成する（列・関数の型は、生成と同じ形で lib/database.types.ts に先に入れてある）
--   3. テーブルは増えない（attachments は消える）ため、Data API の設定画面での確認は不要
--   4. 確かめの SQL は supabase/seed/011_order_link_check.sql（読むだけ）


-- ============================================================
-- 1. テストの受注をすべて消す
-- ============================================================
-- 新しく NOT NULL の列（受付・加工区分など）を足すため、今ある受注（受付につながっていないテストのデータ）を先に消す。
-- 外部キーで参照している側（子のテーブル）から順に消す
delete from public.shipment_items;
delete from public.shipments;
delete from public.attachments;
delete from public.order_stamps;
delete from public.order_item_processes;
delete from public.order_items;
delete from public.orders;


-- ============================================================
-- 2. orders に列を足す
-- ============================================================
alter table public.orders
  -- 受付。受注は必ず受付を通す
  add column intake_id uuid not null references public.intakes (id),
  -- どの加工区分（受注登録待ちの 1 行）から起票したか
  add column work_unit_id uuid not null,
  -- 受注No. の枝番（受付ごとに 1 から）
  add column branch_no integer not null check (branch_no >= 1),
  -- 自社の担当者（起票した人。客先の窓口担当 customer_contact とは別）
  add column staff_id uuid not null default auth.uid() references public.users (id),
  -- 至急。受付の至急を初期値として入れ、受注情報で変えられる。現場で優先して加工してもらうための印
  add column is_urgent boolean not null default false,
  -- 別の受付の加工区分には付けられないよう、(加工区分, 受付) の組で参照する（intake_files と同じ）
  add constraint orders_unit_same_intake_fkey foreign key (work_unit_id, intake_id)
    references public.work_units (id, intake_id),
  -- 同じ受付の中で枝番は重複しない
  add constraint orders_intake_branch_key unique (intake_id, branch_no);

create index orders_work_unit_idx on public.orders (work_unit_id);

comment on column public.orders.intake_id is '受付。受注は必ず受付を通す。';
comment on column public.orders.work_unit_id is 'どの加工区分（受注登録待ちの 1 行）から起票したか。';
comment on column public.orders.branch_no is '受注No. の枝番（受付ごとの連番）。受注No. は {受付No.}-{枝番}。';
comment on column public.orders.staff_id is '自社の担当者（起票した人）。客先担当（customer_contact）とは別。';
comment on column public.orders.is_urgent is '至急。受付の至急を初期値にする。現場で優先して加工してもらうための印。';


-- ============================================================
-- 3. 受注No. の切り替え
-- ============================================================
-- 受注No. は create_order の中で {受付No.}-{枝番} を入れるため、今の採番（2600001）の初期値を外して、関数とカウンターを消す
alter table public.orders alter column order_no drop default;
alter table public.orders alter column order_no set not null;
drop function private.next_order_no();
drop table private.order_no_counters;

-- 枝番の採番。create_order の中からだけ呼ぶ。
-- 受付の行の last_branch を update で +1 する。update は行をロックするため、同時に 2 件登録しても枝番は重複しない。
-- 呼び出した transaction（create_order）が取り消されたら、カウンターの更新も取り消される（枝番は飛ばない）。
-- security definer（関数所有者の権限で実行）にして、受付の行の更新を RLS に左右されずに行う。
-- search_path を空にして、テーブルはスキーマ名つきで書く（定義者の権限で動く関数の決まりごと）
create or replace function private.issue_order_branch(p_intake_id uuid, out branch_no integer, out order_no text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_intake_no text;
begin
  update public.intakes
  set last_branch = last_branch + 1
  where id = p_intake_id and intake_no is not null and deleted_at is null
  returning last_branch, intake_no into branch_no, v_intake_no;
  if not found then
    raise exception '受付No. のない受付です (id=%)', p_intake_id;
  end if;
  order_no := v_intake_no || '-' || branch_no;
end;
$$;

comment on function private.issue_order_branch(uuid) is
  '受注No. の枝番を採番する（受付ごとの連番）。create_order の中からだけ呼ぶ。';

-- create_order（security invoker）の中から呼ぶため、authenticated に実行の権限を付ける。
-- private スキーマは Data API で公開していないため、ブラウザから直接は呼べない
revoke execute on function private.issue_order_branch(uuid) from public, anon;
grant execute on function private.issue_order_branch(uuid) to authenticated;


-- ============================================================
-- 4. create_order を作り直す
-- ============================================================
-- 20261017100100_create_sites_and_order_site.sql の版との違い（明細・加工の行・スタンプの登録は同じ）:
--   ・p_order から intake_id・work_unit_id・staff_id・is_urgent を受け取る
--   ・加工区分が受注登録待ち（ready）で、その受付のものであること、受付が削除されていないことを確かめる
--     （加工区分の行をロックして、起票完了と同時に登録されないようにする）
--   ・orders の insert の前に private.issue_order_branch で枝番と受注No. を決め、insert に含める
--     （受注の登録と枝番の採番は同じ transaction のため、登録に失敗すると枝番も取り消される）
--   ・加工場所（site_id）が受付と違えば、受付の加工場所も更新する（変更の履歴はトリガー intakes_log_site_change が残す。
--     受付の残りの加工区分も、変更先の受注登録待ちに移る）
-- エラーの文の先頭の WORK_UNIT_NOT_READY は、画面がエラーの種類を見分けるための印
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_no text;
  v_branch_no integer;
  v_intake_id uuid := (p_order ->> 'intake_id')::uuid;
  v_work_unit_id uuid := (p_order ->> 'work_unit_id')::uuid;
  v_unit_status text;
  v_intake_site_id uuid;
  v_site_id uuid;
  -- 材料の行 1 行分の JSON と、登録した材料の行の id
  v_item jsonb;
  v_item_id uuid;
begin
  -- 明細（材料の行）が 1 行もない受注は登録しない
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '明細を 1 行以上入力してください';
  end if;

  -- 受注は受注登録待ちの加工区分から起票する
  if v_intake_id is null or v_work_unit_id is null then
    raise exception '受注登録待ちの一覧から受注登録を始めてください';
  end if;
  select wu.status, i.site_id into v_unit_status, v_intake_site_id
  from public.work_units wu
  join public.intakes i on i.id = wu.intake_id and i.deleted_at is null
  where wu.id = v_work_unit_id and wu.intake_id = v_intake_id
  for update of wu;
  if v_unit_status is distinct from 'ready' then
    raise exception 'WORK_UNIT_NOT_READY: この区分は受注登録待ちではありません (状態=%)', coalesce(v_unit_status, '区分なし');
  end if;

  -- 加工場所。省略されたら受付の加工場所。受付と違えば、受付の加工場所も変える
  v_site_id := coalesce((p_order ->> 'site_id')::uuid, v_intake_site_id);
  if v_site_id is distinct from v_intake_site_id then
    update public.intakes set site_id = v_site_id where id = v_intake_id;
  end if;

  -- 枝番と受注No.（26-1003-1）を決める
  select b.branch_no, b.order_no into v_branch_no, v_order_no
  from private.issue_order_branch(v_intake_id) as b;

  -- ヘッダー。->> は JSON の値を文字列で取り出す演算子（値が null なら SQL の NULL になる）
  insert into public.orders (
    order_no, intake_id, work_unit_id, branch_no, staff_id, is_urgent,
    order_date, member_class, joint_no, splice_shot,
    customer_id, customer_contact, delivery_destination_id, project_name,
    due_date_type, due_date, delivery_method_id, delivery_method_note,
    site_id, field_note, created_by
  )
  values (
    v_order_no,
    v_intake_id,
    v_work_unit_id,
    v_branch_no,
    -- 担当者。省略されたら登録した人
    coalesce((p_order ->> 'staff_id')::uuid, auth.uid()),
    coalesce((p_order ->> 'is_urgent')::boolean, false),
    (p_order ->> 'order_date')::date,
    -- 部材区分。省略されたら無分類
    coalesce(p_order ->> 'member_class', 'NONE'),
    p_order ->> 'joint_no',
    (p_order ->> 'splice_shot')::boolean,
    (p_order ->> 'customer_id')::uuid,
    p_order ->> 'customer_contact',
    (p_order ->> 'delivery_destination_id')::uuid,
    p_order ->> 'project_name',
    p_order ->> 'due_date_type',
    (p_order ->> 'due_date')::date,
    (p_order ->> 'delivery_method_id')::uuid,
    p_order ->> 'delivery_method_note',
    v_site_id,
    -- フリーコメント（現場用伝票に印字する）
    p_order ->> 'field_note',
    auth.uid()
  )
  returning id into v_order_id;

  -- 材料の行を 1 行ずつ登録する（jsonb_array_elements で配列の要素を 1 つずつ取り出す）
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id, line_no, product_id,
      cutting_method, cutting_type, special_product_type_id, plate_size, steel_making,
      width, length, outer_diameter, inner_diameter, quantity,
      square_weight, actual_weight, material_weight,
      cutting_unit_price, price_unit, manufacturer_specified_id, field_note
    )
    select
      v_order_id, item.line_no, item.product_id,
      item.cutting_method, item.cutting_type, item.special_product_type_id, item.plate_size,
      item.steel_making,
      item.width, item.length, item.outer_diameter, item.inner_diameter, item.quantity,
      item.square_weight, item.actual_weight, item.material_weight,
      item.cutting_unit_price, item.price_unit, item.manufacturer_specified_id, item.field_note
    -- jsonb_to_record で JSON オブジェクトを 1 行に変換する（processes など定義しないキーは無視される）
    from jsonb_to_record(v_item) as item(
      line_no integer,
      product_id uuid,
      cutting_method text,
      cutting_type text,
      special_product_type_id uuid,
      plate_size text,
      steel_making text,
      width numeric,
      length numeric,
      outer_diameter numeric,
      inner_diameter numeric,
      quantity integer,
      square_weight numeric,
      actual_weight numeric,
      material_weight numeric,
      cutting_unit_price numeric,
      price_unit text,
      manufacturer_specified_id uuid,
      field_note text
    )
    returning id into v_item_id;

    -- その材料の行にぶら下がる加工の行。processes がなければ空の配列として扱う。
    -- spec_fields は jsonb として受け取り、JSON のまま保存する
    insert into public.order_item_processes (
      order_item_id, line_no, process_type_id, spec, spec_fields,
      quantity, unit_price, price_unit, remarks
    )
    select
      v_item_id, process.line_no, process.process_type_id, process.spec, process.spec_fields,
      process.quantity, process.unit_price, coalesce(process.price_unit, '個'), process.remarks
    from jsonb_to_recordset(coalesce(v_item -> 'processes', '[]'::jsonb)) as process(
      line_no integer,
      process_type_id uuid,
      spec text,
      spec_fields jsonb,
      quantity integer,
      unit_price numeric,
      price_unit text,
      remarks text
    );
  end loop;

  -- スタンプ。p_order の stamp_ids（スタンプの id の配列）を 1 件ずつ order_stamps に登録する
  insert into public.order_stamps (order_id, stamp_id)
  select v_order_id, stamp_id::uuid
  from jsonb_array_elements_text(coalesce(p_order -> 'stamp_ids', '[]'::jsonb)) as stamp_id;

  return v_order_no;
end;
$$;

comment on function public.create_order(jsonb, jsonb) is
  '受注登録待ちの加工区分から受注を登録する。枝番を採番して受注No.（{受付No.}-{枝番}）を決め、ヘッダー・材料の行・加工の行・スタンプを 1 つの transaction で登録し、受注No. を返す。加工場所が受付と違えば受付も更新する。RLS はそのまま適用される。';


-- ============================================================
-- 5. 受注のある受付は削除させない（PR 3 からの持ち越し）
-- ============================================================
-- 受付登録の「2 削除」（delete_intake。deleted_at を入れる論理削除）で、受注が 1 件でもある受付を消させない
create or replace function public.intakes_prevent_deleting_ordered()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null
     and exists (select 1 from public.orders where intake_id = new.id and deleted_at is null) then
    raise exception 'INTAKE_HAS_ORDERS: 受注が登録されている受付は削除できません (受付No.=%)', new.intake_no;
  end if;
  return new;
end;
$$;

create trigger intakes_prevent_deleting_ordered
  before update on public.intakes
  for each row execute function public.intakes_prevent_deleting_ordered();


-- ============================================================
-- 6. 受注のある加工区分の CSV は外させない（PR 7 からの持ち越し）
-- ============================================================
-- 20261022100000_add_cad_functions.sql の版との違いは、その加工区分の受注があればエラーにすることだけ
-- （受注の明細は CSV から作った部品を元にしているため、受注の後に CSV を外すと食い違う）
create or replace function public.remove_cad_csv(p_file_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_work_unit_id uuid;
  v_status text;
  v_path text;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'CSV を外せるのは事務・管理者だけです';
  end if;

  select work_unit_id into v_work_unit_id
  from public.intake_files
  where id = p_file_id and kind = 'csv' and deleted_at is null;
  if v_work_unit_id is null then
    raise exception 'CSV が見つかりません（ほかの人が外した可能性があります）';
  end if;

  select status into v_status from public.work_units where id = v_work_unit_id for update;
  if v_status <> 'ready' then
    raise exception 'CAD_STATUS_CHANGED: CSV を外せる状態ではありません (状態=%)', v_status;
  end if;
  if exists (select 1 from public.orders where work_unit_id = v_work_unit_id and deleted_at is null) then
    raise exception 'CAD_HAS_ORDERS: この区分の受注が登録されているため、CSV を外せません';
  end if;

  update public.intake_files
  set deleted_at = now()
  where id = p_file_id
  returning storage_path into v_path;

  if not exists (
    select 1 from public.intake_files
    where work_unit_id = v_work_unit_id and kind = 'csv' and deleted_at is null
  ) then
    update public.work_units set status = 'cad_working' where id = v_work_unit_id;
  end if;

  return v_path;
end;
$$;


-- ============================================================
-- 7. attachments を廃止する
-- ============================================================
-- 受注に関わるファイルは、すべて受付のファイル（intake_files）に持つ。
-- 受注の注文書・図面は「受注 → 加工区分（work_unit_id）→ ファイル」「受注 → 受付（intake_id）→ ファイル」でたどる。
-- テーブルを消すと、テーブルに付いた RLS のポリシーも一緒に消える
drop table public.attachments;
