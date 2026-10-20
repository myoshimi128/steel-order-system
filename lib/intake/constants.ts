import type { CodeOption } from '@/lib/code-input/code-option'

// 受付〜受注登録で使うコード値と、その表示名（docs/intake/table-design.md「コード値と状態」）。
//
// DB には enum ではなく text＋check 制約で値を持つため、ここの値の一覧は
// マイグレーション（supabase/migrations/20261018100100_create_intake_tables.sql など）の check 制約と一致させること。
// 表示名は画面の一覧・バッジ・選択肢に使う。

// --- 受付の状態（intakes.status） ---
export type IntakeStatus = 'waiting' | 'registered' | 'dispatched' | 'closed' | 'estimate' | 'excluded'

export const INTAKE_STATUS_LABELS: Record<IntakeStatus, string> = {
  waiting: '受付待ち',
  registered: '受付登録済',
  dispatched: '振り分け完了',
  closed: '完了',
  estimate: '見積・ミルシート',
  excluded: '対象外',
}

// --- 受付の経路（intakes.channel） ---
export type IntakeChannel = 'mail' | 'fax' | 'verbal' | 'visit' | 'other'

export const INTAKE_CHANNEL_LABELS: Record<IntakeChannel, string> = {
  mail: 'メール',
  fax: 'FAX',
  verbal: '口頭・電話',
  visit: '来社',
  other: 'その他',
}

// --- 加工区分の種類（work_units.kind） ---
// 振り分けの枠（intake_files.slot）も同じ値を使う
export type WorkUnitKind = 'sakisun' | 'aitore'

export const WORK_UNIT_KIND_LABELS: Record<WorkUnitKind, string> = {
  sakisun: '先寸',
  aitore: 'アイトレ',
}

// --- 加工区分の状態（work_units.status） ---
//   先寸    : ready → done
//   アイトレ: cad_waiting → cad_working → ready（CSV 登録済）→ done
export type WorkUnitStatus = 'cad_waiting' | 'cad_working' | 'ready' | 'done'

export const WORK_UNIT_STATUS_LABELS: Record<WorkUnitStatus, string> = {
  cad_waiting: 'CAD 作業待ち',
  cad_working: 'CAD 作業中',
  ready: '受注登録待ち',
  done: '起票完了',
}

// --- 加工区分の作られ方（work_units.origin） ---
// split（振り分け）は一覧に印を出さないため、表示名は空にする
export type WorkUnitOrigin = 'split' | 'oversight' | 'verbal' | 'other'

export const WORK_UNIT_ORIGIN_LABELS: Record<WorkUnitOrigin, string> = {
  split: '',
  oversight: '見落とし追加',
  verbal: '口頭',
  other: 'その他',
}

// --- ファイルの種類（intake_files.kind） ---
export type IntakeFileKind = 'order_pdf' | 'original' | 'split' | 'added' | 'csv' | 'other'

export const INTAKE_FILE_KIND_LABELS: Record<IntakeFileKind, string> = {
  order_pdf: '注文書',
  original: '元データ',
  split: '振り分け済み',
  added: '追加分',
  csv: 'CAD の CSV',
  other: 'その他',
}

// --- 部署（users.department / notifications.dept / lead_time_*.dept） ---
export type Department = 'sales' | 'processing' | 'shearing' | 'delivery' | 'general'

export const DEPARTMENT_LABELS: Record<Department, string> = {
  sales: '営業部',
  processing: '加工部',
  shearing: 'シャーリング部',
  delivery: '配送部',
  general: '経理・総務',
}

// --- 目安納期の混雑度（lead_time_items.congestion） ---
// 要相談（consult）は日数を「—」で表示する
export type Congestion = 'normal' | 'busy' | 'crowded' | 'consult'

export const CONGESTION_LABELS: Record<Congestion, string> = {
  normal: '通常',
  busy: 'やや混雑',
  crowded: '混雑',
  consult: '要相談',
}

// --- CAD の作業中の経過時間（S-05 CAD） ---
// 作業を始めてからこの時間（時間）がたっても作業中のままの行は、オレンジ系で目立たせる。
// CAD の作業は終わったのに CSV を入れ忘れて、作業中のまま残っていることに気づけるようにするため。
// 運用に合わせて変えるときは、この値だけを直す
export const CAD_LONG_RUNNING_HOURS = 24

// --- Storage のバケット ---
// 受付のファイルを置く非公開のバケット（supabase/migrations/20261018100600_create_intake_files_bucket.sql）
export const INTAKE_FILES_BUCKET = 'intake-files'

// --- 至急（intakes.is_urgent） ---
// 受付登録の画面では、チェック欄ではなく番号の欄（0 通常 / 1 至急）で入れる。
// テンキーから手を離さずに入力できるようにするため（部材区分 SPL・ショットを番号の欄にしたのと同じ考え方）。
// 至急の受付は、受注登録待ち・CAD の先頭に並ぶ
export const URGENT_OPTIONS: readonly CodeOption<boolean>[] = [
  { code: '0', label: '通常', value: false },
  { code: '1', label: '至急', value: true },
]
