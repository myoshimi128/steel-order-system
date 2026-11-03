-- 送り状の発行と取り消し（PR 10a。docs/basic-design.md「送り状発行」、docs/table-design.md「shipments」「送り状の番号」、
-- docs/screen-design.md「送り状発行」）。
--
-- 送り状は受注 1 件につき何枚でも出せる（分納）。1 枚の送り状には 1 つの受注だけを載せる（今の shipments.order_id のまま）。
--
--   1. 送り状No. の一意の制約と、送り状の明細の重複の制約
--   2. 送り状No. の採番（受注ごとの回数のカウンター）
--   3. 受注の状態を、出荷の実績から付け直す関数
--   4. 送り状を発行する関数 create_shipment
--   5. 送り状を取り消す関数 delete_shipment
--   6. RLS・権限（参照は事務・管理者。書き込みは関数だけ）
--
-- 送り状No. は {受注No.}-{回数 2 桁}（例: 26-0001-1-01、分納の 2 回目は 26-0001-1-02）。
-- 送り状は受注にぶら下がる書類なので、受注No. につなげる。取り消した送り状の番号は使い回さない
-- （受注ごとに、今までに出した回数をカウンターに残し、取り消しても戻さない）。
--
-- 状態（orders.status）の変わり方:
--   ・発行: 全部出し終えたら 完了、残りがあれば 配送依頼済み。加工待ち・出荷待ちのどちらからでも発行できる
--     （現場用伝票が戻ったときに 出荷待ち にする操作は作らない。ユーザーの判断）
--   ・取り消し: 送り状が残っていなければ 出荷待ち（一度は出荷できる状態になっていたため）、
--     残っていれば出荷の実績から 配送依頼済み か 完了 を付け直す
-- 残りの数量は「受注数量 − 送り状の明細の数量の合計」として計算し、列には持たない。
--
-- 納期: 確定でない受注（仮納期・後報・最短出荷）は、発行と同時に納期を確定にして日付を入れる。
-- 送り状がある受注はトリガー（orders_prevent_deleting_shipped）で納期も変えられないため、送り状を入れる前に書き換える。
-- 分納の 2 回目以降は、1 回目に確定した納期のまま変えない。取り消しても、確定にした納期は戻さない。
--
-- 実重量: shipment_items.weight に、その回の出荷の実重量の合計（kg、小数第 2 位まで）を残す。
--   ・1 枚あたりの実重量が受注の明細にある行（寸法切・ベタ丸・ドーナツ・定尺）は、関数の中で 1 枚あたり × 枚数 から求める
--   ・ない行（アイトレ・ササラ）は、送り状の画面で入力した 1 枚あたりの値から求める。入力しなければ NULL（実重量は不明）
-- 受注の明細（order_items.actual_weight）には書かない（送り状がある受注の明細は変えられないため、回ごとに送り状に残す）。


-- ============================================================
-- 1. 制約
-- ============================================================
-- 送り状No. は呼び出しに使うため、重ならないようにする
alter table public.shipments
  add constraint shipments_shipment_no_key unique (shipment_no);

-- 1 枚の送り状に、同じ明細は 1 行だけ
alter table public.shipment_items
  add constraint shipment_items_shipment_item_key unique (shipment_id, order_item_id);

-- 出荷の重量は、入っていれば正の数
alter table public.shipment_items
  add constraint shipment_items_weight_check check (weight is null or weight > 0);

-- 受注ごとの送り状を読む・明細ごとに出荷の合計を数えるための索引
create index shipments_order_id_idx on public.shipments (order_id, created_at);
create index shipment_items_order_item_id_idx on public.shipment_items (order_item_id);


-- ============================================================
-- 2. 送り状No. の採番
-- ============================================================
-- 受注ごとに、今までに出した送り状の回数を持つ。取り消しても減らさない（番号を使い回さないため）。
-- 受注の列に持つと、送り状がある受注の列の変更を断るトリガーに当たるため、別のテーブルにする。
-- Data API で公開しない private スキーマに置き、関数 create_shipment からだけ書く
create table private.shipment_no_counters (
  order_id uuid primary key references public.orders (id),
  last_seq integer not null
);

