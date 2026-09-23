import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'

// office/factory/admin が参照できるマスタ（docs/table-design.md RLS方針「マスタ各種」）
const MASTER_LINKS = [
  { href: '/masters/customers', label: '得意先' },
  { href: '/masters/delivery-destinations', label: '納入先' },
  { href: '/masters/materials', label: '材質' },
  { href: '/masters/products', label: '商品' },
  { href: '/masters/process-types', label: '加工種別' },
  { href: '/masters/manufacturers', label: 'メーカー' },
] as const

// マスタ管理のトップ。各マスタ一覧への入口をまとめる。
// 価格マスタは仕入単価を含み admin 以外は参照そのものができないため
// （docs/basic-design.md 権限設計）、リンクは admin にのみ表示する。
export default async function MastersPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-xl font-semibold">マスタ管理</h1>
      <ul className="flex flex-col gap-2">
        {MASTER_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded border border-neutral-300 px-4 py-3 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              {link.label}
            </Link>
          </li>
        ))}
        {isAdmin && (
          <li>
            <Link
              href="/masters/prices"
              className="block rounded border border-neutral-300 px-4 py-3 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              価格
            </Link>
          </li>
        )}
      </ul>
    </main>
  )
}
