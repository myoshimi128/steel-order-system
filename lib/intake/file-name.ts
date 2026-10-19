// ファイルをダウンロードするときの名前（docs/intake/screen-design.md「DXF を開く」）。
//
//   {受付No.}_{区分}_{元のファイル名}   例: 26-1003_先寸_PL9-297x1530.dxf
//
// 図面ソフトで開いたときに、どの受付・どの区分の図面かがファイル名で分かるようにするため。
//   ・受付No. がまだない（受付待ち）ときは、受付No. を付けない
//   ・区分（先寸・アイトレ）がないファイル（注文書・元データ）は、区分を付けない
// Windows のファイル名に使えない文字（\ / : * ? " < > |）は「_」に置き換える。

import { WORK_UNIT_KIND_LABELS, type WorkUnitKind } from './constants'

const INVALID_FILE_NAME_CHARS = /[\\/:*?"<>|]/g

export function downloadFileName(
  intakeNo: string | null,
  slot: WorkUnitKind | null,
  originalName: string
): string {
  const parts = [intakeNo, slot ? WORK_UNIT_KIND_LABELS[slot] : null, originalName].filter(
    (part): part is string => part !== null && part !== ''
  )
  return parts.join('_').replace(INVALID_FILE_NAME_CHARS, '_')
}