comment on table private.shipment_no_counters is
  '受注ごとの送り状の回数（送り状No. の末尾の 2 桁）。取り消しても戻さない。create_shipment からだけ書く。';

revoke all on table private.shipment_no_counters from anon, authenticated;

-- 次の送り状No. を採番する。create_shipment の中からだけ呼ぶ（security definer の関数の中なので、権限は付けない）。
-- insert ... on conflict do update は行をロックするため、同じ受注に同時に発行しても回数は重ならない。
-- 呼び出した transaction が取り消されたら、カウンターの更新も取り消される（失敗した発行で番号は飛ばない）
create or replace function private.issue_shipment_no(p_order_id uuid, p_order_no text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_seq integer;
begin
  insert into private.shipment_no_counters as c (order_id, last_seq)
  values (p_order_id, 1)
  on conflict (order_id) do update set last_seq = c.last_seq + 1
  returning last_seq into v_seq;

  -- 回数は 2 桁にそろえる（01〜99）。100 回目からは桁を増やす（lpad は長い文字を切ってしまうため使わない）
  return p_order_no || '-' || case when v_seq < 10 then '0' || v_seq::text else v_seq::text end;
end;
$$;

comment on function private.issue_shipment_no(uuid, text) is
  '送り状No.（受注No.-回数 2 桁）を採番する。create_shipment の中からだけ呼ぶ。';

revoke execute on function private.issue_shipment_no(uuid, text) from public, anon, authenticated;


-- ============================================================
-- 3. 受注の状態を付け直す
-- ============================================================
-- 出荷の実績から、受注の状態を決めて書き込む（発行・取り消しの最後に呼ぶ）。
--   送り状がない → 出荷待ち / どの明細も残りが 0 → 完了 / それ以外 → 配送依頼済み
-- 状態の更新では updated_at を変えない（updated_at は受注の中身を変えたときだけ。現場用伝票の「印刷の後に変更」に使うため）
create or replace function private.refresh_order_shipment_status(p_order_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if not exists (select 1 from public.shipments where order_id = p_order_id) then
    v_status := '出荷待ち';
  elsif exists (
    -- 受注数量より出荷の合計が少ない明細が 1 つでもあれば、残りがある
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.quantity > coalesce((
        select sum(si.quantity) from public.shipment_items si where si.order_item_id = oi.id
      ), 0)
  ) then
    v_status := '配送依頼済み';
  else
    v_status := '完了';
  end if;

  update public.orders set status = v_status where id = p_order_id and status is distinct from v_status;
  return v_status;
end;
$$;

comment on function private.refresh_order_shipment_status(uuid) is
  '出荷の実績から受注の状態（出荷待ち / 配送依頼済み / 完了）を付け直す。create_shipment・delete_shipment からだけ呼ぶ。';

revoke execute on function private.refresh_order_shipment_status(uuid) from public, anon, authenticated;


-- ============================================================
-- 4. 送り状を発行する
-- ============================================================
-- 引数:
--   p_order_id            受注
--   p_expected_updated_at 画面を開いたときの受注の更新日時（ほかの人が受注を変えていたら ORDER_CHANGED）
--   p_shipped_date        出荷日
--   p_items               今回出す明細の配列。[{"order_item_id": "...", "quantity": 5, "piece_weight": 12.34}, ...]
--                         piece_weight は 1 枚あたりの実重量の入力（受注の明細に実重量がない行だけ使う。省略・null は未入力）
--   p_due_date            確定にする納期の日付（受注の納期が確定でないときだけ使う。確定なら無視する）。
--                         省略できるよう最後に置き、既定値を null にする
-- 戻り値は送り状No.。
-- エラーの印（画面で文にする）: ORDER_NOT_FOUND / ORDER_DELETED / ORDER_CHANGED / ORDER_COMPLETED /
--   DUE_DATE_REQUIRED / SHIPMENT_ITEMS_EMPTY / SHIPMENT_ITEM_INVALID / SHIPMENT_EXCEEDS_ORDER
create or replace function public.create_shipment(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_shipped_date date,
  p_items jsonb,
  p_due_date date default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_shipment_id uuid;
  v_shipment_no text;
  v_item jsonb;
  v_order_item public.order_items%rowtype;
  v_quantity integer;
  v_piece_weight numeric;
  v_weight numeric;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '送り状を発行できるのは事務・管理者だけです';
  end if;

  -- 受注の行をロックする。同じ受注に同時に発行しても、出荷の合計の確かめと回数の採番が重ならないようにするため
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND: 受注が見つかりません';
  end if;
  if v_order.deleted_at is not null then
    raise exception 'ORDER_DELETED: 削除された受注の送り状は発行できません (受注No.=%)', v_order.order_no;
  end if;
  if v_order.updated_at is distinct from p_expected_updated_at then
    raise exception 'ORDER_CHANGED: 画面を開いた後に受注が変更されています (受注No.=%)', v_order.order_no;
  end if;
  if v_order.status = '完了' then
    raise exception 'ORDER_COMPLETED: 全部出荷済みの受注です (受注No.=%)', v_order.order_no;
  end if;
  if p_shipped_date is null then
    raise exception 'SHIPMENT_ITEM_INVALID: 出荷日がありません';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'SHIPMENT_ITEMS_EMPTY: 出荷する明細がありません';
  end if;

  -- 納期を確定にする（送り状を入れる前に行う。送り状がある受注の納期はトリガーで変えられないため）
  if v_order.due_date_type <> '確定' then
    if p_due_date is null then
      raise exception 'DUE_DATE_REQUIRED: 納期を確定にしてください (受注No.=%)', v_order.order_no;
    end if;
    update public.orders
    set due_date_type = '確定', due_date = p_due_date, updated_at = now()
    where id = p_order_id;
  end if;

  v_shipment_no := private.issue_shipment_no(p_order_id, v_order.order_no);

  insert into public.shipments (order_id, shipment_no, shipped_date, created_by)
  values (p_order_id, v_shipment_no, p_shipped_date, auth.uid())
  returning id into v_shipment_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    -- この受注の明細であること
    select * into v_order_item
    from public.order_items
    where id = (v_item ->> 'order_item_id')::uuid and order_id = p_order_id;
    if not found then
      raise exception 'SHIPMENT_ITEM_INVALID: この受注の明細ではありません';
    end if;

    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'SHIPMENT_ITEM_INVALID: 出荷数量は 1 以上にしてください (行 %)', v_order_item.line_no;
    end if;

    -- 実重量の合計。受注の明細に 1 枚あたりの実重量があれば、それを使う（画面の入力は使わない）
    if v_order_item.actual_weight is not null then
      v_weight := round(v_order_item.actual_weight * v_quantity, 2);
    else
      v_piece_weight := nullif(v_item ->> 'piece_weight', '')::numeric;
      if v_piece_weight is not null and v_piece_weight <= 0 then
        raise exception 'SHIPMENT_ITEM_INVALID: 実重量は正の数にしてください (行 %)', v_order_item.line_no;
      end if;
      v_weight := case when v_piece_weight is null then null else round(v_piece_weight * v_quantity, 2) end;
    end if;

    -- 同じ明細を 2 回送ってきたら、一意の制約（shipment_items_shipment_item_key）で止まる
    insert into public.shipment_items (shipment_id, order_item_id, quantity, weight)
    values (v_shipment_id, v_order_item.id, v_quantity, v_weight);
  end loop;

  -- 出荷の合計が受注数量を超えていないか（今回の分を入れた後で、明細ごとに確かめる）
  if exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.quantity < (
        select coalesce(sum(si.quantity), 0) from public.shipment_items si where si.order_item_id = oi.id
      )
  ) then
    raise exception 'SHIPMENT_EXCEEDS_ORDER: 出荷数量の合計が受注数量を超えています (受注No.=%)', v_order.order_no;
  end if;

  perform private.refresh_order_shipment_status(p_order_id);
  return v_shipment_no;
end;
$$;

comment on function public.create_shipment(uuid, timestamptz, date, jsonb, date) is
  '送り状を発行する。出荷数量の合計が受注数量を超えないかを確かめ、確定でない納期は確定にし、受注の状態を付け直す。事務・管理者だけ。';


-- ============================================================
-- 5. 送り状を取り消す
-- ============================================================
-- 送り状と送り状の明細を消し（物理削除）、受注の状態を出荷の実績から付け直す。
-- 番号のカウンターは戻さない（取り消した番号は使い回さない）。確定にした納期も戻さない。
-- 仕入がある送り状は削除できないようにする確かめは、仕入入力を作るときにここへ足す。
-- 戻り値は取り消した送り状の受注No.（画面で、受注の画面へ戻るのに使う）。
-- エラーの印: SHIPMENT_NOT_FOUND
create or replace function public.delete_shipment(p_shipment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_no text;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '送り状を取り消せるのは事務・管理者だけです';
  end if;

  select order_id into v_order_id from public.shipments where id = p_shipment_id;
  if v_order_id is null then
    raise exception 'SHIPMENT_NOT_FOUND: 送り状が見つかりません（すでに取り消されています）';
  end if;

  -- 発行と同じく受注の行をロックしてから消す（同じ受注の発行と取り消しが重ならないようにするため）
  select order_no into v_order_no from public.orders where id = v_order_id for update;

  -- ロックを待つ間に、ほかの人が取り消していたら断る
  if not exists (select 1 from public.shipments where id = p_shipment_id) then
    raise exception 'SHIPMENT_NOT_FOUND: 送り状が見つかりません（すでに取り消されています）';
  end if;

  delete from public.shipment_items where shipment_id = p_shipment_id;
  delete from public.shipments where id = p_shipment_id;

  perform private.refresh_order_shipment_status(v_order_id);
  return v_order_no;
end;
$$;

comment on function public.delete_shipment(uuid) is
  '送り状を取り消す（物理削除）。受注の状態を出荷の実績から付け直す。番号と確定にした納期は戻さない。事務・管理者だけ。';

revoke execute on function public.create_shipment(uuid, timestamptz, date, jsonb, date) from public, anon;
revoke execute on function public.delete_shipment(uuid) from public, anon;
grant execute on function public.create_shipment(uuid, timestamptz, date, jsonb, date) to authenticated;
grant execute on function public.delete_shipment(uuid) to authenticated;


-- ============================================================
-- 6. RLS・権限
-- ============================================================
-- 送り状の書き込みは create_shipment・delete_shipment だけにする（採番・数量の確かめ・状態の付け直しを必ず通すため）。
-- 直接の登録・更新・削除のポリシー（20260919130000_create_rls_policies.sql）を消し、参照のポリシーだけを残す。
drop policy shipments_insert_office_admin on public.shipments;
drop policy shipments_update_office_admin on public.shipments;
drop policy shipments_delete_admin on public.shipments;
drop policy shipment_items_insert_office_admin on public.shipment_items;
drop policy shipment_items_update_office_admin on public.shipment_items;
drop policy shipment_items_delete_admin on public.shipment_items;

-- この 2 つのテーブルは受付より前に作り、Data API の設定画面で公開していたため、anon にも権限が付いていることがある。
-- 受付のマイグレーションと同じく、いったんすべて外してから、authenticated に参照だけを付け直す
revoke all on table public.shipments from anon, authenticated;
revoke all on table public.shipment_items from anon, authenticated;
grant select on table public.shipments to authenticated;
grant select on table public.shipment_items to authenticated;
