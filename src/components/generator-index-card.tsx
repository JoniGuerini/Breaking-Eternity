import { cn } from "@/lib/utils"

type GeneratorIndexCardProps = {
  /** Número do gerador (1–10…). */
  index: number
  size?: "row" | "mini"
  className?: string
}

/** Layout + cantos; cores vêm de .generator-index-card no CSS (opaco). */
const cardLayoutRow =
  "generator-index-card flex h-10 min-w-[48px] shrink-0 items-center justify-center rounded-lg border px-2 shadow-none"
const cardLayoutMini =
  "generator-index-card inline-flex h-6 min-w-[1.75rem] shrink-0 items-center justify-center rounded-md border px-1 font-sans text-[11px] font-medium tabular-nums tracking-wide shadow-none"
export function GeneratorIndexCard({
  index,
  size = "row",
  className,
}: GeneratorIndexCardProps) {
  const label = String(index)

  if (size === "mini") {
    return (
      <span className={cn(cardLayoutMini, className)} aria-hidden>
        {label}
      </span>
    )
  }

  return (
    <div className={cn(cardLayoutRow, className)}>
      <h2 className="text-[14px] font-medium tracking-wide">{label}</h2>
    </div>
  )
}
