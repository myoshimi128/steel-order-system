-- ユーザーの部署（users.department）と所属する営業所（users.site_id）。
-- 受付〜受注登録の設計（docs/intake/table-design.md「users」）の最初のマイグレーション。
--
--   ・department: 部署。新着の通知（notifications）の宛先に使う
--       sales 営業部 / processing 加工部 / shearing シャーリング部 / delivery 配送部 / general 経理・総務
--   ・site_id: 所属する営業所。受付登録の加工場所の初期値と、ヘッダーの表示（「本社シャーリング部」）に使う
--   ・current_user_department(): ログイン中のユーザーの部署。通知の RLS で使う
--
-- どちらの列も空（NULL）を許す。既存のユーザーは空のまま入るため、実行後に下の SQL で値を入れる。
--
--   update public.users
--   set department = 'shearing',
--       site_id = (select id from public.sites where code = 'honsha')
--   where id = '（ユーザーの id）';
--
-- 社員No.（employee_no）の一意制約と、ユーザー作成時のトリガー（handle_new_auth_user）の作り直しは、
-- ログインを社員No. に切り替える PR（docs/intake/basic-design.md「実装の順序」PR 4）でまとめて行う。


-- ============================================================
-- 1. 列の追加
-- ============================================================
alter table public.users
  add column department text
    constraint users_department_check
    check (department in ('sales', 'processing', 'shearing', 'delivery', 'general')),
  add column site_id uuid references public.sites (id);

comment on column public.users.department is
  '部署（sales 営業部 / processing 加工部 / shearing シャーリング部 / delivery 配送部 / general 経理・総務）。通知の宛先に使う。';
comment on column public.users.site_id is
  '所属する営業所。受付登録の加工場所の初期値と、ヘッダーの表示に使う。';


-- ============================================================
-- 2. ログイン中のユーザーの部署
-- ============================================================
-- 通知（notifications）の RLS で「自分の部署の行だけ」を判定するのに使う。
-- current_user_role() と同じく security definer（関数所有者の権限で実行）にして、
-- users の RLS を経由せずに読む（RLS のポリシーの中から RLS のかかったテーブルを読むと、
-- 判定が入れ子になって遅くなったり、権限によっては読めなかったりするため）。
-- stable は「同じ transaction の中では同じ結果を返す」という印で、1 回の問い合わせの中で結果を使い回せる。
create or replace function public.current_user_department()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select department from public.users where id = auth.uid();
$$;

comment on function public.current_user_department() is
  'ログイン中ユーザー（auth.uid()）の部署を返す。通知の RLS から利用する。';

-- 実行できるのはログイン済みのユーザーだけにする（関数は作成時に public に実行権限が付くため外す）
revoke execute on function public.current_user_department() from public, anon;
grant execute on function public.current_user_department() to authenticated;
