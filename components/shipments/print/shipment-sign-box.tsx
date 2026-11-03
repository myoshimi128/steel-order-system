// 受領書・送り状（弊社控え）の右の欄の、お客様のサインの欄。
// 単価・金額の代わりにこの欄を置く（配達のあとに、お客様に受け取りのサインをもらうため）。

export function ShipmentSignBox() {
  return (
    <div className="flex flex-1 flex-col border-2 border-neutral-900">
      <div className="border-b border-neutral-900 bg-neutral-100 px-2 py-1 text-center text-sm font-bold tracking-widest">受領欄</div>
      <div className="flex flex-1 flex-col gap-3 px-3 py-3 text-sm">
        <p className="text-xs leading-relaxed">上記の品物を確かに受け取りました。</p>
        <div className="flex items-end gap-2 border-b border-neutral-500 pb-1">
          <span className="text-xs text-neutral-700">受領日</span>
          <span className="ml-auto text-xs tracking-[0.6em] text-neutral-700">年　月　日</span>
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-xs text-neutral-700">ご署名</span>
          <div className="mt-1 flex-1 border border-neutral-500" />
        </div>
      </div>
    </div>
  )
}
