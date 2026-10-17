// 明細の見出しの 1 列分。明細は 1 件 1 行のため、通常は 1 行（bottom は補足が必要な列だけ）。

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
