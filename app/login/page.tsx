import { LoginBrand } from '@/components/login/login-brand'
import { LoginFooter } from '@/components/login/login-footer'
import { LoginForm } from '@/components/login/login-form'

// ログイン画面（docs/intake/screen-design.md「S-00 ログイン」）。見た目は画面イメージ「00 ログイン」に合わせる。
//   ・上にネイビーの帯、地は薄い格子柄
//   ・中央にロゴとシステム名、その下にログインのカード（上の縁がネイビー）
//   ・カードの下に注意書き、画面の下端に著作権の表示と問い合わせ先
//
// ユーザー登録の画面は作らない。ユーザーは管理者が Supabase の管理画面で
// {社員No.}@staff.invalid のメールアドレスで作る（docs/basic-design.md「ユーザーの作り方」）。
// 対象解像度は 1280×1024 固定・レスポンシブ対応なし（docs/screen-design.md 共通方針）。
export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen flex-col bg-canvas"
      style={{
        // 薄い格子柄（装飾）。28px ごとに縦横の細い線を引く
        backgroundImage:
          'linear-gradient(rgba(27,54,93,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(27,54,93,0.05) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* 上のネイビーの帯（共通レイアウトのヘッダーと同じ色） */}
      <div className="h-7 shrink-0 bg-navy" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <LoginBrand />

        {/* ログインのカード。上の縁だけネイビーの太い線にする */}
        <section className="w-[420px] rounded-md border border-line border-t-[3px] border-t-navy bg-white px-9 pt-8 pb-9 shadow-[0_2px_12px_rgba(20,40,70,0.06)]">
          <h2 className="mb-6 text-base font-bold text-neutral-900">ログイン</h2>
          <LoginForm />
        </section>

        <p className="mt-6 text-center text-xs leading-6 text-neutral-400">
          このシステムへのアクセスは許可された従業員のみに限定されています。
          <br />
          不正アクセスは社内規定および法令により処罰されます。
        </p>
      </main>

      <LoginFooter />
    </div>
  )
}
