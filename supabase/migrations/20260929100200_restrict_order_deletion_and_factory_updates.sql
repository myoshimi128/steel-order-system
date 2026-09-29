-- 受注の論理削除の制限と、現場ロールの更新制限の見直し。
--
--   1. 出荷実績がある受注の論理削除（deleted_at の設定）を拒否するトリガーを作成する
--   2. 現場ロールが status 以外を更新できないようにするトリガー関数を作り直し、
--      後から追加された列（customer_contact と、今回追加した列）も対象に含める


-- ============================================================
-- 1. 出荷実績がある受注の削除を拒否する
-- ============================================================
-- 受注の削除は論理削除（orders.deleted_at に日時を入れる）とする。
-- 出荷実績（shipments）がある受注は削除できない（docs/table-design.md orders「論理削除」）。
-- 画面でも止めるが、画面を経由しない更新も含めて DB 側で必ず拒否する。
--
-- security definer にするのは、shipments の RLS に関係なく出荷実績の有無を
-- 確実に確認するため（呼び出したユーザーの権限で shipments が見えない場合でも判定できる）。
create or replace function public.prevent_deleting_shipped_orders()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 「削除されていない状態 → 削除済み」に変わる更新だけを確認する
  if old.deleted_at is null and new.deleted_at is not null then
    if exists (select 1 from public.shipments where order_id = new.id) then
      raise exception '出荷実績がある受注は削除できません（受注No. %）', new.order_no;
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_prevent_deleting_shipped
  before update on public.orders
  for each row
  execute function public.prevent_deleting_shipped_orders();


-- ============================================================
-- 2. 現場ロールの更新制限を作り直す
-- ============================================================
-- 20260919130000_create_rls_policies.sql で作成した関数は、作成時点の列を
-- 1 つずつ比較していたため、その後に追加された列（customer_contact、
-- 今回追加した is_splice・deleted_at など）は現場ロールでも更新できてしまう。
-- 列を列挙し直すと、今後も列を追加するたびに漏れが起きるため、
-- 「status 以外の列がすべて変わっていないか」を行全体の比較で確認する方式に変える。
--
-- to_jsonb(行) で行を JSON にし、- 'status' で status のキーを取り除いてから比較する。
-- updated_at はアプリ側で更新時刻を入れる可能性があるため、比較から除外する。
create or replace function public.restrict_orders_update_for_factory()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.current_user_role() = 'factory' then
    if (to_jsonb(new) - 'status' - 'updated_at')
       is distinct from (to_jsonb(old) - 'status' - 'updated_at')
    then
      raise exception '現場ロールは orders の status 列以外を更新できません';
    end if;
  end if;
  return new;
end;
$$;
-- トリガー（orders_restrict_factory_update）は既存のものがこの関数を呼ぶため、作り直しは不要
