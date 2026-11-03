// 送り状の画面の上部の項目 1 つ（小さな見出しと、太字の値）。値がないときは「―」を出す。
// wide を付けると 2 列分の幅にする（得意先・納入先・工事名）。

type ShipmentPanelItemProps = {
  label: string
  value: string | null
  wide?: boolean
}

export function ShipmentPanelItem({ label, value, wide = false }: ShipmentPanelItemProps) {
  return (
    <div className={`flex min-w-0 flex-col ${wide ? 'col-span-2' : ''}`}>
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="truncate text-sm font-semibold text-neutral-900">{value || '―'}</span>
    </div>
  )
}
