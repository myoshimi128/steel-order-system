// 現場用伝票の明細の表（1 ページ分）。
//
//   列: No.・切断方法・品名と寸法・数量・重量（kg）。単価記入用だけ、右に単価・金額の列を足す（現場用には単価を出さない）
//   材料の行: 材質ラインがある行は、品名の欄の左に材質の色の太い線を引き、「材質ライン：青2本」を添える
//   加工の行: 材料の行のすぐ下に一段下げて出す。重量は空欄（材料の重量を二重に数えないため）
//   板厚の区切り: 前の材料の行と板厚が違う行の上に、太い線を引く（明細の並びは入力した順のまま）
//   空の行: 1 ページの行数まで空の行で埋め、どのページも同じ形の表にする（単価記入用では手で書き込む欄にもなる）
// 単価が決まっていない行（別途見積もり・加工の単価未定）は、単価記入用でも空欄にして手で書き込めるようにする。

import { SLIP_ROWS_PER_PAGE } from '@/lib/order-slip/slip-pages'
import type { SlipLine } from '@/lib/order-slip/types'

type SlipItemsTableProps = {
  lines: readonly SlipLine[]
  showPrices: boolean
}

function quantityText(value: number | null): string {
  return value === null ? '' : value.toLocaleString('ja-JP')
}

function weightText(value: number | null): string {
  return value === null ? '' : value.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 単価（kg 単価は小数があるため、小数第 2 位まで出す）と単位
function unitPriceText(price: number | null, unit: string | null): string {
  if (price === null) return ''
  return `${price.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}${unit ? ` /${unit}` : ''}`
}

function amountText(value: number | null): string {
  return value === null ? '' : value.toLocaleString('ja-JP')
}

// 行の高さ（8mm）。1 ページの行数（SLIP_ROWS_PER_PAGE）と合わせて、A4 の横に収まるように決めている
const ROW = 'h-[8mm] border-b border-neutral-400'
// 列の区切り線（左の線。いちばん左の列には引かない）
const CELL = 'border-l border-neutral-300 px-1.5 align-middle first:border-l-0'

export function SlipItemsTable({ lines, showPrices }: SlipItemsTableProps) {
  const blankCount = Math.max(0, SLIP_ROWS_PER_PAGE - lines.length)

  return (
    <table className="w-full table-fixed border-collapse border border-neutral-900 text-sm">
      <colgroup>
        <col className="w-[10mm]" />
        <col className="w-[22mm]" />
        <col />
        <col className="w-[18mm]" />
        <col className="w-[24mm]" />
        {showPrices && <col className="w-[26mm]" />}
        {showPrices && <col className="w-[26mm]" />}
      </colgroup>
      <thead>
        <tr className="h-[7mm] border-b-2 border-neutral-900 bg-neutral-100 text-xs text-neutral-700">
          <th className={`${CELL} text-center font-semibold`}>No.</th>
          <th className={`${CELL} text-left font-semibold`}>切断方法</th>
          <th className={`${CELL} text-left font-semibold`}>品名と寸法</th>
          <th className={`${CELL} text-right font-semibold`}>数量</th>
          <th className={`${CELL} text-right font-semibold`}>重量（kg）</th>
          {showPrices && <th className={`${CELL} text-right font-semibold`}>単価</th>}
          {showPrices && <th className={`${CELL} text-right font-semibold`}>金額（円）</th>}
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) =>
          line.kind === 'material' ? (
            <tr
              key={`m-${line.lineNo}`}
              // 板厚が変わる行の上に太い線を引く
              className={`${ROW} ${line.thicknessBreak ? 'border-t-[3px] border-t-neutral-900' : ''}`}
            >
              <td className={`${CELL} text-center tabular-nums`}>{line.lineNo}</td>
              <td className={`${CELL} truncate`}>{line.cuttingMethod}</td>
              <td
                className={`${CELL} truncate font-semibold`}
                // 材質ラインの色の太い線（色が読めないときは黒の線にする）
                style={line.lineMark ? { borderLeft: `5px solid ${line.lineMark.color ?? '#171717'}` } : undefined}
              >
                {line.productName}
                {line.lineMark && (
                  <span className="ml-3 rounded border border-neutral-900 px-1.5 text-xs font-bold">
                    材質ライン：{line.lineMark.text}
                  </span>
                )}
              </td>
              <td className={`${CELL} text-right text-base font-bold tabular-nums`}>{quantityText(line.quantity)}</td>
              <td className={`${CELL} text-right tabular-nums`}>{weightText(line.weight)}</td>
              {showPrices && <td className={`${CELL} text-right tabular-nums`}>{unitPriceText(line.unitPrice, line.priceUnit)}</td>}
              {showPrices && <td className={`${CELL} text-right tabular-nums`}>{amountText(line.amount)}</td>}
            </tr>
          ) : (
            <tr key={`p-${line.parentLineNo}-${index}`} className={ROW}>
              <td className={CELL} />
              <td className={CELL} />
              {/* 一段下げて、どの材料の加工かを分かるようにする */}
              <td className={`${CELL} truncate pl-5`}>└ {line.text}</td>
              <td className={`${CELL} text-right tabular-nums`}>{quantityText(line.quantity)}</td>
              <td className={CELL} />
              {showPrices && <td className={`${CELL} text-right tabular-nums`}>{unitPriceText(line.unitPrice, line.priceUnit)}</td>}
              {showPrices && <td className={`${CELL} text-right tabular-nums`}>{amountText(line.amount)}</td>}
            </tr>
          )
        )}
        {/* 列の区切り線も引くため、列の数だけ空の欄を並べる */}
        {Array.from({ length: blankCount }, (_, index) => (
          <tr key={`blank-${index}`} className={ROW}>
            {Array.from({ length: showPrices ? 7 : 5 }, (_, column) => (
              <td key={column} className={CELL} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
