'use client'

// 「受注登録待ちに追加」（S-06b）の入力の状態と、追加の流れをまとめたカスタムフック。
//
//   受付No. を打って Enter（または「呼び出す」）で受付を呼び出し、追加の理由・区分・メモ・図面と注文書（任意）を入れて
//   「追加する」で
//   1. ファイルを Storage に置く（ファイルがなければ飛ばす）
//   2. 区分とファイルの行をまとめて作る（Server Action の addWorkUnitWithFiles。DB の関数で 1 つの transaction）
//   3. 行を作れなかったら、1 で置いた実物を消す（uploadFilesWith が行う）
//   4. 一覧に戻り、結果を上に知らせる
// 一部のファイルを置けなかったときは、区分はできているため、どのファイルかを出して「閉じる」で一覧に戻す。

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addWorkUnitWithFiles, lookupIntakeForAdd, type AddTargetIntake } from '@/app/(main)/orders/queue/actions'
import { validateAddWorkUnit, type AddOrigin, type AddWorkUnitErrors } from './add-work-unit-form'
import type { WorkUnitKind } from './constants'
import { queueHref } from './queue'
import { uploadFilesWith, type UploadFailure } from './upload-intake-files'
import { uploadRejectionReason } from './upload-rules'

type Params = {
  // 一覧のタブの営業所のコード（追加の後に戻るタブ）
  siteCode: string | null
  // 追加が終わって一覧に戻るときに呼ぶ（モーダルを閉じる）
  onDone: () => void
}

export function useAddWorkUnit({ siteCode, onDone }: Params) {
  const router = useRouter()

  const [intakeNoInput, setIntakeNoInputState] = useState('')
  const [intake, setIntake] = useState<AddTargetIntake | null>(null)
  const [looking, startLooking] = useTransition()

  const [origin, setOrigin] = useState<AddOrigin | null>('oversight')
  const [kind, setKind] = useState<WorkUnitKind | null>('sakisun')
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([])

  const [errors, setErrors] = useState<AddWorkUnitErrors & { form?: string }>({})
  // 区分はできたが、置けなかったファイルがあるとき（一覧に戻るときに知らせる文と、置けなかったファイル）
  const [partial, setPartial] = useState<{ href: string; failures: UploadFailure[] } | null>(null)
  const [pending, startTransition] = useTransition()

  // 受付No. を打ち直したら、呼び出した受付を外す（違う受付に追加しないように）
  function setIntakeNoInput(value: string) {
    setIntakeNoInputState(value)
    if (intake) setIntake(null)
  }

  function lookup() {
    setErrors({})
    startLooking(async () => {
      const result = await lookupIntakeForAdd(intakeNoInput)
      if (!result.ok) {
        setIntake(null)
        setErrors({ intakeNo: result.error })
        return
      }
      setIntake(result.intake)
      // 正規化した受付No.（26-1 → 26-0001 など）を欄に戻す
      setIntakeNoInputState(result.intake.intakeNo)
    })
  }

  // ファイルを足す（ドロップ・選択）。入れられないファイル（PDF・DXF 以外、50MB 超）は理由を出して外す。同じ名前は差し替える
  function addFiles(list: FileList | File[]) {
    const accepted: File[] = []
    const nextRejected: { name: string; reason: string }[] = []
    for (const file of Array.from(list)) {
      const reason = uploadRejectionReason(file)
      if (reason) nextRejected.push({ name: file.name, reason })
      else accepted.push(file)
    }
    setFiles((current) => [
      ...current.filter((file) => !accepted.some((added) => added.name === file.name)),
      ...accepted,
    ])
    setRejected(nextRejected)
  }

  function removeFile(name: string) {
    setFiles((current) => current.filter((file) => file.name !== name))
  }

  function submit() {
    const nextErrors = validateAddWorkUnit({ intakeStatus: intake?.status ?? null, origin, kind, note })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !intake || !origin || !kind) return
    const target = intake

    startTransition(async () => {
      const input = { intakeId: target.id, kind, origin, note }
      // 区分を作れたか（ファイルを置く流れの中で作るため、オブジェクトに入れて中から書き換える）
      const outcome = { created: false }
      let failures: UploadFailure[] = []

      if (files.length === 0) {
        const result = await addWorkUnitWithFiles({ ...input, files: [] })
        if (!result.ok) {
          setErrors({ form: result.error })
          return
        }
        outcome.created = true
      } else {
        // ファイルを置いてから、置けたファイルと一緒に区分を作る（作れなければ、置いた実物は uploadFilesWith が消す）
        const upload = await uploadFilesWith(target.id, files, async (uploaded) => {
          const result = await addWorkUnitWithFiles({ ...input, files: uploaded })
          if (!result.ok) return result
          outcome.created = true
          return { ok: true }
        })
        failures = upload.failures
        if (!outcome.created) {
          setErrors({ form: failures.map((failure) => `${failure.name}: ${failure.error}`).join('\n') })
          return
        }
      }

      const href = queueHref({
        site: siteCode,
        notice: kind === 'aitore' ? 'added-aitore' : 'added-sakisun',
        no: target.intakeNo,
      })
      if (failures.length > 0) {
        setPartial({ href, failures })
        return
      }
      router.replace(href)
      onDone()
    })
  }

  // 置けなかったファイルがあっても、一覧に戻る
  function finishPartial() {
    if (!partial) return
    router.replace(partial.href)
    onDone()
  }

  return {
    intakeNoInput,
    setIntakeNoInput,
    intake,
    looking,
    lookup,
    origin,
    setOrigin,
    kind,
    setKind,
    note,
    setNote,
    files,
    addFiles,
    removeFile,
    rejected,
    errors,
    partial,
    pending,
    submit,
    finishPartial,
  }
}

export type AddWorkUnitState = ReturnType<typeof useAddWorkUnit>
