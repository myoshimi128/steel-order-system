-- 受付待ち一覧・受付登録で使う関数（docs/intake/table-design.md「関数」、docs/intake/screen-design.md「S-04a」「S-04c」）。
--
--   ・save_intake(intake_id, info, destinations, register)
--       受付の受注情報と入れ先を保存する。register = true なら、続けて受付登録（受付No. の採番）まで行う。
--       処理区分「0 新規」（受付待ち → 受付登録済）と「1 変更」（登録済みの受付を直す）で使う
--   ・classify_intake(intake_id, status)
--       受付待ちを「見積・ミルシート」「対象外」に区分する。対象外は受付待ちに戻せる
--   ・delete_intake(intake_id)
--       処理区分「2 削除」（論理削除）
--   ・claim_intake(intake_id) / release_intake(intake_id)
--       対応中の表示（誰かが開いている受付を、ほかの人の画面に出す。30 分で無効とみなす）
--
-- どれも security invoker（呼び出したユーザーの権限で実行）にして、受付の RLS（事務・管理者だけ）をそのまま効かせる。
-- ただし RLS で update が弾かれると「0 行を更新した」になるだけでエラーにならないため、
-- ロールは先に関数の中でも確かめる（publish_lead_times と同じ考え方）。
--
-- 実行の手順:
--   1. SQL Editor でこのファイルを実行する
--   2. npm run db:types で型を再生成する（関数の型は、生成と同じ形で lib/database.types.ts に先に入れてある）
--   3. 確認・デモ用に、必要なら seed 009（本文つきの受付待ち）を実行する（本番の DB では実行しない）
--   テーブルは増えないため、Data API の設定画面での確認は不要


