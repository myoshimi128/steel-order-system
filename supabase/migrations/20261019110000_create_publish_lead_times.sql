-- 納期連絡の「ホームに公開」で使う関数（docs/intake/table-design.md「関数」、docs/intake/screen-design.md「S-03 納期連絡」）。
--
--   ・publish_lead_times(dept, items, summary, message, expires_on, expected_history_id)
--       工程ごとの目安納期（lead_time_items）・部署メッセージ（lead_time_messages）を書き換え、
--       更新履歴（lead_time_history）に要約を 1 行残す。新しい履歴の id を返す
--
-- 3 つのテーブルを 1 つの関数（= 1 つの transaction）で書くのは、途中で失敗したときに
-- 「工程は変わったのに履歴が残らない」のような半端な状態を作らないためである。
--
-- 実行の手順:
--   1. SQL Editor でこのファイルを実行する
--   2. npm run db:types で型を再生成する（supabase.rpc('publish_lead_times', ...) の型が入る）
--   3. 確認・デモ用に、必要なら seed 007（目安納期のデモの値）・008（通知の確認）を実行する（本番の DB では実行しない）
--   テーブルは増えないため、Data API の設定画面での確認は不要


-- ============================================================
-- 目安納期の公開
-- ============================================================
-- 引数:
--   p_dept                 部署（processing 加工部 / shearing シャーリング部）
--   p_items                工程の一覧（画面の並び順）。jsonb の配列で、1 件は次の形:
--                            { "id": 既存の工程の id（新しく追加した工程は null）,
--                              "name": 工程の名前（新しく追加した工程だけ使う）,
--                              "days": 営業日（整数。要相談・未入力は null）,
--                              "congestion": 'normal' | 'busy' | 'crowded' | 'consult',
--                              "note": 補足（空は null） }
--                          その部署の既存の工程は、すべて入れて渡す（工程の削除はできないため）
--   p_summary              履歴に残す要約（例: レーザー 3→2営業日、メッセージを更新）。画面側で作る（lib/lead-time/summary.ts）
--   p_message              部署メッセージ（空は null）
--   p_expires_on           メッセージの表示期限（この日まで表示する。空は期限なし）
--   p_expected_history_id  画面を開いた時点の、その部署の最新の履歴の id（履歴がなければ null）
--
-- 空にできる 3 つの引数には初期値 null を付けて、後ろに並べる。
-- 型の生成（npm run db:types）で「省略できる引数」になり、画面側では空のときに引数ごと省いて渡せるためである
-- （初期値のない引数は、生成した型で null を渡せない）
--
-- 画面を開いた後にほかの人が公開していたら（最新の履歴が変わっていたら）、上書きせずにエラーにする。
-- 気づかずにほかの人の変更を消してしまうのを防ぐためである。
-- エラーの文の先頭の「LEAD_TIME_CONFLICT」で、画面側がこのエラーを見分ける（app/(main)/shearing/lead-time/actions.ts）。
--
-- security invoker（呼び出したユーザーの権限で実行）にして、目安納期の RLS（登録・更新は事務・管理者だけ）をそのまま効かせる。
-- ただし RLS で update が弾かれると「0 行を更新した」になるだけでエラーにならないため、ロールは先に関数の中でも確かめる。
create or replace function public.publish_lead_times(
  p_dept text,
  p_items jsonb,
  p_summary text,
  p_message text default null,
  p_expires_on date default null,
  p_expected_history_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_latest_history_id uuid;
  v_history_id uuid;
  -- 1 件の工程（jsonb）と、配列の中の順番（1 から）
  r record;
  v_days integer;
  v_congestion text;
  v_name text;
  v_existing_count integer;
  v_given_count integer;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '納期連絡を公開できるのは、事務・管理者だけです';
  end if;

  if p_dept not in ('processing', 'shearing') then
    raise exception '部署が正しくありません (dept=%)', p_dept;
  end if;

  if p_summary is null or btrim(p_summary) = '' then
    raise exception '変更の要約がありません';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception '工程の一覧が正しくありません';
  end if;

  -- 同じ部署の公開を、同時に 2 人が行ったときに順番に処理するため、部署メッセージの行をロックする。
  -- 先に公開した人の transaction が終わるまで、後の人はここで待つ。
  -- 行がない（初期データを消した）場合に備えて、先に作っておく
  insert into public.lead_time_messages (dept) values (p_dept)
  on conflict (dept) do nothing;
  perform 1 from public.lead_time_messages where dept = p_dept for update;

  -- ほかの人が先に公開していないか（画面を開いた時点の最新の履歴と同じか）
  select id into v_latest_history_id
  from public.lead_time_history
  where dept = p_dept
  order by changed_at desc, id desc
  limit 1;

  if v_latest_history_id is distinct from p_expected_history_id then
    raise exception 'LEAD_TIME_CONFLICT: ほかの人が先に公開しました';
  end if;

  -- 既存の工程がすべて渡されているか（工程の削除はできないため、欠けていたら誤り）
  select count(*) into v_existing_count from public.lead_time_items where dept = p_dept;
  select count(*) into v_given_count
  from jsonb_array_elements(p_items) as e(value)
  where e.value ->> 'id' is not null
    and exists (
      select 1 from public.lead_time_items i
      where i.id = (e.value ->> 'id')::uuid and i.dept = p_dept
    );
  if v_given_count <> v_existing_count then
    raise exception '工程の一覧が最新ではありません。画面を開き直してください';
  end if;

  -- 工程を 1 件ずつ書く。with ordinality は「配列の何番目か」を一緒に取り出す書き方で、並び順（sort_order）に使う
  for r in
    select e.value as item, e.ordinality as ord
    from jsonb_array_elements(p_items) with ordinality as e(value, ordinality)
  loop
    v_congestion := coalesce(r.item ->> 'congestion', 'normal');
    -- 要相談のときは日数を持たない（ホームでは「—」を出す）
    v_days := case when v_congestion = 'consult' then null else (r.item ->> 'days')::integer end;

    if v_days is not null and (v_days < 0 or v_days > 99) then
      raise exception '目安日数は 0〜99 の整数で入れてください (%)', v_days;
    end if;

    if r.item ->> 'id' is null then
      -- 新しく追加した工程
      v_name := btrim(coalesce(r.item ->> 'name', ''));
      if v_name = '' then
        raise exception '追加する工程の名前を入れてください';
      end if;
      insert into public.lead_time_items (dept, name, sort_order, days, congestion, note, updated_by)
      values (p_dept, v_name, r.ord, v_days, v_congestion,
              nullif(btrim(r.item ->> 'note'), ''), auth.uid());
    else
      -- 既存の工程。名前は変えない（工程の名前の変更・削除・非表示は、必要になったら追加する）
      update public.lead_time_items
      set sort_order = r.ord,
          days = v_days,
          congestion = v_congestion,
          note = nullif(btrim(r.item ->> 'note'), '')
      where id = (r.item ->> 'id')::uuid and dept = p_dept;
    end if;
  end loop;

  -- 部署メッセージ。updated_at・updated_by はトリガー（intake_touch_row）が入れる
  update public.lead_time_messages
  set message = nullif(btrim(p_message), ''),
      expires_on = p_expires_on
  where dept = p_dept;

  -- 更新履歴。changed_by は列の初期値（auth.uid()）で、公開した人が入る
  insert into public.lead_time_history (dept, summary)
  values (p_dept, btrim(p_summary))
  returning id into v_history_id;

  return v_history_id;
end;
$$;

comment on function public.publish_lead_times(text, jsonb, text, text, date, uuid) is
  '納期連絡の「ホームに公開」。工程の目安納期・部署メッセージを書き換え、更新履歴を 1 行残す。ほかの人が先に公開していたらエラー。security invoker。';

-- 実行の権限は authenticated にだけ付ける（public・anon からは外す）
revoke execute on function public.publish_lead_times(text, jsonb, text, text, date, uuid) from public, anon;
grant execute on function public.publish_lead_times(text, jsonb, text, text, date, uuid) to authenticated;
