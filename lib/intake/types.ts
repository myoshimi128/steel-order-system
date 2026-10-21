// 受付待ち一覧・受付登録・CAD の画面で扱う受付の形（DB の列名ではなく、画面で使いやすい名前にしたもの）。
// サーバー（lib/intake/load-intakes.ts）で DB から読んで、この形にして画面に渡す。

import type { DueDateType } from '@/lib/order-entry/constants'
import type {
  IntakeChannel,
  IntakeFileKind,
  IntakeStatus,
  WorkUnitKind,
  WorkUnitOrigin,
  WorkUnitStatus,
} from './constants'
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

// CAD の一覧の 1 行（アイトレの加工区分 1 件に、受付の情報とファイルを付けたもの。S-05 CAD）
export type CadUnit = {
  // 加工区分（work_units）の id
  id: string
  // 作業待ち・作業中・CSV 登録済（受注登録待ち）。起票完了（done）は一覧に出さない
  status: Extract<WorkUnitStatus, 'cad_waiting' | 'cad_working' | 'ready'>
  // CAD の担当と作業開始の日時（作業待ちのときは null）
  assigneeId: string | null
  assigneeName: string | null
  startedAt: string | null
  // CSV が登録されて受注登録待ちに入った日時（CSV 登録済のタブの並び順に使う）
  readyAt: string | null
  // 受付の情報
  intakeId: string
  intakeNo: string | null
  customerName: string | null
  projectName: string | null
  dueDateType: DueDateType | null
  dueDate: string | null
  deliveryMethodName: string | null
  isUrgent: boolean
  // 加工場所（一覧の加工場所のタブで絞り込む）
  siteId: string | null
  siteName: string | null
  registeredAt: string | null
  // 同じ受付に、起票完了していない先寸の加工区分もあるか（右のパネルに「先寸あり」と出す）
  hasSakisun: boolean
  // この加工区分の図面（振り分けたアイトレの DXF など）
  drawings: IntakeFile[]
  // この加工区分に登録した CAD の CSV
  csvFiles: IntakeFile[]
  // 受付の注文書の PDF
  orderPdfs: IntakeFile[]
}

// 受注登録待ちの一覧の 1 行（ready の加工区分 1 件に、受付の情報を付けたもの。S-06a）
export type QueueUnit = {
  // 加工区分（work_units）の id
  id: string
  kind: WorkUnitKind
  // 作られ方（振り分け・見落とし追加・口頭・その他）と、追加のときのメモ
  origin: WorkUnitOrigin
  note: string | null
  // 受注登録待ちに入った日時
  readyAt: string | null
  // CAD の CSV が登録されているか（アイトレの「✓ CSV 登録済」）
  hasCsv: boolean
  // 受付の情報
  intakeId: string
  intakeNo: string | null
  customerName: string | null
  projectName: string | null
  dueDateType: DueDateType | null
  dueDate: string | null
  isUrgent: boolean
  siteId: string | null
  // 受付の担当者（自社の担当者）
  staffName: string | null
  registeredAt: string | null
}

// 受付登録の画面で開く受付（一覧の 1 行に、保存済みの受注情報を足したもの）
export type IntakeDetail = IntakeListRow & {
  info: IntakeInfoSource
}
