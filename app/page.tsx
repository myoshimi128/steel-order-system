import Link from 'next/link'

// メインメニュー（簡易版）。
// docs/basic-design.md の画面構成:
//   メインメニュー
//     └ 鋼板切断（受注登録・受注管理 / 現場加工指示 / 送り状発行 / ミルシート作成）
//     └ マスタ管理
// のうち、現時点で実装済みなのはマスタ管理のみ。鋼板切断配下の画面は未実装のため
// リンクにはせずラベル表示のみとする。
export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <h1 className="text-xl font-semibold">メインメニュー</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          鋼板切断
        </h2>
        <p className="rounded border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
          受注登録・受注管理／現場加工指示／送り状発行（未実装）
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          マスタ管理
        </h2>
        <Link
          href="/masters"
          className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-neutral-900"
        >
          マスタ管理を開く
        </Link>
      </section>
    </main>
  )
}
