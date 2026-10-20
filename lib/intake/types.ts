// 受付待ち一覧・受付登録の画面で扱う受付の形（DB の列名ではなく、画面で使いやすい名前にしたもの）。
// サーバー（lib/intake/load-intakes.ts）で DB から読んで、この形にして画面に渡す。

import type { DueDateType } from '@/lib/order-entry/constants'
import type { IntakeChannel, IntakeFileKind, IntakeStatus, WorkUnitKind } from './constants'
import type { HandlingInfo } from './handling'
import type { IntakeInfoSource } from './intake-form'

// 受付のファイル 1 件（実体は Storage。DB の intake_files の行）
export type IntakeFile = {
  id: string
  kind: IntakeFileKind
  // 振り分けの枠（振り分け済みのファイルだけ）
  slot: WorkUnitKind | null
  originalName: string
  sizeBytes: number | null
  // 元データの「分割して保存済」の印（振り分けの画面で人がチェックする。元データ以外は false）
  splitDone: boolean
  // 注文書の PDF を画面に埋め込むための、期限つきの URL（サーバーで作る。PDF 以外は null）
  viewUrl: string | null
}

// 一覧の 1 行（右側のメールの中身にも使う）
export type IntakeListRow = HandlingInfo & {
  id: string
  intakeNo: string | null
  channel: IntakeChannel
  status: IntakeStatus
  // 受信・受付の日時（ISO 8601）
  receivedAt: string
  emailFrom: string | null
  emailSubject: string | null
  emailBody: string | null
  memo: string | null
  // 受付登録済などの行に出す受注情報の要約
  customerName: string | null
  projectName: string | null
  dueDateType: DueDateType | null
  dueDate: string | null
  isUrgent: boolean
  siteName: string | null
  files: IntakeFile[]
}

// 受付登録の画面で開く受付（一覧の 1 行に、保存済みの受注情報を足したもの）
export type IntakeDetail = IntakeListRow & {
  info: IntakeInfoSource
}
