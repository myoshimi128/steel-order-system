-- 受注の処理区分 1 変更・2 削除（PR 9b。docs/screen-design.md「受注の削除・修正」、docs/table-design.md「orders」）。
--
--   1. private.insert_order_lines   明細・加工の行・スタンプの登録を、新規（create_order）と変更（update_order）で共通にする
--   2. create_order の作り直し        明細の登録を 1 の関数に任せる（中身の動きは 20261024100000 の版と同じ）
--   3. update_order                  受注の変更。ヘッダーを書き換え、明細・加工の行・スタンプを入れ直す
--   4. delete_order                  受注の論理削除
--   5. 送り状がある受注の制限を広げる 削除だけでなく、変更（ヘッダー・明細・加工の行・スタンプ）も断る
--
-- 業務の決まり「受注 → 送り状 → 仕入」の逆順でしか直せない（docs/basic-design.md「仕入入力（予定）」の「修正の順番」）。
-- 送り状（shipments）がある受注は、送り状を先に取り消さないと変更・削除できない。
--
-- update_order・delete_order は security definer（関数所有者の権限で実行）にする。
-- 明細・加工の行・スタンプの削除は RLS で管理者だけに許しているため、事務が変更するときの明細の入れ直しは、
-- 関数の中で事務・管理者かを確かめてから所有者の権限で行う（事務に明細の削除の権限そのものは付けない）。
-- search_path を空にして、テーブル・関数はすべてスキーマ名つきで書く（定義者の権限で動く関数の決まりごと）。
--
-- ほかの人が先に保存していたら断る: 画面を開いたときの orders.updated_at を受け取り、今の値と違えば
-- ORDER_CHANGED のエラーにする。orders には updated_at を自動で更新するトリガーがないため、変更・削除の関数で now() を入れる。
-- エラーの文の先頭の ORDER_〇〇 は、画面がエラーの種類を見分けるための印。
--
-- 実行の手順:
--   1. SQL Editor でこのファイルを実行する
--   2. npm run db:types で型を再生成する（関数の型は、生成と同じ形で lib/database.types.ts に先に入れてある）
--   テーブルは増えないため、Data API の設定画面での確認は不要
--   送り状の制限は、seed 012（supabase/seed/012_order_shipment_check.sql）で確かめられる


