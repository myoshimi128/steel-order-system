import Link from 'next/link'

// シャーリング部の部署ホーム（仮）。
// ホームのメニューの「シャーリング部」から移る先として置く。
// 件数のカード（受付待ち・受注登録待ちなど）や部署内連絡を並べる本来の部署ホーム（docs/intake/screen-design.md「S-02」）は、
// 受付のテーブルができてから作る。今は、今ある画面への入口のボタンだけを並べる。
export default function ShearingHomePage() {
  return (
    <main className="flex-1 bg-canvas px-8 py-6">
      <p className="text-sm text-neutral-500">本社</p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">シャーリング部</h1>
        <div className="flex gap-3">
          <Link
            href="/orders/new"
            className="rounded bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
          >
            受注登録へ
          </Link>
          <Link
            href="/masters"
            className="rounded border border-line bg-white px-5 py-2 text-sm font-semibold text-navy hover:bg-navy-soft"
          >
            マスタ管理へ
          </Link>
        </div>
      </div>

      <p className="mt-8 rounded border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-neutral-500">
        受付待ち・受注登録待ちの件数や部署内連絡は、受付の機能を作ったあとにここへ表示します。
      </p>
    </main>
  )
}
