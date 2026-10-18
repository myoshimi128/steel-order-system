// ログイン画面のロゴとシステム名。
// ネイビーの四角にロゴのアイコン（ヘッダーと同じもの）を白で出し、その下にシステム名と英字の副題を置く。

import { Icon } from '@/components/layout/icon'

export function LoginBrand() {
  return (
    <div className="mb-8 flex flex-col items-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded bg-navy text-white">
        <Icon name="logo" className="h-6 w-6" />
      </span>
      <h1 className="text-2xl font-bold tracking-[0.08em] text-navy">鋼材受注システム</h1>
      <p className="mt-2 font-mono text-xs tracking-[0.2em] text-neutral-500">
        ORDER INTAKE &amp; MANAGEMENT
      </p>
    </div>
  )
}
