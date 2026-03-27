import React from "react"
import { useGame } from "@/components/game-provider"
import {
  formatNumber,
  formatCycleDuration,
  formatCritChancePercent,
  getEffectiveDuration,
  getEffectiveProductionPerCycle,
  getNextMilestoneUpgradeCost,
  getGlobalPurchaseDiscountUpgradeCost,
  getEssencePassivePerPulseFromRanks,
  canBuyDurationUpgrade,
  canBuyCritChanceUpgrade,
  getCritChanceUpgradeCost,
  getCritMultiplier,
  getCritMultiplierUpgradeCost,
  getCritChance,
  CRIT_CHANCE_PER_RANK,
  MIN_GENERATOR_DURATION_MS,
  isEssencePassiveUnlocked,
  type Generator,
} from "@/lib/game-logic"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ResourceGlyph } from "@/components/resource-glyph"
import { Crosshair, Droplet, Flame, Percent, Timer, Zap } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Decimal from "break_eternity.js"

function nextProductionAfterUpgrade(gen: Generator): Decimal {
  const r = (gen.productionUpgradeRank ?? 0) + 1
  return gen.baseProduction.times(gen.quantity).times(new Decimal(2).pow(r))
}

function nextDurationAfterUpgradeMs(gen: Generator): number | null {
  if (!canBuyDurationUpgrade(gen)) return null
  const r = (gen.durationUpgradeRank ?? 0) + 1
  return Math.max(MIN_GENERATOR_DURATION_MS, gen.duration / Math.pow(2, r))
}

function nextCritChanceLabel(gen: Generator): string {
  const r = (gen.critChanceRank ?? 0) + 1
  return formatCritChancePercent(Math.min(1, r * CRIT_CHANCE_PER_RANK))
}

function nextCritMultiplierLabel(gen: Generator): string {
  const nextR = (gen.critMultiplierRank ?? 0) + 1
  return formatNumber(new Decimal(2).pow(nextR + 1))
}

