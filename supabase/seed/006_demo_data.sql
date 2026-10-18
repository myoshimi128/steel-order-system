-- 確認・デモ用のサンプルデータ（架空の得意先・納入先・スタンプ・注意事項・受付）。
--
-- ※ デモ・確認用の DB だけで実行する。本番の DB では実行しないこと。
--    受付は採番の関数で受付No. を振るため、実行すると受付No. の連番を使う（26-0001 から順に）。
--
-- 前提: マイグレーション 20261018100000〜20261018100600（受付のテーブル・関数）と seed 003（配達方法）が適用済みであること。
--
-- 名前・アドレスはすべて架空のもの。コードは今のマスタと重ならないよう 9001〜 を使う。
--   ・得意先・納入先: コード 9001〜9005。同じコードの行がすでにあれば入れない
--   ・スタンプ: 番号 91〜94。同じ番号の行がすでにあれば入れない
--   ・得意先の注意事項: 同じ得意先・同じ文の行がすでにあれば入れない
--   ・受付: メモが「【デモ】」で始まる受付が 1 件でもあれば、受付は入れない（2 回実行しても増えない）
--
-- 受付は、画面と同じ流れになるよう関数（register_intake・complete_split など）で状態を進める。
-- SQL Editor ではログインしていないため auth.uid() が NULL になり、担当者・登録者などは空になる。
-- ファイル（intake_files）は、Storage に実物を置けないため入れない。


-- ============================================================
-- 1. 得意先・納入先
-- ============================================================
-- code に一意制約がないため、on conflict ではなく「同じコードがなければ入れる」で重複を防ぐ
insert into public.customers (code, name, name_kana)
select v.code, v.name, v.name_kana
from (values
  ('9001', 'サンプル製作所', 'サンプルセイサクショ'),
  ('9002', 'テスト鉄工 株式会社', 'テストテッコウ'),
  ('9003', 'デモ建設 株式会社', 'デモケンセツ'),
  ('9004', '見本工業 株式会社', 'ミホンコウギョウ'),
  ('9005', '例示機械 有限会社', 'レイジキカイ')
) as v (code, name, name_kana)
where not exists (select 1 from public.customers c where c.code = v.code);

insert into public.delivery_destinations (code, name, name_kana, address, area)
select v.code, v.name, v.name_kana, v.address, v.area
from (values
  ('9001', 'サンプル製作所 第二工場', 'サンプルセイサクショダイニコウジョウ', '架空県見本市東町 1-2-3', '東部'),
  ('9002', 'デモ建設 駅前ビル新築工事 現場', 'デモケンセツエキマエビル', '架空県見本市駅前 4-5', '中央'),
  ('9003', 'テスト鉄工 資材置場', 'テストテッコウシザイオキバ', '架空県例示町西 6-7-8', '西部'),
  ('9004', '見本工業 南工場', 'ミホンコウギョウミナミコウジョウ', '架空県見本市南町 9-10', '南部'),
  ('9005', '例示倉庫 株式会社', 'レイジソウコ', '架空県例示町北 11-12', '北部')
) as v (code, name, name_kana, address, area)
where not exists (select 1 from public.delivery_destinations d where d.code = v.code);


-- ============================================================
-- 2. スタンプと、得意先の指定スタンプ
-- ============================================================
insert into public.stamps (number, body) values
  (91, '錆止め不要'),
  (92, '端材返却'),
  (93, '製品に番号を記入'),
  (94, '検査成績書添付')
on conflict (number) do nothing;

-- サンプル製作所（9001）は「端材返却」、テスト鉄工（9002）は「検査成績書添付」を指定スタンプにする
insert into public.customer_stamps (customer_id, stamp_id)
select c.id, s.id
from (values ('9001', 92), ('9002', 94)) as v (customer_code, stamp_number)
join public.customers c on c.code = v.customer_code
join public.stamps s on s.number = v.stamp_number
on conflict (customer_id, stamp_id) do nothing;


-- ============================================================
-- 3. 得意先の注意事項
-- ============================================================
-- 切断方法の条件（cutting_method）が空の行は、その得意先の受注すべてに表示する。
-- 条件がある行は、受注のどこかの材料の行がその切断方法のときだけ表示する
insert into public.notices (customer_id, cutting_method, body, priority)
select c.id, v.cutting_method, v.body, v.priority
from (values
  ('9001', null, '端材はすべて返却する（引取りは月末にまとめて）', 1),
  ('9001', 'レーザー', 'レーザー切断の製品はバリを取ってから出荷する', 0),
  ('9002', null, '納品書に工事名を必ず記入する', 0),
  ('9003', 'ガス', 'ガス切断の製品は切断面のスラグを落とす', 0)
) as v (customer_code, cutting_method, body, priority)
join public.customers c on c.code = v.customer_code
where not exists (
  select 1 from public.notices n where n.customer_id = c.id and n.body = v.body
);


-- ============================================================
-- 4. 受付（各状態を 1〜2 件ずつ）
-- ============================================================
-- do ブロック（その場で実行する無名の手続き）で、受付を作ってから関数で状態を進める
do $$
declare
  v_honsha uuid := (select id from public.sites where code = 'honsha');
  v_site_a uuid := (select id from public.sites where code = 'a');
  -- 配達「0 宵積み」（seed 003 がなければ NULL のまま）
  v_method uuid := (select id from public.delivery_methods where number = 0);
  v_c1 uuid := (select id from public.customers where code = '9001' order by id limit 1);
  v_c2 uuid := (select id from public.customers where code = '9002' order by id limit 1);
  v_c3 uuid := (select id from public.customers where code = '9003' order by id limit 1);
  v_c4 uuid := (select id from public.customers where code = '9004' order by id limit 1);
  v_d2 uuid := (select id from public.delivery_destinations where code = '9002' order by id limit 1);
  v_d5 uuid := (select id from public.delivery_destinations where code = '9005' order by id limit 1);
  v_id uuid;
  v_unit uuid;
