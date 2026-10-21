'use server'

// 受注登録待ち（S-06a・S-06b）の Server Action（docs/intake/screen-design.md「S-06a」「S-06b」）。
//
//   ・lookupIntakeForAdd  : 「受注登録待ちに追加」で受付No. を打って、受付の情報と今の区分を呼び出す
//   ・addWorkUnitWithFiles: 受注登録待ちに追加（ブラウザが Storage に置いたファイルと一緒に、区分を 1 つ作る）
//   ・completeWorkUnit    : この区分の起票を完了（受注登録待ちから外す）
// DB の書き込みは関数（add_work_unit_with_files・complete_work_unit）で行い、状態の確かめと、
// 事務・管理者だけが使えることは関数の中と RLS で確かめる。ここでは画面から届いた値の形だけを確かめる。

import { revalidatePath } from 'next/cache'
import type { Json } from '@/lib/database.types'
import type { AddOrigin } from '@/lib/intake/add-work-unit-form'
import type { IntakeStatus, WorkUnitKind, WorkUnitOrigin, WorkUnitStatus } from '@/lib/intake/constants'
import { normalizeIntakeNo } from '@/lib/intake/intake-no'
import type { UploadedFile } from '@/lib/intake/upload-intake-files'
import type { DueDateType } from '@/lib/order-entry/constants'
import { createClient } from '@/lib/supabase-server'

type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const KINDS: readonly WorkUnitKind[] = ['sakisun', 'aitore']
const ORIGINS: readonly AddOrigin[] = ['oversight', 'verbal', 'other']

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

// 受注登録待ちの一覧・メニューの件数・CAD の一覧を作り直す（共通レイアウトごと）
function revalidateQueuePages() {
  revalidatePath('/', 'layout')
}


// ============================================================
// 受付No. で呼び出す（受注登録待ちに追加）
// ============================================================
// 呼び出した受付の情報。units は、その受付の今の加工区分（受注が受付につながる PR 9 までは、
// 画面イメージの「登録済みの受注」の代わりにこれを出す）
export type AddTargetIntake = {
  id: string
  intakeNo: string
  status: IntakeStatus
  customerName: string | null
  projectName: string | null
  dueDateType: DueDateType | null
  dueDate: string | null
  deliveryMethodName: string | null
  units: { kind: WorkUnitKind; origin: WorkUnitOrigin; status: WorkUnitStatus }[]
}

export async function lookupIntakeForAdd(input: string): Promise<ActionResult<{ intake: AddTargetIntake }>> {
  const intakeNo = normalizeIntakeNo(input)
  if (!intakeNo) return { ok: false, error: '受付No. の形が正しくありません（例: 26-1003）' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('intakes')
    .select(
      'id, intake_no, status, project_name, due_date_type, due_date, customers(name), delivery_methods(name), work_units(kind, origin, status, created_at)'
    )
    .eq('intake_no', intakeNo)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) return { ok: false, error: `受付を読めませんでした: ${error.message}` }
  if (!data) return { ok: false, error: `受付No. ${intakeNo} は見つかりません` }

  return {
    ok: true,
    intake: {
      id: data.id,
      intakeNo,
      status: data.status as IntakeStatus,
      customerName: data.customers?.name ?? null,
      projectName: data.project_name,
      dueDateType: data.due_date_type as DueDateType | null,
      dueDate: data.due_date,
      deliveryMethodName: data.delivery_methods?.name ?? null,
      units: [...data.work_units]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((unit) => ({
          kind: unit.kind as WorkUnitKind,
          origin: unit.origin as WorkUnitOrigin,
          status: unit.status as WorkUnitStatus,
        })),
    },
  }
}


// ============================================================
// 受注登録待ちに追加
// ============================================================
// ファイルの実物は、呼ぶ前にブラウザが Storage に置いておく（lib/intake/upload-intake-files.ts の uploadFilesWith）。
// 区分とファイルの行は、関数の中で 1 つの transaction で作る。失敗したら、画面側が置いた実物を消す
export async function addWorkUnitWithFiles(input: {
  intakeId: string
  kind: WorkUnitKind
  origin: AddOrigin
  note: string
  files: UploadedFile[]
}): Promise<ActionResult<{ unitId: string }>> {
  if (!isUuid(input.intakeId) || !KINDS.includes(input.kind) || !ORIGINS.includes(input.origin)) {
    return { ok: false, error: '入力が正しくありません' }
  }
  for (const file of input.files) {
    // 置き場所は「受付の id/ファイルの id.拡張子」の形に限る（関数の中でも確かめる）
    if (!isUuid(file.id) || !file.storagePath.startsWith(`${input.intakeId}/${file.id}`)) {
      return { ok: false, error: 'ファイルが正しくありません' }
    }
  }

  const files: Json = input.files.map((file) => ({
    id: file.id,
    original_name: file.originalName,
    storage_path: file.storagePath,
    mime_type: file.mimeType,
    size_bytes: file.sizeBytes,
  }))

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('add_work_unit_with_files', {
    p_intake_id: input.intakeId,
    p_kind: input.kind,
    p_origin: input.origin,
    p_note: input.note,
    p_files: files,
  })
  if (error) {
    if (error.message.includes('INTAKE_NOT_DISPATCHED')) {
      return { ok: false, error: '振り分けが終わっていない受付には追加できません。振り分けの画面で枠に入れてください' }
    }
    return { ok: false, error: `受注登録待ちに追加できませんでした: ${error.message}` }
  }

  revalidateQueuePages()
  return { ok: true, unitId: data }
}


// ============================================================
// この区分の起票を完了
// ============================================================
// 受注登録待ち（ready）の区分を起票完了（done）にして、一覧から外す。
// 起票を終えた区分と、間違って作った区分のどちらにも使う（区別する列は持たない。
// PR 9 で受注と加工区分がつながれば、受注があるかどうかで見分けられる）。
// 受付のすべての区分が起票完了になると、DB のトリガーが受付を完了（closed）にする
export async function completeWorkUnit(workUnitId: string): Promise<ActionResult> {
  if (!isUuid(workUnitId)) return { ok: false, error: '加工区分が正しくありません' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('complete_work_unit', { p_work_unit_id: workUnitId })
  revalidateQueuePages()
  if (error) {
    if (error.message.includes('受注登録待ちではありません')) {
      return { ok: false, error: 'この区分はすでに受注登録待ちではありません（ほかの人が操作した可能性があります）' }
    }
    return { ok: false, error: `起票を完了できませんでした: ${error.message}` }
  }
  return { ok: true }
}
