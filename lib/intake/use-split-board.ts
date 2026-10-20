'use client'

// 振り分け（S-04d）の状態と操作をまとめたカスタムフック。
//
//   ・元データ（左）と、先寸・アイトレの枠のファイル（右）を、受付のファイルから分けて持つ
//   ・枠にファイルを入れる: パソコンからドロップ（Storage に置いてから枠に足す）／元データの行をドラッグ（複製）
//   ・枠から外す、元データの「分割して保存済」の印を付け外しする
//   ・振り分け完了（図面なしで登録するときは、その区分を渡す）
// 枠は入れた時点で保存する（「一時保存」のボタンはない）。保存のたびにサーバーが画面を作り直し、新しい状態が届く。
// 画面の部品（components/intake/split/*）は、このフックの戻り値を表示するだけにする。

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  addSplitFiles,
  completeSplit,
  copyOriginalToSlot,
  removeSplitFile,
  setOriginalSplitDone,
} from '@/app/(main)/intake/[id]/split/actions'
import type { WorkUnitKind } from './constants'
import {
  canRegisterWithoutDrawings,
  completeConfirmText,
  countUnassigned,
  slotCounts,
  type SplitOriginal,
  type SplitSlotFile,
} from './split'
import { intakeListHref } from './tabs'
import type { IntakeDetail, IntakeFile } from './types'
import { uploadFilesWith } from './upload-intake-files'
import { uploadRejectionReason } from './upload-rules'

// 元データの行を枠へドラッグするときに、ドラッグの中身に入れる種類の名前（パソコンのファイルと見分けるため）
export const ORIGINAL_DRAG_TYPE = 'application/x-intake-original'

export function useSplitBoard(intake: IntakeDetail) {
  const router = useRouter()

  const originals: (IntakeFile & SplitOriginal)[] = intake.files.filter((file) => file.kind === 'original')
  const slotFiles = intake.files.filter(
    (file): file is IntakeFile & SplitSlotFile => file.kind === 'split' && file.slot !== null
  )
  // 注文書の PDF（見出しの「注文書を開く」に使う）
  const orderPdfs = intake.files.filter((file) => file.kind === 'order_pdf')

  const counts = slotCounts(slotFiles)
  const unassigned = countUnassigned(originals, slotFiles)
  const withoutDrawingsAllowed = canRegisterWithoutDrawings(slotFiles)

  // 枠への出し入れの途中の枠（枠に「保存しています…」を出す）と、元データの印の途中の行
  const [busySlot, setBusySlot] = useState<WorkUnitKind | null>(null)
  const [busyFileId, setBusyFileId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completing, startCompleting] = useTransition()

  // パソコンからファイルをドロップした: 入れられないファイル（PDF・DXF 以外、50MB 超）は理由を出して外し、
  // 残りを Storage に置いてから枠に足す
  async function dropFiles(slot: WorkUnitKind, list: FileList) {
    const accepted: File[] = []
    const messages: string[] = []
    for (const file of Array.from(list)) {
      const reason = uploadRejectionReason(file)
      if (reason) messages.push(`${file.name}: ${reason}`)
      else accepted.push(file)
    }
    setError(null)
    if (accepted.length > 0) {
      setBusySlot(slot)
      const result = await uploadFilesWith(intake.id, accepted, (uploaded) =>
        addSplitFiles(intake.id, slot, uploaded)
      )
      setBusySlot(null)
      messages.push(...result.failures.map((failure) => `${failure.name}: ${failure.error}`))
    }
    if (messages.length > 0) setError(messages.join('\n'))
  }

  // 元データの行を枠へドラッグした: 元データを複製して枠に足す
  async function dropOriginal(slot: WorkUnitKind, originalId: string) {
    setError(null)
    setBusySlot(slot)
    const result = await copyOriginalToSlot(intake.id, originalId, slot)
    setBusySlot(null)
    if (!result.ok) setError(result.error)
  }

  async function remove(fileId: string) {
    setError(null)
    setBusyFileId(fileId)
    const result = await removeSplitFile(fileId)
    setBusyFileId(null)
    if (!result.ok) setError(result.error)
  }

  async function toggleSplitDone(fileId: string, done: boolean) {
    setError(null)
    setBusyFileId(fileId)
    const result = await setOriginalSplitDone(fileId, done)
    setBusyFileId(null)
    if (!result.ok) setError(result.error)
  }

  // 振り分け完了。withoutDrawings は「図面なしで ○○ として登録」のときの区分（枠にファイルがあるときは null）
  function complete(withoutDrawings: WorkUnitKind | null) {
    if (!window.confirm(completeConfirmText(counts, unassigned, withoutDrawings))) return
    setError(null)
    startCompleting(async () => {
      const result = await completeSplit(intake.id, withoutDrawings)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(intakeListHref({ tab: 'registered', notice: 'dispatched', no: intake.intakeNo }))
    })
  }

  return {
    originals,
    slotFiles,
    orderPdfs,
    counts,
    unassigned,
    withoutDrawingsAllowed,
    busySlot,
    busyFileId,
    error,
    completing,
    // 何かの保存の途中は、ほかの操作を止める
    busy: busySlot !== null || busyFileId !== null || completing,
    dropFiles,
    dropOriginal,
    remove,
    toggleSplitDone,
    complete,
  }
}

export type SplitBoard = ReturnType<typeof useSplitBoard>
