-- 受注番号（orders.order_no）の自動採番。
--
-- 形式: 年 2 桁 + 年内の連番 5 桁（例: 2600001 = 2026 年の 1 件目）。現行の受注番号と同じ形式。
-- 受注登録画面の処理区分「1 変更」「2 削除」で受注番号をテンキー入力して呼び出すため、数字だけにしている。
--
-- 仕組み:
--   ・年ごとの「最後に使った連番」を採番テーブル private.order_no_counters に持つ
--   ・採番関数 private.next_order_no() が、その年の連番を 1 進めて番号を返す
--   ・orders.order_no の初期値（default）をこの関数にする
--     → アプリは order_no を指定せずに insert すれば、自動で番号が入る
--
-- 年は「登録した日（日本時間）」の年とする。列の初期値の関数からは受注日（order_date）など
-- 同じ行のほかの列を参照できないため。DB のタイムゾーンは UTC のため、日本時間に変換してから年を取る
-- （変換しないと、1 月 1 日の 0〜9 時に登録した受注が前年の番号になってしまう）。


-- ============================================================
-- private スキーマ
-- ============================================================
-- Data API（PostgREST）で公開していないスキーマに置くことで、
-- 採番テーブルや採番関数をブラウザから直接呼べないようにする
-- （public に置くと RPC で呼ばれて番号が飛ぶおそれがある）。
create schema if not exists private;

-- ログイン済みユーザーが orders に insert するとき、列の初期値として採番関数が実行される。
-- そのため、スキーマの利用と関数の実行だけは authenticated に許可する（テーブルには権限を付けない）。
grant usage on schema private to authenticated;


-- ============================================================
-- 採番テーブル
-- ============================================================
create table private.order_no_counters (
  -- 西暦の下 2 桁（2026 年なら 26）
  year smallint primary key,
  -- その年に最後に使った連番
  last_no integer not null
);

-- RLS を有効にし、ポリシーは作らない。
-- ポリシーがないテーブルは、所有者以外（anon・authenticated など）からの読み書きがすべて拒否される。
-- 採番関数 private.next_order_no() は security definer（関数所有者＝このテーブルの所有者の権限）で
-- 実行されるため、RLS を有効にしても関数の中からは読み書きできる
-- （テーブルの所有者には RLS が適用されない。force row level security にするとこれが崩れるため指定しない）。
alter table private.order_no_counters enable row level security;

-- 念のため、テーブル自体の権限も anon・authenticated から外しておく
-- （private スキーマは Data API で公開していないが、権限の面でも直接操作できないようにする）
revoke all on table private.order_no_counters from anon, authenticated;


-- ============================================================
-- 採番関数
-- ============================================================
-- security definer（関数所有者の権限で実行）にして、呼び出したユーザーに
-- 採番テーブルへの権限がなくても（RLS で拒否されていても）連番を進められるようにする。
-- 関数所有者はこのマイグレーションを実行したロールで、採番テーブルの所有者と同じになる。
--
-- 同時に 2 件登録されても番号が重複しないよう、insert ... on conflict do update で
-- 連番を進める。この文は対象の行をロックするため、同じ年の採番は 1 件ずつ順番に処理される。
-- 登録が失敗して transaction が取り消された場合は、連番の更新も取り消される（番号は飛ばない）。
create or replace function private.next_order_no()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- 日本時間の今日の年の下 2 桁
  v_year smallint := (extract(year from (now() at time zone 'Asia/Tokyo'))::integer % 100)::smallint;
  v_no integer;
begin
  insert into private.order_no_counters (year, last_no)
  values (v_year, 1)
  on conflict (year) do update
    set last_no = private.order_no_counters.last_no + 1
  returning last_no into v_no;

  -- 連番は 5 桁まで。超えると番号の形式が崩れるため登録を止める
  if v_no > 99999 then
    raise exception '受注番号の連番が上限（99999）を超えました（%年）', v_year;
  end if;

  -- lpad で 0 埋めする（例: 26 と 1 → '26' || '00001' = '2600001'）
  return lpad(v_year::text, 2, '0') || lpad(v_no::text, 5, '0');
end;
$$;

comment on function private.next_order_no() is
  '受注番号（年2桁＋年内の連番5桁）を採番する。orders.order_no の初期値として使う。';

revoke execute on function private.next_order_no() from public;
grant execute on function private.next_order_no() to authenticated;


-- ============================================================
-- orders.order_no
-- ============================================================
alter table public.orders
  alter column order_no set default private.next_order_no(),
  add constraint orders_order_no_key unique (order_no);
