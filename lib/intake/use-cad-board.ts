'use client'

// CAD（S-05）の状態と操作をまとめたカスタムフック。
//
//   ・タブの行（並び順つき）と検索（受付No.・売り先・工事名）
//   ・選んだ行（右のパネルに出す）。URL の ?unit= に持ち、ない・別のタブの行なら一覧の先頭を選ぶ
//   ・作業開始、作業開始の取り消し（担当以外の人もできる。確認のダイアログを出す）
//   ・CSV を入れる（作業中・CSV 登録済の行だけ）、CSV を外す（確認のダイアログを出す）
//   ・作業中の行の経過時間と、長く作業中のままかの判定（CSV の入れ忘れに気づけるように）
//   ・加工区分・受付の変更を Realtime で受け取ったら、一覧を読み直す（ほかの人の作業開始・CSV の登録）
// 画面の部品（components/cad/*）は、このフックの戻り値を表示するだけにする。

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { addCadCsvFiles, cancelCadWork, removeCadCsv, startCadWork } from '@/app/(main)/cad/actions'
import { useNow } from '@/lib/hooks/use-now'
import { cadHref, filterCadUnits, rowsForCadTab, type CadTab } from './cad'
import { elapsedMinutes, formatElapsed, isLongRunning } from './cad-elapsed'
import type { CadUnit, IntakeFile } from './types'
import { useTableChanges, type IntakeRealtimeTable } from './use-intake-changes'
import { uploadFilesWith } from './upload-intake-files'
import { csvRejectionReason } from './upload-rules'

type Params = {
  units: CadUnit[]
  tab: CadTab
  // URL の ?unit=（選んだ行）
  initialUnitId: string | null
  userId: string
}

// CSV を選ぶ隠したファイルの欄の id（一覧の行・右のパネルの <label htmlFor> から開く）
export const CAD_CSV_INPUT_ID = 'cad-csv-input'

const REALTIME_TABLES: readonly IntakeRealtimeTable[] = ['work_units', 'intakes']

// 作業中の行の経過時間の表示（作業中でなければ null）
export type CadElapsed = { text: string; long: boolean }

