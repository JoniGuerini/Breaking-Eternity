import React from "react"
import { useGame } from "@/components/game-provider"
import {
  formatNumber,
  formatCycleDuration,
  getEffectiveDuration,
  getEffectiveProductionPerCycle,
  getNextMilestoneUpgradeCost,
  canBuyDurationUpgrade,
  getDurationUpgradeCap,
  MIN_GENERATOR_DURATION_MS,
  type Generator,
} from "@/lib/game-logic"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Timer, Zap } from "lucide-react"
import Decimal from "break_eternity.js"

function nextProductionAfterUpgrade(gen: Generator): Decimal {
  const r = (gen.productionUpgradeRank ?? 0) + 1
  return gen.baseProduction.times(gen.level).times(new Decimal(2).pow(r))
}

function nextDurationAfterUpgradeMs(gen: Generator): number | null {
  if (!canBuyDurationUpgrade(gen)) return null
  const r = (gen.durationUpgradeRank ?? 0) + 1
  return Math.max(MIN_GENERATOR_DURATION_MS, gen.duration / Math.pow(2, r))
}

const UpgradeRow: React.FC<{
  icon: React.ReactNode
  title: string
  description: string
  currentLabel: string
  nextLabel: string
  cost: number
  canBuy: boolean
  disabledReason: string | null
  milestoneCurrency: number
  onBuy: () => void
}> = ({
  icon,
  title,
  description,
  currentLabel,
  nextLabel,
  cost,
  canBuy,
  disabledReason,
  milestoneCurrency,
  onBuy,
}) => {
  const affordable = milestoneCurrency >= cost
  const disabled = !canBuy || !affordable

  const button = (
    <Button
      type="button"
      disabled={disabled}
      onClick={onBuy}
      className={`h-9 shrink-0 rounded-lg border border-muted-foreground/15 px-4 text-[14px] font-medium tracking-wide shadow-none transition-transform active:scale-[0.98] ${
        disabled
          ? "bg-secondary/50 text-muted-foreground"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      Comprar
    </Button>
  )

  return (
    <div className="rounded-lg border border-muted-foreground/15 bg-[hsl(var(--progress-bg))] p-4">
      <div className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 text-milestone-currency">{icon}</span>
        <div>
          <h3 className="text-[14px] font-medium tracking-wide text-foreground">{title}</h3>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mb-3 font-sans text-[14px] font-medium tabular-nums tracking-normal">
        <span className="text-muted-foreground">{currentLabel}</span>
        <span className="mx-1.5 text-muted-foreground">→</span>
        <span className="text-foreground">{nextLabel}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-muted-foreground">
          Custo:{" "}
          <span className="font-medium text-milestone-currency tabular-nums">{cost}</span>{" "}
          moeda(s)
        </span>
        {disabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">{button}</span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {!canBuy ? (
                <span>{disabledReason ?? "Indisponível"}</span>
              ) : (
                <span className="text-sm font-semibold tabular-nums text-destructive">{cost}</span>
              )}
            </TooltipContent>
          </Tooltip>
        ) : (
          button
        )}
      </div>
    </div>
  )
}

export const UpgradesPage: React.FC = () => {
  const { state, buyMilestoneUpgrade } = useGame()

  const generators = Object.values(state.generators).sort(
    (a, b) =>
      parseInt(a.id.replace("generator", ""), 10) -
      parseInt(b.id.replace("generator", ""), 10)
  )

  return (
    <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-6 font-sans scrollbar-game">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Melhorias</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use moedas de marco nas seguintes melhorias.
        </p>
      </div>

      {generators.map((gen) => {
        const n = gen.id.replace("generator", "")
        const prodRank = gen.productionUpgradeRank ?? 0
        const durRank = gen.durationUpgradeRank ?? 0
        const prodCost = getNextMilestoneUpgradeCost(prodRank)
        const durCost = getNextMilestoneUpgradeCost(durRank)
        const durCap = getDurationUpgradeCap(gen.duration)

        const multDisplay = formatNumber(new Decimal(2).pow(prodRank))

        const canProd = gen.level.gt(0)
        const currentProd = canProd
          ? formatNumber(getEffectiveProductionPerCycle(gen))
          : "0"
        const nextProd = canProd
          ? formatNumber(nextProductionAfterUpgrade(gen))
          : "—"

        const currentDur = formatCycleDuration(getEffectiveDuration(gen))
        const nextDurMs = nextDurationAfterUpgradeMs(gen)
        const canDur = canBuyDurationUpgrade(gen)
        const nextDur = canDur && nextDurMs != null ? formatCycleDuration(nextDurMs) : "—"

        return (
          <div key={gen.id} className="space-y-3">
            <h3 className="text-[14px] font-medium tracking-wide text-foreground">
              <span className="inline-flex min-h-10 items-center rounded-lg border border-muted-foreground/15 bg-[hsl(var(--progress-bg))] px-3">
                Gerador {n}
              </span>
            </h3>
            <div className="grid gap-3 lg:grid-cols-2">
              <UpgradeRow
                icon={<Zap className="size-4" aria-hidden />}
                title="Produção por ciclo"
                description={`Multiplicador actual: ×${multDisplay} por ciclo`}
                currentLabel={currentProd}
                nextLabel={nextProd}
                cost={prodCost}
                canBuy={canProd}
                disabledReason="Precisa de nível ≥ 1 neste gerador."
                milestoneCurrency={state.milestoneCurrency}
                onBuy={() => buyMilestoneUpgrade(gen.id, "production")}
              />
              <UpgradeRow
                icon={<Timer className="size-4" aria-hidden />}
                title="Tempo de ciclo"
                description={`Metade a cada nível. Mínimo ${formatCycleDuration(MIN_GENERATOR_DURATION_MS)} (até ${durCap} níveis neste gerador).`}
                currentLabel={currentDur}
                nextLabel={canDur ? nextDur : "Ranque máximo"}
                cost={durCost}
                canBuy={canDur}
                disabledReason="Ciclo já no tempo mínimo (0,1s)."
                milestoneCurrency={state.milestoneCurrency}
                onBuy={() => buyMilestoneUpgrade(gen.id, "duration")}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
