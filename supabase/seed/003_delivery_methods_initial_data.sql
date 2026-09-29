-- 配達方法マスタ（delivery_methods）の初期データ。
--
-- 前提: マイグレーション 20260929100000_add_master_numbers_and_delivery_methods.sql が適用済みであること。
-- number は受注登録画面の配達の番号（docs/screen-design.md「番号の一覧」）。
-- requires_note は、選んだときに文字の入力欄を出すか（フリーのみ true）。
--
-- 同じ番号の行が既にある場合は何もしない（on conflict do nothing）ため、
-- 誤って 2 回実行しても重複して登録されない。

insert into public.delivery_methods (number, name, requires_note) values
  (0, '宵積み',   false),
  (2, '2便',      false),
  (3, '置場引取', false),
  (4, '営業配達', false),
  (5, '横持ち',   false),
  (6, '宅急便',   false),
  (9, 'フリー',   true)
on conflict (number) do nothing;
