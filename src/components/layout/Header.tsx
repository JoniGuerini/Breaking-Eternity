import React from "react"
import Decimal from "break_eternity.js"
import { useGame } from "@/components/game-provider"
import {
  ResourceGlyph,
  type ResourceGlyphKind,
} from "@/components/resource-glyph"
import {
  ESSENCE_PASSIVE_CYCLE_MS,
  formatEssenceAmount,
  formatNumber,
  getEssencePassivePerPulse,
  isEssencePassiveUnlocked,
} from "@/lib/game-logic"

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
  secondaryValue,
  secondaryClassName,
}: {
  glyphKind: ResourceGlyphKind
  label: string
  value: string
  labelClassName: string
  valueClassName: string
  secondaryValue?: string
  secondaryClassName?: string
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
      <div className="mt-1.5 flex min-h-[1.5rem] min-w-0 items-baseline gap-2">
        <span
          className={`min-w-0 flex-1 truncate text-left text-lg font-bold font-sans leading-tight tabular-nums tracking-normal ${valueClassName}`}
          title={value}
        >
          {value}
        </span>
        {secondaryValue != null ? (
          <span
            className={`shrink-0 text-right text-[11px] font-semibold font-sans tabular-nums leading-none tracking-normal ${secondaryClassName ?? "text-muted-foreground"}`}
            title={secondaryValue}
          >
            {secondaryValue}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export const Header: React.FC = () => {
  const { state } = useGame()

  const essencePerSecond = isEssencePassiveUnlocked(state.generators)
    ? getEssencePassivePerPulse(state).times(1000 / ESSENCE_PASSIVE_CYCLE_MS)
    : new Decimal(0)

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
          secondaryValue={`${formatNumber(essencePerSecond)}/s`}
          secondaryClassName="text-emerald-600/90 dark:text-emerald-300/90"
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
