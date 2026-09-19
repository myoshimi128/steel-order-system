-- auth.users にユーザーが作成されたとき、public.users にも行を追加するトリガー
--
-- ユーザー登録画面は作らず、管理者が Supabase の管理画面（Authentication）でユーザーを
-- 作成する運用とするため、public.users 側の行（role などの業務データ）もそのタイミングで
-- 自動的に作成する。これを忘れると auth.users にはユーザーがいるのに public.users に
-- 対応する行がなく、ログインはできてもロールが引けない、という不整合が起きる。
--
-- role の初期値は office とする。管理者アカウントや現場アカウントが必要な場合は、
-- 作成後にマスタ管理画面（または直接SQL）で role を更新する想定。

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, name, role)
  values (
    new.id,
    -- Supabase の管理画面でユーザーを作成する時点では氏名を入力する項目がないため、
    -- 仮の値としてメールアドレスを入れておく。氏名は事後にマスタ管理画面などで設定する想定。
    coalesce(new.email, new.id::text),
    'office'
  );
  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'auth.users に新規ユーザーが作成されたとき、public.users に role=office の行を自動作成する。';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