begin
  if exists (select 1 from public.intakes where memo like '【デモ】%') then
    raise notice 'デモの受付はすでにあるため、受付は入れませんでした';
    return;
  end if;

  -- --- 受付待ち（メール） ---
  insert into public.intakes (channel, received_at, email_from, email_subject, memo)
  values ('mail', now() - interval '20 minutes', 'order@example.com',
          '注文書送付の件（サンプル製作所）', '【デモ】受付待ち（メール）');

  -- --- 受付待ち（FAX） ---
  insert into public.intakes (channel, received_at, memo)
  values ('fax', now() - interval '1 hour', '【デモ】受付待ち（FAX）');

  -- --- 受付登録済（振り分け待ち）。入れ先は「売り先と同じ」と納入先 9002 の 2 つ ---
  insert into public.intakes (
    channel, received_at, intake_date, customer_id, customer_contact, project_name,
    due_date_type, due_date, delivery_method_id, is_urgent, site_id, memo
  )
  values (
    'mail', now() - interval '3 hours', current_date, v_c3, '工事部 担当者', '駅前ビル新築工事',
    '確定', current_date + 7, v_method, false, v_honsha, '【デモ】受付登録済（振り分け待ち）'
  )
  returning id into v_id;
  insert into public.intake_destinations (intake_id, seq, destination_id)
  values (v_id, 1, null), (v_id, 2, v_d2);
  perform public.register_intake(v_id);

  -- --- 振り分け完了（先寸は受注登録待ち、アイトレは CAD 作業待ち）＋ 見落とし追加 ---
  insert into public.intakes (
    channel, received_at, intake_date, customer_id, project_name,
    due_date_type, due_date, delivery_method_id, is_urgent, site_id, memo
  )
  values (
    'mail', now() - interval '1 day', current_date - 1, v_c1, '架台製作',
    '仮納期', current_date + 5, v_method, true, v_honsha, '【デモ】振り分け完了（至急・先寸＋アイトレ）'
  )
  returning id into v_id;
  insert into public.intake_destinations (intake_id, seq, destination_id) values (v_id, 1, null);
  perform public.register_intake(v_id);
  -- 図面なしの区分として先寸・アイトレを作る（ファイルは入れないため）
  perform public.complete_split(v_id, array['sakisun', 'aitore']);
  perform public.add_work_unit(v_id, 'sakisun', 'oversight', '振り分けで 1 枚見落とし');

  -- --- 振り分け完了（アイトレは CAD 作業中） ---
  insert into public.intakes (
    channel, received_at, intake_date, customer_id, project_name,
    due_date_type, delivery_method_id, is_urgent, site_id, memo
  )
  values (
    'fax', now() - interval '2 days', current_date - 2, v_c2, '設備更新工事',
    '後報', v_method, false, v_site_a, '【デモ】振り分け完了（アイトレ CAD 作業中）'
  )
  returning id into v_id;
  insert into public.intake_destinations (intake_id, seq, destination_id) values (v_id, 1, v_d5);
  perform public.register_intake(v_id);
  perform public.complete_split(v_id, array['aitore']);
  update public.work_units set status = 'cad_working' where intake_id = v_id;

  -- --- 完了（先寸を起票完了） ---
  insert into public.intakes (
    channel, received_at, intake_date, customer_id, project_name,
    due_date_type, due_date, delivery_method_id, site_id, memo
  )
  values (
    'verbal', now() - interval '3 days', current_date - 3, v_c4, '補修部材',
    '最短出荷', null, v_method, v_honsha, '【デモ】完了（電話での注文）'
  )
  returning id into v_id;
  insert into public.intake_destinations (intake_id, seq, destination_id) values (v_id, 1, null);
  perform public.register_intake(v_id);
  perform public.complete_split(v_id, array['sakisun']);
  select id into v_unit from public.work_units where intake_id = v_id;
  perform public.complete_work_unit(v_unit);

  -- --- 見積・ミルシート（受付No. を採番して区分する） ---
  insert into public.intakes (channel, received_at, customer_id, email_from, email_subject, memo)
  values ('mail', now() - interval '5 hours', v_c1, 'estimate@example.com',
          '見積のお願い', '【デモ】見積・ミルシート')
  returning id into v_id;
  perform private.assign_intake_no(v_id);
  update public.intakes set status = 'estimate' where id = v_id;

  -- --- 対象外（関係のないメール） ---
  insert into public.intakes (channel, received_at, email_from, email_subject, memo)
  values ('mail', now() - interval '6 hours', 'info@example.com',
          'セミナーのご案内', '【デモ】対象外')
  returning id into v_id;
  update public.intakes set status = 'excluded' where id = v_id;

  -- 受付を作るたびに新着の通知ができるため、受付待ちのまま残る 2 件の分だけを残す
  delete from public.notifications n
  using public.intakes i
  where n.intake_id = i.id and i.memo like '【デモ】%' and i.status <> 'waiting';
end
$$;
