'use client'

// CAD（S-05。docs/intake/screen-design.md「S-05 CAD」、画面イメージ 05）。
//   ・上: 説明・見出し・操作の結果のお知らせ／エラー
//   ・左: 加工場所のタブ（件数は作業待ち・作業中の数＝サイドメニューのバッジと同じ）、
//         その下に状態のタブ（作業待ち・作業中 / CSV 登録済）と一覧
//   ・右: 選んだ行のパネル（受付の情報・図面・注文書・CSV の枠）
// CSV を選ぶ画面（隠したファイルの欄）はここに 1 つだけ置き、一覧の行の「CSV を登録」と右のパネルの枠の両方から開く。
// 状態と操作は useCadBoard（lib/intake/use-cad-board.ts）が持つ。

import { SiteTabs } from '@/components/intake/site-tabs'
import { cadHref, cadUnitsForSite, countActiveCadBySite, countCadTabs, type CadTab } from '@/lib/intake/cad'
import type { SiteTab } from '@/lib/intake/site-tabs'
import type { CadUnit } from '@/lib/intake/types'
import { CAD_CSV_INPUT_ID, useCadBoard } from '@/lib/intake/use-cad-board'
import { CSV_UPLOAD_ACCEPT } from '@/lib/intake/upload-rules'
import { CadTabs } from './cad-tabs'
import { CadUnitList } from './cad-unit-list'
import { CadUnitPanel } from './cad-unit-panel'

type CadScreenProps = {
  units: CadUnit[]
  sites: SiteTab[]
  // 開いている加工場所のタブの営業所
  site: SiteTab | null
  tab: CadTab
  initialUnitId: string | null
  userId: string
}

export function CadScreen({ units, sites, site, tab, initialUnitId, userId }: CadScreenProps) {
  const board = useCadBoard({ units, site, tab, initialUnitId, userId })

  return (
    <main className="flex flex-1 flex-col bg-canvas px-5 py-5">
      <p className="text-sm text-neutral-500">アイトレに振り分けられた注文の、部品作成と CSV 登録を行います</p>
      <h1 className="mt-1 text-2xl font-bold text-neutral-900">CAD</h1>

      {board.notice && (
        <p role="status" className="mt-3 rounded border border-navy/20 bg-navy-soft px-4 py-2.5 text-sm font-semibold text-navy">
          {board.notice}
        </p>
      )}
      {board.error && (
        <p role="alert" className="mt-3 whitespace-pre-line rounded border border-urgent/30 bg-urgent/5 px-4 py-2.5 text-sm text-urgent">
          {board.error}
        </p>
      )}

      {/* 左の一覧と右のパネル。画面の高さに合わせ、それぞれの中でスクロールする。
          1280px の画面で一覧の列が収まるよう、右のパネルは受付待ち一覧（400px）より細くする */}
      <div className="mt-4 grid h-[calc(100dvh-var(--header-height)-140px)] min-h-[560px] grid-cols-[minmax(0,1fr)_360px] gap-4">
        <section className="flex min-h-0 flex-col rounded border border-line bg-white">
          <SiteTabs
            sites={sites}
            current={site}
            counts={countActiveCadBySite(units)}
            hrefFor={(target) => cadHref({ site: target.code, tab })}
          />
          <CadTabs site={site?.code ?? null} current={tab} counts={countCadTabs(cadUnitsForSite(units, site?.id ?? null))} />
          <CadUnitList board={board} />
        </section>
        <section className="flex min-h-0 flex-col rounded border border-line bg-white">
          {board.selected ? (
            // 行が替わったら、パネルの中の状態（ドラッグ中の色など）を作り直す
            <CadUnitPanel key={board.selected.id} unit={board.selected} board={board} />
          ) : (
            <p className="px-5 py-12 text-center text-sm text-neutral-500">一覧から行を選ぶと、ここに図面と CSV の枠を出します</p>
          )}
        </section>
      </div>

      <input
        id={CAD_CSV_INPUT_ID}
        type="file"
        multiple
        accept={CSV_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) board.onCsvPicked(event.target.files)
          // 同じファイルをもう一度選んでも onChange が起きるよう、選んだ内容を空に戻す
          event.target.value = ''
        }}
      />
    </main>
  )
}
