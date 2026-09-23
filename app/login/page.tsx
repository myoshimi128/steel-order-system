import { LoginForm } from './login-form'

// ユーザー登録画面は作らない方針のため、ここにはログインフォームのみを置く
// （アカウントの作成は管理者が Supabase の管理画面で行う運用。
//  supabase/migrations の handle_new_auth_user トリガーが public.users 側の行を自動作成する）
//
// 見た目は Figma Make で作成したデザイン案を反映している。
// 対象解像度は 1280×1024 固定・レスポンシブ対応なし（docs/screen-design.md 共通方針）のため、
// 画面幅が変わる前提のスタイルは入れていない。
export default function LoginPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{
        backgroundColor: '#f4f6f8',
        // 薄いブループリント風の格子柄。業務システムらしさを出すための装飾で、
        // 機能には関係しない
        backgroundImage:
          'linear-gradient(rgba(100,130,160,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(100,130,160,0.07) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div className="w-full max-w-[360px]">
        {/* ロゴ・タイトル */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-2.5">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded border border-amber-500/25 bg-amber-500/[0.12]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="0.5" fill="#f59e0b" opacity="0.9" />
                <rect x="9" y="1" width="6" height="6" rx="0.5" fill="#f59e0b" opacity="0.5" />
                <rect x="1" y="9" width="6" height="6" rx="0.5" fill="#f59e0b" opacity="0.5" />
                <rect x="9" y="9" width="6" height="6" rx="0.5" fill="#f59e0b" opacity="0.25" />
              </svg>
            </div>
            <h1 className="text-[26px] font-bold tracking-[0.06em] text-[#1a2e42]">
              鋼材受注システム
            </h1>
          </div>
          <p className="text-xs tracking-[0.15em] text-[#7a9ab4]">
            Steel Order Management
          </p>
        </div>

        {/* フォームカード */}
        <div className="rounded-md border border-[rgba(100,130,160,0.15)] bg-white px-7 py-8 shadow-[0_4px_24px_rgba(20,50,80,0.08)]">
          <LoginForm />
        </div>

        <p className="mt-7 text-center text-[10px] tracking-[0.05em] text-[#aabccc]">
          Steel Order Management System
        </p>
      </div>
    </main>
  )
}
