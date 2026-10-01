-- 継手番号を任意にする変更と、入れ先の「売り先と同じ」（NULL）を許す変更。
--
-- 【1. 継手番号（orders.joint_no）を任意にする】
-- スプライス専用の受注でも継手番号は空欄のまま登録できるようにする。
-- 文字数は 4〜6 文字の制限をやめ、上限の 10 文字だけにする（長い番号もあるため）。
-- 空文字は保存せず NULL にする（アプリ側で空欄を NULL に変換して渡す）ため、入力した場合は 1〜10 文字。
-- ショットの有無（splice_shot）は、これまでどおりスプライス専用の受注では必須。
--
-- 【2. 入れ先（orders.delivery_destination_id）を NULL 可にする】
-- 入れ先が売り先と同じ場合は、受注登録画面の入れ先の欄で「0 売り先と同じ」（初期値）を選び、
-- delivery_destination_id を NULL で保存する。表示・印刷で NULL のときは、売り先の名前を入れ先として出す
-- （docs/screen-design.md「ヘッダー」）。
--
-- 【3. 納入先のコード（delivery_destinations.code）に「0」を使えなくする】
-- 「0」は受注登録画面の「0 売り先と同じ」に使うため、納入先のコードとは区別する
-- （メーカーの「0 指定なし」と同じ考え方。20260930100400_restrict_manufacturer_code.sql）。
--
-- 注意: 既存の納入先にコード「0」の行があると、このマイグレーションは失敗する。
-- 事前に次の SQL で確認し、マスタ画面でコードを直してから実行すること。
--   select id, code, name from public.delivery_destinations where code = '0';

-- 1. 継手番号: 既存のチェック制約を作り直す
alter table public.orders
  drop constraint orders_splice_columns_check;

alter table public.orders
  add constraint orders_splice_columns_check check (
    -- 通常の受注: 継手番号・ショットは持たない
    (not is_splice and joint_no is null and splice_shot is null)
    or (
      -- スプライス専用の受注: ショットは必須。継手番号は任意（入力する場合は 1〜10 文字）
      is_splice
      and (joint_no is null or char_length(joint_no) between 1 and 10)
      and splice_shot is not null
    )
  );

-- 2. 入れ先: NOT NULL を外す（外部キーはそのまま。NULL は「売り先と同じ」を表す）
alter table public.orders
  alter column delivery_destination_id drop not null;

comment on column public.orders.delivery_destination_id is
  '入れ先（納入先）。NULL は売り先と同じ（表示・印刷では売り先の名前を入れ先として出す）';

-- 3. 納入先のコード: 「0」を禁止する
alter table public.delivery_destinations
  add constraint delivery_destinations_code_not_zero_check check (code <> '0');