export function useCadBoard({ units, tab, initialUnitId, userId }: Params) {
  const router = useRouter()
  // 経過時間の表示を 1 分ごとに進める
  const now = useNow(60_000)

  const [query, setQuery] = useState('')
  const tabRows = rowsForCadTab(units, tab)
  const visibleRows = filterCadUnits(tabRows, query)

  const [selectedId, setSelectedId] = useState<string | null>(initialUnitId)
  // 選んだ行がこのタブにない（CSV を登録して CSV 登録済のタブに移った など）ときは、一覧の先頭を選ぶ
  const selected = tabRows.find((unit) => unit.id === selectedId) ?? visibleRows[0] ?? null

  // 行を選ぶ。URL の ?unit= も書き換える（再読み込みしても同じ行が開くように。画面の移動はしない）
  function select(id: string) {
    setSelectedId(id)
    window.history.replaceState(null, '', cadHref({ tab, unit: id }))
  }

  // ほかの人の作業開始・CSV の登録が届いたら、一覧を読み直す（選んだ行・検索の文字はそのまま残る）
  useTableChanges(REALTIME_TABLES, true, () => router.refresh())

  // 操作の途中の行（ボタンを止める）、エラー、結果のお知らせ
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function begin(unitId: string) {
    setBusyUnitId(unitId)
    setError(null)
    setNotice(null)
  }

  function isMine(unit: CadUnit): boolean {
    return unit.assigneeId === userId
  }

  async function start(unit: CadUnit) {
    select(unit.id)
    begin(unit.id)
    const result = await startCadWork(unit.id)
    setBusyUnitId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.startedBy) setNotice(`${result.startedBy}さんが先に作業を始めていました`)
  }

  async function cancel(unit: CadUnit) {
    const who = isMine(unit) ? '' : `担当は ${unit.assigneeName ?? 'ほかの人'} さんです。`
    if (!window.confirm(`${who}作業開始を取り消して、作業待ちに戻します（担当と開始日時は消えます）。よろしいですか？`)) {
      return
    }
    begin(unit.id)
    const result = await cancelCadWork(unit.id)
    setBusyUnitId(null)
    if (!result.ok) setError(result.error)
  }

  // CSV を選ぶ画面（隠したファイルの欄。id は CAD_CSV_INPUT_ID）は、一覧の行の「CSV を登録」と右のパネルの枠から開く。
  // どちらも <label htmlFor=...> にしてあり、押すとブラウザがファイルを選ぶ画面を開く。押したときにこの関数で対象の行を覚える
  // （選んでいる間に一覧が読み直されても、選び始めた行に入れるよう、ref に覚えておく）
  const csvTargetRef = useRef<CadUnit | null>(null)

  function pickCsv(unit: CadUnit) {
    select(unit.id)
    csvTargetRef.current = unit
  }

  // CSV を入れる: 入れられないファイル（CSV 以外・50MB 超）は理由を出して外し、残りを Storage に置いてから行を作る。
  // 作業中の行に 1 つ目の CSV が入ると、トリガーで受注登録待ちに移る（一覧の CSV 登録済のタブへ）
  async function uploadCsv(unit: CadUnit, list: FileList | readonly File[]) {
    const accepted: File[] = []
    const messages: string[] = []
    for (const file of Array.from(list)) {
      const reason = csvRejectionReason(file)
      if (reason) messages.push(`${file.name}: ${reason}`)
      else accepted.push(file)
    }
    begin(unit.id)
    let added = 0
    if (accepted.length > 0) {
      const result = await uploadFilesWith(unit.intakeId, accepted, (uploaded) =>
        addCadCsvFiles(unit.intakeId, unit.id, uploaded)
      )
      messages.push(...result.failures.map((failure) => `${failure.name}: ${failure.error}`))
      added = accepted.length - result.failures.length
    }
    setBusyUnitId(null)
    if (messages.length > 0) setError(messages.join('\n'))
    if (added > 0) {
      const no = unit.intakeNo ? `受付No. ${unit.intakeNo} の` : ''
      setNotice(
        unit.status === 'cad_working'
          ? `${no}CSV を登録しました。受注登録待ちに並びます（「CSV 登録済」のタブで確かめられます）`
          : `${no}CSV を登録しました`
      )
    }
  }

  // 隠したファイルの欄で CSV を選んだとき
  function onCsvPicked(list: FileList) {
    const target = csvTargetRef.current ?? selected
    csvTargetRef.current = null
    if (target) void uploadCsv(target, list)
  }

  async function removeCsv(unit: CadUnit, file: IntakeFile) {
    const lines = [`「${file.originalName}」を外します。`]
    if (unit.csvFiles.length === 1) {
      lines.push('CSV が 0 件になるため、作業中に戻ります（受注登録待ちから外れます）。')
    }
    if (!isMine(unit) && unit.assigneeName) lines.push(`担当は ${unit.assigneeName} さんです。`)
    lines.push('よろしいですか？')
    if (!window.confirm(lines.join('\n'))) return
    begin(unit.id)
    const result = await removeCadCsv(file.id)
    setBusyUnitId(null)
    if (!result.ok) setError(result.error)
  }

  // 作業中の行の経過時間（作業中でなければ null）
  function elapsedOf(unit: CadUnit): CadElapsed | null {
    if (unit.status !== 'cad_working' || unit.startedAt === null) return null
    return {
      text: formatElapsed(elapsedMinutes(unit.startedAt, now)),
      long: isLongRunning(unit.startedAt, now),
    }
  }

  return {
    tab,
    query,
    setQuery,
    totalCount: tabRows.length,
    visibleRows,
    selected,
    select,
    isMine,
    elapsedOf,
    busyUnitId,
    error,
    notice,
    start,
    cancel,
    pickCsv,
    uploadCsv,
    onCsvPicked,
    removeCsv,
  }
}

export type CadBoard = ReturnType<typeof useCadBoard>
