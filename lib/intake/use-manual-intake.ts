'use client'

// 「手動で受付を追加」（S-04b）の入力の状態と、追加の流れをまとめたカスタムフック。
//
//   経路・受付日時（日付＋時刻）・注文書（PDF・DXF。任意・複数）・メモを入れ、「追加して受付登録へ」で
//   1. 受付待ちの受付を作る（Server Action の createManualIntake。通知も DB のトリガーが作る）
//   2. ファイルを Storage に置き、ファイルの行を作る（uploadIntakeFiles）
//   3. 受付登録の画面（/intake/[id]）へ移る
// ファイルの一部を置けなかったときは、受付はできているため、画面にどのファイルかを出し、
// 「このまま受付登録へ」で進めるようにする（ファイルは入れ直せないため、注文書は受付登録の画面で確かめる）。

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createManualIntake } from '@/app/(main)/intake/actions'
import type { IntakeChannel } from './constants'
import { parseTimeInput, toJapanDateTime } from './received-at'
import { uploadIntakeFiles, type UploadResult } from './upload-intake-files'
import { uploadRejectionReason } from './upload-rules'

// 手動で追加するときに選べる経路（「メール（転送漏れ）」は経路 mail として保存する）
export const MANUAL_CHANNEL_OPTIONS: readonly { value: IntakeChannel; label: string }[] = [
  { value: 'verbal', label: '口頭・電話' },
  { value: 'visit', label: '来社' },
  { value: 'mail', label: 'メール（転送漏れ）' },
  { value: 'other', label: 'その他' },
]

type Params = {
  // 日本時間の今日 'YYYY-MM-DD' と今の時刻 'HH:MM'（受付日時の初期値）
  today: string
  nowTime: string
}

export function useManualIntake({ today, nowTime }: Params) {
  const router = useRouter()
  const [channel, setChannel] = useState<IntakeChannel>('verbal')
  const [date, setDate] = useState(today)
  const [time, setTime] = useState(nowTime)
  const [memo, setMemo] = useState('')
  const [files, setFiles] = useState<File[]>([])
  // 入れられなかったファイル（形式・大きさ）の理由
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([])
  const [errors, setErrors] = useState<{ date?: string; time?: string; form?: string }>({})
  // 受付はできたが、置けなかったファイルがあるとき（受付の id と、置けなかったファイル）
  const [partial, setPartial] = useState<{ intakeId: string; failures: UploadResult['failures'] } | null>(null)
  const [pending, startTransition] = useTransition()

  // ファイルを足す（ドロップ・選択）。入れられないファイルは理由を出して外す。同じ名前のファイルは差し替える
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
    const parsedTime = parseTimeInput(time)
    const nextErrors: typeof errors = {}
    if (date === '') nextErrors.date = '受付日を入力してください'
    if (!parsedTime.ok) nextErrors.time = parsedTime.error
    setErrors(nextErrors)
    if (!parsedTime.ok || date === '') return

    startTransition(async () => {
      const created = await createManualIntake({
        channel,
        receivedAt: toJapanDateTime(date, parsedTime.value),
        memo,
      })
      if (!created.ok) {
        setErrors({ form: created.error })
        return
      }
      const upload = await uploadIntakeFiles(created.id, files)
      if (upload.failures.length > 0) {
        setPartial({ intakeId: created.id, failures: upload.failures })
        return
      }
      router.push(`/intake/${created.id}`)
    })
  }

  // 置けなかったファイルがあっても、受付登録へ進む
  function continueToRegistration() {
    if (partial) router.push(`/intake/${partial.intakeId}`)
  }

  return {
    channel,
    setChannel,
    date,
    setDate,
    time,
    setTime,
    memo,
    setMemo,
    files,
    addFiles,
    removeFile,
    rejected,
    errors,
    partial,
    pending,
    submit,
    continueToRegistration,
  }
}

export type ManualIntakeState = ReturnType<typeof useManualIntake>
