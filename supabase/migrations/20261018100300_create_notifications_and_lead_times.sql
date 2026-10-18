-- 通知と目安納期（docs/intake/table-design.md「notifications / notification_reads」「目安納期」）。
--
--   ・notifications       新着の通知。部署（dept）ごとに作る。アプリからは書かず、トリガーが作る
--   ・notification_reads  既読（ユーザーごと）。未読 = 自分の部署の通知のうち、自分の既読の行がないもの
--   ・lead_time_items     目安納期（部署ごとの工程と、営業日・混雑度）
--   ・lead_time_messages  部署ごとのメッセージ（表示期限つき）
--   ・lead_time_history   目安納期の更新履歴
--
-- RLS と権限は 20261018100500_create_intake_rls_and_realtime.sql でまとめて付ける。


-- ============================================================
-- 1. 通知
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- 通知先の部署（users.department と同じ値。受付の新着は shearing）
  dept text not null check (dept in ('sales', 'processing', 'shearing', 'delivery', 'general')),
  -- 通知の種類（受付の新着は intake_new）
  kind text not null,
  intake_id uuid references public.intakes (id),
  -- 表示する文（例: 新しいメールが届きました／差出人・件名）
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

comment on table public.notifications is
  '新着の通知。部署ごとに作り、その部署のユーザー全員に届く。トリガー（security definer）だけが書く。';

create index notifications_dept_idx on public.notifications (dept, created_at desc);

create table public.notification_reads (
  -- 通知を消すと既読の行も一緒に消える
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references public.users (id),
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

comment on table public.notification_reads is
  '通知の既読。ユーザーが通知を開いたら行を作る。';

-- 受付待ち（waiting）の受付が追加されたら、シャーリング部への通知を作る。
-- notifications はアプリから直接書かせない（insert の権限を付けない）ため、
-- security definer（関数所有者の権限）で書く
create or replace function public.intakes_notify_new()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'waiting' then
    insert into public.notifications (dept, kind, intake_id, title, body)
    values (
      'shearing',
      'intake_new',
      new.id,
      case new.channel
        when 'mail' then '新しいメールが届きました'
        when 'fax' then '新しいFAXが届きました'
        else '受付が追加されました'
      end,
      -- 差出人と件名（メールのとき）。どちらもなければ NULL にする
      nullif(
        coalesce(new.email_from, '')
          || case when new.email_subject is not null then '　' || new.email_subject else '' end,
        ''
      )
    );
  end if;
  return new;
end;
$$;

create trigger intakes_notify_new
  after insert on public.intakes
  for each row execute function public.intakes_notify_new();


-- ============================================================
-- 2. 目安納期
-- ============================================================
create table public.lead_time_items (
  id uuid primary key default gen_random_uuid(),
  -- 部署（processing 加工部 / shearing シャーリング部）
  dept text not null check (dept in ('processing', 'shearing')),
  -- 工程（切断・レーザーなど）
  name text not null,
  sort_order integer not null default 0,
  -- 営業日。要相談なら空でよい
  days integer check (days >= 0),
  -- 混雑度（normal 通常 / busy やや混雑 / crowded 混雑 / consult 要相談）
  congestion text not null default 'normal'
    check (congestion in ('normal', 'busy', 'crowded', 'consult')),
  -- 補足（ホームには出さない）
  note text,
  updated_by uuid references public.users (id),
  updated_at timestamptz not null default now(),
  constraint lead_time_items_dept_name_key unique (dept, name)
);

comment on table public.lead_time_items is
  '目安納期。部署ごとの工程の営業日と混雑度。ホームと納期連絡の画面に表示する。';

create trigger lead_time_items_touch
  before update on public.lead_time_items
  for each row execute function public.intake_touch_row();

create table public.lead_time_messages (
  dept text primary key check (dept in ('processing', 'shearing')),
  message text,
  -- 表示期限（この日を過ぎたら表示しない）
  expires_on date,
  updated_by uuid references public.users (id),
  updated_at timestamptz not null default now()
);

comment on table public.lead_time_messages is
  '目安納期の部署ごとのメッセージ（表示期限つき）。';

create trigger lead_time_messages_touch
  before update on public.lead_time_messages
  for each row execute function public.intake_touch_row();

create table public.lead_time_history (
  id uuid primary key default gen_random_uuid(),
  dept text not null check (dept in ('processing', 'shearing')),
  -- 変更の要約（例: レーザー 3→2営業日、メッセージを更新）
  summary text not null,
  changed_by uuid default auth.uid() references public.users (id),
  changed_at timestamptz not null default now()
);

comment on table public.lead_time_history is
  '目安納期の更新履歴。';

create index lead_time_history_dept_idx on public.lead_time_history (dept, changed_at desc);

-- 初期データ: 加工部 = 切断・穴あけ・プレス・DS・ショット・CT、シャーリング部 = レーザー・プラズマ。
-- 営業日（days）は空で入れ、納期連絡の画面で入れる
insert into public.lead_time_items (dept, name, sort_order) values
  ('processing', '切断', 1),
  ('processing', '穴あけ', 2),
  ('processing', 'プレス', 3),
  ('processing', 'DS', 4),
  ('processing', 'ショット', 5),
  ('processing', 'CT', 6),
  ('shearing', 'レーザー', 1),
  ('shearing', 'プラズマ', 2);

insert into public.lead_time_messages (dept) values ('processing'), ('shearing');
