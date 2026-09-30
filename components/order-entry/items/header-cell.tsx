// 明細の見出しの 1 列分。明細の欄は 2 段のため、見出しも上段・下段の 2 行にする。

type HeaderCellProps = {
  top: string
  bottom?: string
}

export function HeaderCell({ top, bottom }: HeaderCellProps) {
  return (
    <div className="flex flex-col leading-tight">
      <span>{top}</span>
      {bottom && <span className="text-[11px] font-normal text-neutral-300">{bottom}</span>}
    </div>
  )
}
