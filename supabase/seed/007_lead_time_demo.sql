-- 確認・デモ用の目安納期（ホームのカードと、納期連絡の画面の確認用）。
--
-- ※ デモ・確認用の DB だけで実行する。本番の DB では実行しないこと。
--
-- 前提: マイグレーション 20261018100300（目安納期のテーブルと初期データ）が適用済みであること。
--
-- 部署ごとに、一度も公開していない（更新履歴が 1 行もない）ときだけ入れる。
-- 納期連絡の画面で公開した内容を、デモの値で上書きしないためである（2 回実行しても変わらない）。
-- 更新履歴の「更新者」には、社員No. U00002 のユーザーを入れる（いなければ空）。
-- メッセージの表示期限は、実行した日（日本時間）の 7 日後にする。

do $$
declare
  v_user_id uuid;
  v_expires date := (now() at time zone 'Asia/Tokyo')::date + 7;
begin
  select id into v_user_id from public.users where employee_no = 'U00002';

  -- --- 加工部 ---
  if not exists (select 1 from public.lead_time_history where dept = 'processing') then
    update public.lead_time_items as i
    set days = v.days, congestion = v.congestion
    from (values
      ('切断', 3, 'normal'),
      ('穴あけ', 4, 'busy'),
      ('プレス', null::integer, 'consult'),
      ('DS', 5, 'normal'),
      ('ショット', 4, 'normal'),
      ('CT', 6, 'crowded')
    ) as v(name, days, congestion)
    where i.dept = 'processing' and i.name = v.name;

    update public.lead_time_messages
    set message = 'プレスは機械の入れ替えのため、今月末まで要相談です。CT は月末に集中しています。',
        expires_on = v_expires
    where dept = 'processing';

    insert into public.lead_time_history (dept, summary, changed_by)
    values ('processing', '【デモ】目安納期とメッセージを入れました', v_user_id);
  else
    raise notice '加工部はすでに公開しているため、デモの値は入れませんでした';
  end if;

  -- --- シャーリング部 ---
  if not exists (select 1 from public.lead_time_history where dept = 'shearing') then
    update public.lead_time_items as i
    set days = v.days, congestion = v.congestion, note = v.note
    from (values
      ('レーザー', 2, 'normal', '12mm以上は+1日'),
      ('プラズマ', 3, 'busy', null::text)
    ) as v(name, days, congestion, note)
    where i.dept = 'shearing' and i.name = v.name;

    update public.lead_time_messages
    set message = '3号機レーザーは点検のため、来週の午前に停止します。12mm以上は1日余裕をください。',
        expires_on = v_expires
    where dept = 'shearing';

    insert into public.lead_time_history (dept, summary, changed_by)
    values ('shearing', '【デモ】目安納期とメッセージを入れました', v_user_id);
  else
    raise notice 'シャーリング部はすでに公開しているため、デモの値は入れませんでした';
  end if;
end
$$;