-- ============================================================
-- 1. 受注情報の保存と受付登録
-- ============================================================
-- 引数:
--   p_intake_id     受付の id
--   p_info          受注情報（jsonb）。1 件は次の形（空の値は null）:
--                     { "intake_date": 'YYYY-MM-DD', "staff_id": uuid, "customer_id": uuid,
--                       "customer_contact": 文字, "project_name": 文字,
--                       "due_date_type": '確定' | '仮納期' | '後報' | '最短出荷', "due_date": 'YYYY-MM-DD',
--                       "delivery_method_id": uuid, "delivery_method_note": 文字,
--                       "site_id": uuid, "is_urgent": true | false }
--   p_destinations  入れ先の配列（jsonb。画面の並び順）。要素は納入先の id か、null（「0 売り先と同じ」）
--   p_register      true: 受付待ちの受付を登録する（0 新規）。false: 登録済みの受付を直す（1 変更）
--
-- 戻り値: 受付No.
--
-- 受注情報の保存・入れ先の入れ直し・採番を 1 つの関数（= 1 つの transaction）で行う。
-- 画面から「update してから register_intake を呼ぶ」と 2 回に分かれ、途中で失敗すると
-- 入れ先を消したまま入れ直せていない、のような半端な状態が残るためである。
create or replace function public.save_intake(
  p_intake_id uuid,
  p_info jsonb,
  p_destinations jsonb,
  p_register boolean default false
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_deleted_at timestamptz;
  v_no text;
  -- 入れ先の 1 件（jsonb）と、配列の中の順番（1 から）
  v_destination jsonb;
  v_seq bigint;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '受付を登録・変更できるのは事務・管理者だけです';
  end if;

  -- for update で受付の行をロックし、同じ受付への同時の保存を 1 件ずつにする
  select status, deleted_at, intake_no into v_status, v_deleted_at, v_no
  from public.intakes where id = p_intake_id
  for update;
  if not found or v_deleted_at is not null then
    raise exception '受付が見つかりません';
  end if;

  -- 0 新規は受付待ちだけ、1 変更は登録済み（振り分け待ち・振り分け完了・完了）だけを受け付ける
  if p_register and v_status <> 'waiting' then
    raise exception 'INTAKE_NOT_WAITING: この受付はすでに受付登録されています (状態=%)', v_status;
  end if;
  if not p_register and v_status not in ('registered', 'dispatched', 'closed') then
    raise exception 'この受付は変更できません (状態=%)', v_status;
  end if;

  if jsonb_typeof(p_destinations) is distinct from 'array' or jsonb_array_length(p_destinations) = 0 then
    raise exception '入れ先を 1 件以上入れてください';
  end if;

  -- 受注情報を書き込む。p_info ->> 'キー' は「jsonb から文字として取り出す」書き方。
  -- nullif(..., '') で空の文字を null にそろえる
  update public.intakes
  set intake_date = (p_info ->> 'intake_date')::date,
      staff_id = (p_info ->> 'staff_id')::uuid,
      customer_id = (p_info ->> 'customer_id')::uuid,
      customer_contact = nullif(btrim(p_info ->> 'customer_contact'), ''),
      project_name = nullif(btrim(p_info ->> 'project_name'), ''),
      due_date_type = p_info ->> 'due_date_type',
      due_date = (p_info ->> 'due_date')::date,
      delivery_method_id = (p_info ->> 'delivery_method_id')::uuid,
      delivery_method_note = nullif(btrim(p_info ->> 'delivery_method_note'), ''),
      site_id = (p_info ->> 'site_id')::uuid,
      is_urgent = coalesce((p_info ->> 'is_urgent')::boolean, false)
  where id = p_intake_id;

  -- 入れ先は消して入れ直す（並び順を画面のとおりにするため）。
  -- 同じ納入先・「売り先と同じ」の 2 行目は、一意の索引でエラーになる
  delete from public.intake_destinations where intake_id = p_intake_id;
  -- with ordinality で、配列の要素と一緒に順番（1, 2, 3 …）を受け取る
  for v_destination, v_seq in
    select value, ordinality from jsonb_array_elements(p_destinations) with ordinality
  loop
    insert into public.intake_destinations (intake_id, seq, destination_id)
    -- #>> '{}' は jsonb の値を文字として取り出す書き方（null の要素は null になる）
    values (p_intake_id, v_seq, (v_destination #>> '{}')::uuid);
  end loop;

  -- 0 新規: 受付登録（必須の確認 → 受付No. の採番 → registered・登録者の記録・対応中の解除）
  if p_register then
    v_no := public.register_intake(p_intake_id);
  end if;

  return v_no;
end;
$$;

comment on function public.save_intake(uuid, jsonb, jsonb, boolean) is
  '受付の受注情報と入れ先を保存する。p_register = true なら受付登録（受付No. の採番）まで行う。受付No. を返す。';


-- ============================================================
-- 2. 見積・ミルシート／対象外への区分
-- ============================================================
-- 受付待ち → 見積・ミルシート（estimate）: 受付No. を採番する（見積も後から番号で探せるようにするため。
--                                        DB の制約 intakes_no_required でも番号が必須）
-- 受付待ち → 対象外（excluded）           : 番号は振らない
-- 対象外   → 受付待ち（waiting）          : 「受付待ちに戻す」。対象外にしたのが間違いだったとき
-- 戻り値: 受付No.（見積・ミルシートのとき。それ以外は null）
create or replace function public.classify_intake(p_intake_id uuid, p_status text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_deleted_at timestamptz;
  v_no text;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '受付を区分できるのは事務・管理者だけです';
  end if;

  select status, deleted_at into v_status, v_deleted_at
  from public.intakes where id = p_intake_id
  for update;
  if not found or v_deleted_at is not null then
    raise exception '受付が見つかりません';
  end if;

  -- 許す状態の移り方だけを通す（docs/intake/table-design.md「受付（intakes.status）」の図）
  if not (
    (v_status = 'waiting' and p_status in ('estimate', 'excluded'))
    or (v_status = 'excluded' and p_status = 'waiting')
  ) then
    raise exception 'INTAKE_STATUS_CHANGED: この受付は区分を変えられません (状態=% → %)', v_status, p_status;
  end if;

  if p_status = 'estimate' then
    v_no := private.assign_intake_no(p_intake_id);
  end if;

  -- 区分したら対応中の表示も外す
  update public.intakes
  set status = p_status, handling_by = null, handling_at = null
  where id = p_intake_id;

  return v_no;
end;
$$;

comment on function public.classify_intake(uuid, text) is
  '受付待ちを見積・ミルシート（受付No. を採番）・対象外に区分する。対象外は受付待ちに戻せる。';


-- ============================================================
-- 3. 受付の削除（処理区分「2 削除」）
-- ============================================================
-- 受付登録した後に取り消すためのもの。deleted_at に日時を入れる論理削除で、行は残す。
-- 受付待ちのメールのうち注文でないものは「対象外」に区分する（削除ではない）ため、受付待ち・対象外は対象にしない。
-- 受注が 1 件でもある受付は削除できない。その確認は、受注と受付をつなぐ PR 9 のトリガー
-- （intakes_prevent_deleting_ordered）で行う（今は受注に受付の列がないため確かめられない）。
create or replace function public.delete_intake(p_intake_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_deleted_at timestamptz;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '受付を削除できるのは事務・管理者だけです';
  end if;

  select status, deleted_at into v_status, v_deleted_at
  from public.intakes where id = p_intake_id
  for update;
  if not found or v_deleted_at is not null then
    raise exception '受付が見つかりません';
  end if;
  if v_status not in ('registered', 'dispatched', 'closed', 'estimate') then
    raise exception 'この受付は削除できません (状態=%)', v_status;
  end if;

  update public.intakes set deleted_at = now() where id = p_intake_id;
end;
$$;

comment on function public.delete_intake(uuid) is
  '受付の論理削除（受付登録の処理区分「2 削除」）。受付登録済・振り分け完了・完了・見積の受付が対象。';


-- ============================================================
-- 4. 対応中の表示
-- ============================================================
-- 受付待ちの受付を開いたら、自分を「対応中の人」にする。
--   ・空いている、自分が対応中、または前の人が開いてから 30 分たっている → 自分にする（開始日時も今にする）
--   ・ほかの人が 30 分以内に開いている → 変えない
-- 戻り値: その後の対応中の人の id（自分か、ほかの人。受付待ちでない受付は null）
--
-- 条件つきの update 1 回で決めるため、2 人が同時に開いても、どちらか 1 人に決まる
-- （update は行をロックするため、後の人は前の人の update が終わってから条件を確かめる）。
-- 30 分は lib/intake/handling.ts の HANDLING_TIMEOUT_MINUTES と同じ値にする。
create or replace function public.claim_intake(p_intake_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_handling_by uuid;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '受付を開けるのは事務・管理者だけです';
  end if;

  update public.intakes
  set handling_by = auth.uid(), handling_at = now()
  where id = p_intake_id
    and status = 'waiting'
    and deleted_at is null
    and (
      handling_by is null
      or handling_by = auth.uid()
      or handling_at < now() - interval '30 minutes'
    );

  select handling_by into v_handling_by
  from public.intakes
  where id = p_intake_id and status = 'waiting' and deleted_at is null;

  return v_handling_by;
end;
$$;

comment on function public.claim_intake(uuid) is
  '受付待ちの受付を自分の対応中にする（空き・自分・30 分過ぎのとき）。その後の対応中の人の id を返す。';

-- 対応中を外す（ほかの行に移った・画面を閉じたとき）。自分が対応中のときだけ外す
create or replace function public.release_intake(p_intake_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.intakes
  set handling_by = null, handling_at = null
  where id = p_intake_id and handling_by = auth.uid();
end;
$$;

comment on function public.release_intake(uuid) is
  '受付の対応中を外す（自分が対応中のときだけ）。';


-- ============================================================
-- 5. 実行の権限
-- ============================================================
-- 関数は作った時点で public（全員）に実行の権限が付くため、外してから authenticated にだけ付ける
revoke execute on function
  public.save_intake(uuid, jsonb, jsonb, boolean),
  public.classify_intake(uuid, text),
  public.delete_intake(uuid),
  public.claim_intake(uuid),
  public.release_intake(uuid)
from public, anon;

grant execute on function
  public.save_intake(uuid, jsonb, jsonb, boolean),
  public.classify_intake(uuid, text),
  public.delete_intake(uuid),
  public.claim_intake(uuid),
  public.release_intake(uuid)
to authenticated;
