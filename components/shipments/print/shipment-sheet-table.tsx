// 送り状の明細の表（1 ページ分）。
//
//   列: No.・切断方法・品名と寸法・数量・重量（kg。部によって実重量か角重量か）。単価・金額は出さない
//   加工の行: 材料の行のすぐ下に一段下げて文だけを出す（数量・重量は材料の行に含まれるため）
//   実重量の部で、実重量が未入力の行は角重量で代わりに数え、重量の前に「角」を付ける
//   空の行: 1 ページの行数まで空の行で埋め、どのページも同じ形の表にする

import { SHIPMENT_ROWS_PER_PAGE, type ShipmentSheetLine } from '@/lib/shipments/shipment-copies'
import { quantityText, weightText } from '@/lib/shipments/shipment-format'

type ShipmentSheetTableProps = {
  lines: readonly ShipmentSheetLine[]
  // 重量の列の見出し（実重量 / 角重量）
  weightLabel: string
}

// 行の高さ（8mm）。1 ページの行数（SHIPMENT_ROWS_PER_PAGE）と合わせて、A4 の横に収まるように決めている
const ROW = 'h-[8mm] border-b border-neutral-400'
const CELL = 'border-l border-neutral-300 px-1.5 align-middle first:border-l-0'
const COLUMN_COUNT = 5

export function ShipmentSheetTable({ lines, weightLabel }: ShipmentSheetTableProps) {
  const blankCount = Math.max(0, SHIPMENT_ROWS_PER_PAGE - lines.length)

  return (
    <table className="w-full table-fixed border-collapse border border-neutral-900 text-sm">
      <colgroup>
        <col className="w-[10mm]" />
        <col className="w-[22mm]" />
        <col />
        <col className="w-[18mm]" />
        <col className="w-[28mm]" />
      </colgroup>
      <thead>
        <tr className="h-[7mm] border-b-2 border-neutral-900 bg-neutral-100 text-xs text-neutral-700">
          <th className={`${CELL} text-center font-semibold`}>No.</th>
          <th className={`${CELL} text-left font-semibold`}>切断方法</th>
          <th className={`${CELL} text-left font-semibold`}>品名と寸法</th>
          <th className={`${CELL} text-right font-semibold`}>数量</th>
          <th className={`${CELL} text-right font-semibold`}>{weightLabel}（kg）</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) =>
          line.kind === 'material' ? (
            <tr key={`m-${line.lineNo}`} className={ROW}>
              <td className={`${CELL} text-center tabular-nums`}>{line.lineNo}</td>
              <td className={`${CELL} truncate`}>{line.cuttingMethod}</td>
              <td className={`${CELL} truncate font-semibold`}>{line.productName}</td>
              <td className={`${CELL} text-right text-base font-bold tabular-nums`}>{quantityText(line.quantity)}</td>
              <td className={`${CELL} text-right tabular-nums`}>
                {line.estimated && <span className="mr-1 border border-neutral-900 px-0.5 text-[10px] font-bold">角</span>}
                {weightText(line.weight)}
              </td>
            </tr>
          ) : (
            <tr key={`p-${line.parentLineNo}-${index}`} className={ROW}>
              <td className={CELL} />
              <td className={CELL} />
              <td className={`${CELL} truncate pl-5`}>└ {line.text}</td>
              <td className={CELL} />
              <td className={CELL} />
            </tr>
          )
        )}
        {Array.from({ length: blankCount }, (_, index) => (
          <tr key={`blank-${index}`} className={ROW}>
            {Array.from({ length: COLUMN_COUNT }, (_, column) => (
              <td key={column} className={CELL} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
