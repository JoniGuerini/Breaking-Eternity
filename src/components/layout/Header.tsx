import React from "react"
import Decimal from "break_eternity.js"
import { useGame } from "@/components/game-provider"
import {
  ResourceGlyph,
  type ResourceGlyphKind,
} from "@/components/resource-glyph"
import { formatEssenceAmount, formatNumber } from "@/lib/game-logic"

/** Larguras fixas (px) — layout não responsivo, espaço pré-definido por cartão. */
const TITLE_W = "w-[220px]"
const RESOURCE_CARD_W = "w-[184px]"
const CARD_H = "h-[72px]"

function ResourceStatCard({
  glyphKind,
  label,
  value,
  labelClassName,
  valueClassName,
}: {
  glyphKind: ResourceGlyphKind
  label: string
  value: string
  labelClassName: string
  valueClassName: string
}) {
  return (
    <div
      className={`flex ${RESOURCE_CARD_W} ${CARD_H} shrink-0 flex-col justify-center rounded-lg border border-muted-foreground/15 bg-[hsl(var(--progress-bg))] px-3 py-2 shadow-inner`}
    >
      <span className="flex items-center gap-1.5">
        <ResourceGlyph kind={glyphKind} />
        <span
          className={`text-[9px] font-bold uppercase tracking-[0.18em] leading-none ${labelClassName}`}
        >
          {label}
        </span>
      </span>
      <span
        className={`mt-1.5 min-h-[1.5rem] truncate text-left text-lg font-bold font-sans leading-tight tabular-nums tracking-normal ${valueClassName}`}
        title={value}
      >
        {value}
      </span>
    </div>
  )
}

export const Header: React.FC = () => {
  const { state } = useGame()

  return (
    <header className="relative z-50 flex min-h-[88px] shrink-0 items-center justify-between gap-4 overflow-x-auto border-b border-muted-foreground/10 bg-secondary/50 px-4 py-3 supports-[backdrop-filter]:backdrop-blur-sm">
      {/* Título: faixa fixa */}
      <div className={`${TITLE_W} shrink-0`}>
        <h1 className="text-xl font-bold leading-tight tracking-tight">
          Breaking Eternity
        </h1>
      </div>

      {/* Recursos em cartões — larguras fixas, sem media queries */}
      <div className="flex shrink-0 items-center gap-3">
        <ResourceStatCard
          glyphKind="base"
          label="Recurso base"
          value={formatNumber(state.resources)}
          labelClassName="text-muted-foreground"
          valueClassName="text-primary"
        />
        <ResourceStatCard
          glyphKind="essence"
          label="Essência"
          value={formatEssenceAmount(state.essence)}
          labelClassName="text-emerald-700/90 dark:text-emerald-400/90"
          valueClassName="text-emerald-700 dark:text-emerald-400"
        />
        <ResourceStatCard
          glyphKind="milestone"
          label="Moedas"
          value={formatNumber(new Decimal(state.milestoneCurrency))}
          labelClassName="text-milestone-currency/80"
          valueClassName="text-milestone-currency"
        />
      </div>
    </header>
  )
}
