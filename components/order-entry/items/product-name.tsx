// 明細の品名（表示のみ）。材質・製鋼法・メーカーなどから組み立てる（lib/order-entry/product-name.ts）。

type ProductNameProps = {
  name: string
}

export function ProductName({ name }: ProductNameProps) {
  return (
    <p className="flex h-[34px] items-center truncate font-semibold">
      {name || <span className="font-normal text-neutral-300">（品名）</span>}
    </p>
  )
}