/** Custo de compra = base ÷ este fator (2^ranque). */
function globalPurchaseDiscountLabel(rank: number): string {
  const r = Math.max(0, Math.floor(rank) || 0)
  const div = Math.pow(2, r)
  return `÷${div.toLocaleString("pt-BR")}`
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
        <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
          <span>Custo:</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-milestone-currency tabular-nums">
            <ResourceGlyph kind="milestone" />
            {cost}
          </span>
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
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-destructive">
                  <ResourceGlyph kind="milestone" />
                  {cost}
                </span>
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
  const {
    state,
    buyMilestoneUpgrade,
    buyGlobalPurchaseDiscountUpgrade,
    buyEssencePassiveUpgrade,
  } = useGame()

  const generators = Object.values(state.generators).sort(
    (a, b) =>
      parseInt(a.id.replace("generator", ""), 10) -
      parseInt(b.id.replace("generator", ""), 10)
  )

  const globalDiscRank = state.generatorPurchaseDiscountRank ?? 0
  const globalDiscCost = getGlobalPurchaseDiscountUpgradeCost(globalDiscRank)

  const essenceUnlocked = isEssencePassiveUnlocked(state.generators)
  const flatRank = state.essencePassiveFlatRank ?? 0
  const multRank = state.essencePassiveMultiplierRank ?? 0
  const essencePerPulse = getEssencePassivePerPulseFromRanks(flatRank, multRank)
  const essenceNextFlat = getEssencePassivePerPulseFromRanks(flatRank + 1, multRank)
  const essenceNextMult = getEssencePassivePerPulseFromRanks(flatRank, multRank + 1)
  const flatCost = getNextMilestoneUpgradeCost(flatRank)
  const multCost = getNextMilestoneUpgradeCost(multRank)

  return (
    <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-6 font-sans scrollbar-game">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Melhorias</h2>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <span>Melhorias pagas com</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-milestone-currency">
            <ResourceGlyph kind="milestone" />
            moedas de marco
          </span>
          <span>.</span>
        </p>
      </div>

      <Tabs defaultValue="generators" className="min-h-0 flex-1 gap-4">
        <TabsList variant="line" className="w-full max-w-md justify-start">
          <TabsTrigger value="generators" className="flex-none px-3">
            Geradores
          </TabsTrigger>
          <TabsTrigger value="essence" className="flex-none gap-1.5 px-3">
            <Droplet className="size-3.5 opacity-80" aria-hidden />
            Essência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generators" className="mt-0 space-y-8 overflow-visible">
          <div className="space-y-3">
            <h3 className="text-[14px] font-medium tracking-wide text-foreground">
              <span className="inline-flex min-h-10 items-center rounded-lg border border-muted-foreground/15 bg-[hsl(var(--progress-bg))] px-3">
                Globais
              </span>
            </h3>
            <div className="grid gap-3 lg:grid-cols-2">
              <UpgradeRow
                icon={<Percent className="size-4" aria-hidden />}
                title="Desconto na compra de geradores"
                description="Cada nível reduz pela metade o recurso base e a quantidade do gerador anterior na compra."
                currentLabel={globalPurchaseDiscountLabel(globalDiscRank)}
                nextLabel={globalPurchaseDiscountLabel(globalDiscRank + 1)}
                cost={globalDiscCost}
                canBuy
                disabledReason={null}
                milestoneCurrency={state.milestoneCurrency}
                onBuy={buyGlobalPurchaseDiscountUpgrade}
              />
            </div>
          </div>

          {generators.map((gen) => {
        const n = gen.id.replace("generator", "")
        const prodRank = gen.productionUpgradeRank ?? 0
        const durRank = gen.durationUpgradeRank ?? 0
        const prodCost = getNextMilestoneUpgradeCost(prodRank)
        const durCost = getNextMilestoneUpgradeCost(durRank)
        const critChanceRank = gen.critChanceRank ?? 0
        const critMultRank = gen.critMultiplierRank ?? 0
        const critChanceCost = getCritChanceUpgradeCost(critChanceRank)
        const critMultCost = getCritMultiplierUpgradeCost(critMultRank)
        const canProd = gen.quantity.gt(0)
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

        const canCritChance =
          canBuyCritChanceUpgrade(gen) && canProd
        const currentCritChance = formatCritChancePercent(getCritChance(gen))
        const nextCritChance = canCritChance ? nextCritChanceLabel(gen) : "—"

        const currentCritMult = formatNumber(getCritMultiplier(gen))
        const nextCritMult = canProd ? nextCritMultiplierLabel(gen) : "—"

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
                description="Cada nível dobra a produção por ciclo deste gerador."
                currentLabel={currentProd}
                nextLabel={nextProd}
                cost={prodCost}
                canBuy={canProd}
                disabledReason="Precisa de pelo menos 1 unidade deste gerador."
                milestoneCurrency={state.milestoneCurrency}
                onBuy={() => buyMilestoneUpgrade(gen.id, "production")}
              />
              <UpgradeRow
                icon={<Timer className="size-4" aria-hidden />}
                title="Tempo de ciclo"
                description="Cada nível reduz o tempo de ciclo pela metade."
                currentLabel={currentDur}
                nextLabel={canDur ? nextDur : "Ranque máximo"}
                cost={durCost}
                canBuy={canDur}
                disabledReason="Ciclo já no tempo mínimo (0,1s)."
                milestoneCurrency={state.milestoneCurrency}
                onBuy={() => buyMilestoneUpgrade(gen.id, "duration")}
              />
              <UpgradeRow
                icon={<Crosshair className="size-4" aria-hidden />}
                title="Chance de crítico"
                description="Cada nível aumenta a chance de crítico no ciclo."
                currentLabel={currentCritChance}
                nextLabel={nextCritChance}
                cost={critChanceCost}
                canBuy={canCritChance}
                disabledReason={
                  !canProd
                    ? "Precisa de pelo menos 1 unidade deste gerador."
                    : "Chance de crítico já no máximo."
                }
                milestoneCurrency={state.milestoneCurrency}
                onBuy={() => buyMilestoneUpgrade(gen.id, "critChance")}
              />
              <UpgradeRow
                icon={<Flame className="size-4" aria-hidden />}
                title="Dano do crítico"
                description="Cada nível dobra o multiplicador quando o ciclo é crítico."
                currentLabel={`×${currentCritMult}`}
                nextLabel={canProd ? `×${nextCritMult}` : "—"}
                cost={critMultCost}
                canBuy={canProd}
                disabledReason="Precisa de pelo menos 1 unidade deste gerador."
                milestoneCurrency={state.milestoneCurrency}
                onBuy={() => buyMilestoneUpgrade(gen.id, "critMultiplier")}
              />
            </div>
          </div>
        )
      })}
        </TabsContent>

        <TabsContent value="essence" className="mt-0 space-y-4 overflow-visible">
          <p className="text-[12px] leading-snug text-muted-foreground">
            A essência passiva só corre com pelo menos um gerador com quantidade ≥ 1. O ciclo é de 1 segundo; os valores abaixo são por segundo.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <UpgradeRow
              icon={<Droplet className="size-4" aria-hidden />}
              title="Ritmo fixo de essência"
              description="Cada nível soma +1 essência por segundo à produção passiva (antes do multiplicador)."
              currentLabel={`${formatNumber(essencePerPulse)}/s`}
              nextLabel={`${formatNumber(essenceNextFlat)}/s`}
              cost={flatCost}
              canBuy={essenceUnlocked}
              disabledReason="Precisa de pelo menos um gerador com quantidade ≥ 1."
              milestoneCurrency={state.milestoneCurrency}
              onBuy={() => buyEssencePassiveUpgrade("flat")}
            />
            <UpgradeRow
              icon={<Zap className="size-4" aria-hidden />}
              title="Multiplicador de essência passiva"
              description="Cada nível dobra toda a essência gerada por segundo de forma passiva."
              currentLabel={`${formatNumber(essencePerPulse)}/s`}
              nextLabel={`${formatNumber(essenceNextMult)}/s`}
              cost={multCost}
              canBuy={essenceUnlocked}
              disabledReason="Precisa de pelo menos um gerador com quantidade ≥ 1."
              milestoneCurrency={state.milestoneCurrency}
              onBuy={() => buyEssencePassiveUpgrade("multiplier")}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
