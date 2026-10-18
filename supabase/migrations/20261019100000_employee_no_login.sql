-- 社員No. でのログイン（docs/basic-design.md「ログイン」、docs/intake/basic-design.md「実装の順序」PR 4）。
--
-- 画面では社員No. とパスワードでログインする。Supabase Auth はメールアドレスでログインする仕組みのため、
-- 社員No. から決まった形のメールアドレス {社員No. を小文字にしたもの}@staff.invalid を作って渡す
-- （.invalid は実在しないことが保証されたドメインで、メールは送らない）。
-- アプリ側でメールアドレスを作る処理は lib/employee-login.ts。ドメインを変えるときは、両方を合わせて変える。
--
--   ・users.employee_no: 英大文字と数字で 1〜10 文字（例: U00001）。一意・必須
--   ・handle_new_auth_user(): ユーザーの作成時に、メールアドレスから社員No. を取り出して users の行を作る。
--     形の違うメールアドレスでは作らせない（エラーにする）
--
-- ============================================================
-- 実行の手順（docs/basic-design.md「ユーザーの作り方」にも同じ内容を書いている）
-- ============================================================
-- 今のテスト用のユーザー（メールアドレスでログインする形）は消して、社員No. の形で作り直す。
-- 社員No. の列を必須にするため、既存のユーザーを消してから、このマイグレーションを実行する。
--
-- 1. テスト用の受注と、それにつながるデータを消す（SQL Editor。テストデータなので消してよい）
--      受注・出荷は登録したユーザー（users）を参照しているため、先に消さないとユーザーを消せない
--
--      delete from public.shipment_items;
--      delete from public.shipments;
--      delete from public.attachments;
--      delete from public.order_stamps;
--      delete from public.order_item_processes;
--      delete from public.order_items;
--      delete from public.orders;
--
-- 2. 今のテスト用のユーザーを消す
--    2-1. SQL Editor で public.users の行を消す（auth.users を参照しているため、こちらを先に消す）
--
--      delete from public.users
--      where id in (select id from auth.users where email in ('a@test.jp', 'b@test.jp'));
--
--      外部キーのエラーになったら、エラーに出たテーブルの行（そのユーザーが作った行）を先に消すか、
--      その列を null にしてから、もう一度実行する
--    2-2. 管理画面の Authentication → Users で、a@test.jp・b@test.jp を選んで Delete user で消す
--
-- 3. このマイグレーションを SQL Editor で実行する
--
-- 4. 管理画面で新しいユーザーを作る
--    Authentication → Users → Add user → Create new user で、次の 2 人を作る。
--    「Auto Confirm User」にはチェックを入れる（確認のメールは届かないため、確認済みにしておく）
--      ・Email: u00001@staff.invalid  Password: （任意）
--      ・Email: u00002@staff.invalid  Password: （任意）
--    作るとトリガーが users の行を作る（社員No. は U00001・U00002、名前は仮に社員No.、ロールは office）。
--    「Database error creating new user」になったら、メールアドレスの形を確かめる
--
-- 5. 名前・ロール・部署・営業所を入れる（SQL Editor）
--
--      update public.users
--      set name = '管理 太郎', role = 'admin', department = 'shearing',
--          site_id = (select id from public.sites where code = 'honsha')
--      where employee_no = 'U00001';
--
--      update public.users
--      set name = '事務 花子', role = 'office', department = 'shearing',
--          site_id = (select id from public.sites where code = 'honsha')
--      where employee_no = 'U00002';
--
-- 6. ログイン画面で、社員No.（U00001。小文字・全角で打ってもよい）とパスワードでログインできることを確かめる。
--    ヘッダーに「本社シャーリング部 管理 太郎」と出れば完了。
--    間違ったパスワードや存在しない社員No. では「社員No. またはパスワードが正しくありません」と出る


-- ============================================================
-- 1. 社員No. の制約
-- ============================================================
-- ~ は正規表現での一致。^[A-Z0-9]{1,10}$ は「英大文字と数字だけで 1〜10 文字」
alter table public.users
  add constraint users_employee_no_key unique (employee_no),
  add constraint users_employee_no_format_check check (employee_no ~ '^[A-Z0-9]{1,10}$');

-- 社員No. のないユーザーはログインできないため必須にする。
-- 社員No. の入っていないユーザーが残っていると、ここで失敗する（上の手順 2 を先に行う）
alter table public.users alter column employee_no set not null;

comment on column public.users.employee_no is
  '社員No.（英大文字と数字で 1〜10 文字）。ログインに使う。ログイン用のメールアドレス {小文字にした社員No.}@staff.invalid から自動で入れる。';


-- ============================================================
-- 2. ユーザーの作成時のトリガーを作り直す
-- ============================================================
-- auth.users に行ができたとき（管理画面でユーザーを作ったとき）に、public.users の行を作る。
-- トリガー（on_auth_user_created）はそのままで、呼ぶ関数の中身だけを置き換える。
--
-- 受け取る値:
--   ・社員No.: メールアドレスの @ より前を大文字にしたもの（必ず）
--   ・名前・ロール・部署・営業所: raw_user_meta_data（ユーザーを作るときに付ける追加の情報。JSON）の
--     name・role・department・site（営業所の code: honsha / a / b）。
--     管理画面の「Create new user」では入れられないため、ふつうは空になり、
--     名前は社員No.、ロールは office、部署・営業所は空で作る（あとで SQL で入れる）
--
-- security definer にするのは、auth のスキーマのトリガーから public.users に書き込むため
-- （ユーザーを作る処理は public.users の権限を持たないロールで動く）。
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- メールアドレスは小文字にそろえてから調べる
  v_email text := lower(coalesce(new.email, ''));
  -- 追加の情報（なければ空の JSON）。->> は JSON の値を文字列で取り出す演算子
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_employee_no text;
  v_role text;
  v_department text;
  v_site_id uuid;
begin
  -- 決まった形（英小文字・数字 1〜10 文字 + @staff.invalid）でなければ、ユーザーを作らせない。
  -- \. は「.」そのもの（正規表現の . は任意の 1 文字の意味になるため）
  if v_email !~ '^[a-z0-9]{1,10}@staff\.invalid$' then
    raise exception 'ログイン用のメールアドレスは {社員No.}@staff.invalid の形で作成してください (%)', new.email;
  end if;

  -- split_part で @ の前を取り出し、大文字にして社員No. にする（u00001 → U00001）
  v_employee_no := upper(split_part(v_email, '@', 1));

  -- 決まった値のときだけ使い、それ以外は初期値にする
  v_role := case
    when v_meta ->> 'role' in ('office', 'factory', 'admin') then v_meta ->> 'role'
    else 'office'
  end;
  v_department := case
    when v_meta ->> 'department' in ('sales', 'processing', 'shearing', 'delivery', 'general')
      then v_meta ->> 'department'
    else null
  end;
  -- 営業所は code から id を引く（見つからなければ NULL のまま）
  select id into v_site_id from public.sites where code = v_meta ->> 'site';

  insert into public.users (id, employee_no, name, role, department, site_id)
  values (
    new.id,
    v_employee_no,
    -- 名前がなければ、仮に社員No. を入れておく（あとで SQL で直す）
    coalesce(nullif(btrim(v_meta ->> 'name'), ''), v_employee_no),
    v_role,
    v_department,
    v_site_id
  );
  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'auth.users に新規ユーザーが作成されたとき、メールアドレス（{社員No.}@staff.invalid）から社員No. を取り出して public.users の行を作る。';