-- ============================================================
-- 1. 明細・加工の行・スタンプの登録（新規と変更で共通）
-- ============================================================
-- p_items: 材料の行の配列（order_items の列名をキーにした JSON。processes に加工の行の配列）
-- p_order: ヘッダーの JSON（stamp_ids にチェックしたスタンプの id の配列）
-- 呼び出した関数の権限で動く（create_order からは呼んだユーザーの権限、update_order からは所有者の権限）
create or replace function private.insert_order_lines(p_order_id uuid, p_order jsonb, p_items jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  -- 材料の行 1 行分の JSON と、登録した材料の行の id
  v_item jsonb;
  v_item_id uuid;
begin
  -- 明細（材料の行）が 1 行もない受注は登録しない
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '明細を 1 行以上入力してください';
  end if;

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
      p_order_id, item.line_no, item.product_id,
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
  select p_order_id, stamp_id::uuid
  from jsonb_array_elements_text(coalesce(p_order -> 'stamp_ids', '[]'::jsonb)) as stamp_id;
end;
$$;

comment on function private.insert_order_lines(uuid, jsonb, jsonb) is
  '受注の明細・加工の行・スタンプを登録する。create_order と update_order の中からだけ呼ぶ。';

-- create_order（security invoker）の中から呼ぶため、authenticated に実行の権限を付ける。
-- private スキーマは Data API で公開していないため、ブラウザから直接は呼べない
revoke execute on function private.insert_order_lines(uuid, jsonb, jsonb) from public, anon;
grant execute on function private.insert_order_lines(uuid, jsonb, jsonb) to authenticated;


-- ============================================================
-- 2. create_order の作り直し
-- ============================================================
-- 20261024100000_link_orders_to_intakes.sql の版との違いは、明細・加工の行・スタンプの登録を
-- private.insert_order_lines に任せたことだけ（受付の確かめ・枝番の採番・加工場所の更新は同じ）
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
begin
  -- 明細（材料の行）が 1 行もない受注は、枝番を採番する前に断る
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

  -- 明細・加工の行・スタンプ
  perform private.insert_order_lines(v_order_id, p_order, p_items);

  return v_order_no;
end;
$$;


-- ============================================================
-- 3. 受注の変更
-- ============================================================
-- 変えるのはヘッダーの列と、明細・加工の行・スタンプ（消して入れ直す）。
-- 受注No.・枝番・受付・加工区分・登録した人（created_by）は変えない。
-- 加工場所を変えても、その受注だけを変え、受付の加工場所は変えない（受付にはほかの受注もあるため）。
-- 明細の行は受注の一部で、ほかから参照されない（送り状の明細から参照される受注は、先に断る）ため、
-- 入れ直しの分は物理的に消す。重量・仕入単価は、呼び出す前に Server Action で計算し直してある。
-- 戻り値は受注No.
create or replace function public.update_order(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_order jsonb,
  p_items jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_no text;
  v_updated_at timestamptz;
  v_deleted_at timestamptz;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '受注を変更できるのは事務・管理者だけです';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception '明細を 1 行以上入力してください';
  end if;

  -- 受注の行をロックして、ほかの人の変更・削除と同時に動かないようにする
  select order_no, updated_at, deleted_at into v_order_no, v_updated_at, v_deleted_at
  from public.orders
  where id = p_order_id
  for update;
  if v_order_no is null then
    raise exception 'ORDER_NOT_FOUND: 受注が見つかりません';
  end if;
  if v_deleted_at is not null then
    raise exception 'ORDER_DELETED: 削除された受注です (受注No.=%)', v_order_no;
  end if;
  if v_updated_at is distinct from p_expected_updated_at then
    raise exception 'ORDER_CHANGED: ほかの人が先にこの受注を変更しました (受注No.=%)', v_order_no;
  end if;
  if exists (select 1 from public.shipments where order_id = p_order_id) then
    raise exception 'ORDER_HAS_SHIPMENTS: 送り状が発行されている受注は変更できません (受注No.=%)', v_order_no;
  end if;

  update public.orders
  set
    staff_id = coalesce((p_order ->> 'staff_id')::uuid, staff_id),
    is_urgent = coalesce((p_order ->> 'is_urgent')::boolean, false),
    order_date = (p_order ->> 'order_date')::date,
    member_class = coalesce(p_order ->> 'member_class', 'NONE'),
    joint_no = p_order ->> 'joint_no',
    splice_shot = (p_order ->> 'splice_shot')::boolean,
    customer_id = (p_order ->> 'customer_id')::uuid,
    customer_contact = p_order ->> 'customer_contact',
    delivery_destination_id = (p_order ->> 'delivery_destination_id')::uuid,
    project_name = p_order ->> 'project_name',
    due_date_type = p_order ->> 'due_date_type',
    due_date = (p_order ->> 'due_date')::date,
    delivery_method_id = (p_order ->> 'delivery_method_id')::uuid,
    delivery_method_note = p_order ->> 'delivery_method_note',
    site_id = coalesce((p_order ->> 'site_id')::uuid, site_id),
    field_note = p_order ->> 'field_note',
    updated_at = now()
  where id = p_order_id;

  -- 明細・加工の行・スタンプを消して入れ直す（加工の行は材料の行を参照しているため、先に消す）
  delete from public.order_stamps where order_id = p_order_id;
  delete from public.order_item_processes
  where order_item_id in (select id from public.order_items where order_id = p_order_id);
  delete from public.order_items where order_id = p_order_id;
  perform private.insert_order_lines(p_order_id, p_order, p_items);

  return v_order_no;
end;
$$;

comment on function public.update_order(uuid, timestamptz, jsonb, jsonb) is
  '受注の変更（処理区分 1 変更）。ヘッダーを書き換え、明細・加工の行・スタンプを入れ直す。受注No.・枝番・受付・加工区分は変えない。送り状がある受注・ほかの人が先に変更した受注は断る。事務・管理者だけ。';


-- ============================================================
-- 4. 受注の論理削除
-- ============================================================
-- deleted_at に日時を入れる（行は消さない）。削除した受注No. の枝番は使い回さない。
-- 加工区分・受付の状態は変えない（起票をやり直すときは「受注登録待ちに追加」で区分を足す）。
-- 戻り値は受注No.
create or replace function public.delete_order(p_order_id uuid, p_expected_updated_at timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_no text;
  v_updated_at timestamptz;
  v_deleted_at timestamptz;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '受注を削除できるのは事務・管理者だけです';
  end if;

  select order_no, updated_at, deleted_at into v_order_no, v_updated_at, v_deleted_at
  from public.orders
  where id = p_order_id
  for update;
  if v_order_no is null then
    raise exception 'ORDER_NOT_FOUND: 受注が見つかりません';
  end if;
  if v_deleted_at is not null then
    raise exception 'ORDER_DELETED: すでに削除された受注です (受注No.=%)', v_order_no;
  end if;
  if v_updated_at is distinct from p_expected_updated_at then
    raise exception 'ORDER_CHANGED: ほかの人が先にこの受注を変更しました (受注No.=%)', v_order_no;
  end if;
  if exists (select 1 from public.shipments where order_id = p_order_id) then
    raise exception 'ORDER_HAS_SHIPMENTS: 送り状が発行されている受注は削除できません (受注No.=%)', v_order_no;
  end if;

  update public.orders set deleted_at = now(), updated_at = now() where id = p_order_id;
  return v_order_no;
end;
$$;

comment on function public.delete_order(uuid, timestamptz) is
  '受注の論理削除（処理区分 2 削除）。送り状がある受注・ほかの人が先に変更した受注は断る。事務・管理者だけ。';

revoke execute on function
  public.update_order(uuid, timestamptz, jsonb, jsonb),
  public.delete_order(uuid, timestamptz)
from public, anon;

grant execute on function
  public.update_order(uuid, timestamptz, jsonb, jsonb),
  public.delete_order(uuid, timestamptz)
to authenticated;


-- ============================================================
-- 5. 送り状がある受注の制限を広げる
-- ============================================================
-- 今までは削除（deleted_at を入れる更新）だけを断っていた（20260929100200_restrict_order_deletion_and_factory_updates.sql）。
-- 送り状がある受注は、状態（status。出荷の進み具合）と updated_at 以外の列の変更も断る。
-- 関数の名前・トリガーの名前は今のまま使う（トリガー orders_prevent_deleting_shipped）
create or replace function public.prevent_deleting_shipped_orders()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.shipments where order_id = new.id) then
    -- 「削除されていない状態 → 削除済み」に変わる更新
    if old.deleted_at is null and new.deleted_at is not null then
      raise exception '出荷実績がある受注は削除できません（受注No. %）', new.order_no;
    end if;
    -- それ以外の列の変更（to_jsonb で行を JSON にして、status と updated_at を除いて比べる）
    if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
      raise exception '送り状が発行されている受注は変更できません（受注No. %）', new.order_no;
    end if;
  end if;
  return new;
end;
$$;

-- 明細・加工の行・スタンプの追加・変更・削除も、送り状がある受注のものなら断る。
-- tg_table_name はトリガーを起こしたテーブルの名前。delete のときは new がないため old を見る
create or replace function public.prevent_changing_shipped_order_lines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  -- 加工の行は材料の行を通して受注を探す。if の枝ごとに、そのテーブルにある列だけを読む
  if tg_table_name = 'order_item_processes' then
    if tg_op = 'DELETE' then
      select order_id into v_order_id from public.order_items where id = old.order_item_id;
    else
      select order_id into v_order_id from public.order_items where id = new.order_item_id;
    end if;
  elsif tg_op = 'DELETE' then
    v_order_id := old.order_id;
  else
    v_order_id := new.order_id;
  end if;

  if exists (select 1 from public.shipments where order_id = v_order_id) then
    raise exception '送り状が発行されている受注の明細は変更できません';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger order_items_prevent_changing_shipped
  before insert or update or delete on public.order_items
  for each row execute function public.prevent_changing_shipped_order_lines();

create trigger order_item_processes_prevent_changing_shipped
  before insert or update or delete on public.order_item_processes
  for each row execute function public.prevent_changing_shipped_order_lines();

create trigger order_stamps_prevent_changing_shipped
  before insert or update or delete on public.order_stamps
  for each row execute function public.prevent_changing_shipped_order_lines();
