import React, {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useGame } from "@/components/game-provider"
import {
  formatNumber,
  countGeneratorPurchasesForMode,
  applyBulkGeneratorPurchasesWithCount,
  BULK_PREVIEW_MAX_ITERATIONS,
  getGeneratorCost,
  getPreviousGeneratorQuantityCost,
  GENERATOR_ESSENCE_COST,
  formatTime,
  formatCycleDuration,
  getMilestoneBarProgress,
  getNextMilestoneGoalForBar,
  countPendingMilestones,
  getPendingMilestoneCurrency,
  getEffectiveDuration,
  getExpectedProductionPerCycleWithCrit,
  getEffectiveProductionPerSecond,
  getTotalPendingMilestoneCurrency,
  formatEssenceAmount,
  PRODUCTION_BAR_VISUAL_SLOW_THRESHOLD_MS,
  type BulkPurchaseMode,
  type GameState,
  type Generator,
} from "@/lib/game-logic"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Decimal from "break_eternity.js"
import { GeneratorIndexCard } from "@/components/generator-index-card"
import {
  ResourceGlyph,
  RESOURCE_GLYPH_COLUMN_CLASS,
} from "@/components/resource-glyph"

function generatorSortIndex(gen: Generator): number {
  return parseInt(gen.id.replace("generator", ""), 10) || 0
}

type BulkPreviewEntry = { count: number; capped: boolean }

/**
 * Modo 1×: barato por tick. % / Marco: simulação limitada (`BULK_PREVIEW_MAX_ITERATIONS`) e
 * repartida por `requestAnimationFrame` (um gerador por frame) para não travar o jogo avançado.
 */
const HEAVY_PREVIEW_REFRESH_MS = 320

function useBulkPurchasePreviewCounts(
  gameState: GameState,
  mode: BulkPurchaseMode
): Record<string, BulkPreviewEntry> {
  const stateRef = useRef(gameState)
  stateRef.current = gameState

  const oneXPreview = useMemo(() => {
    const out: Record<string, BulkPreviewEntry> = {}
    for (const id of Object.keys(gameState.generators)) {
      out[id] = {
        count: countGeneratorPurchasesForMode(gameState, id, "1"),
        capped: false,
      }
    }
    return out
  }, [gameState])

  const [heavyPreview, setHeavyPreview] = useState<Record<string, BulkPreviewEntry>>({})
  const waveGenRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (mode === "1") return

    let cancelled = false

    const clearRaf = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    const runWave = () => {
      if (cancelled) return
      clearRaf()
      const myWave = ++waveGenRef.current
      const snapshot = stateRef.current
      const ids = Object.keys(snapshot.generators).sort(
        (a, b) =>
          generatorSortIndex(snapshot.generators[a]!) -
          generatorSortIndex(snapshot.generators[b]!)
      )
      const acc: Record<string, BulkPreviewEntry> = {}
      let i = 0

      const step = () => {
        if (cancelled || myWave !== waveGenRef.current) return
        if (i >= ids.length) {
          rafRef.current = null
          setHeavyPreview(acc)
          return
        }
        const gid = ids[i]!
        i += 1
        const r = applyBulkGeneratorPurchasesWithCount(snapshot, gid, mode, {
          maxIterations: BULK_PREVIEW_MAX_ITERATIONS,
        })
        acc[gid] = { count: r.count, capped: r.capped }
        rafRef.current = requestAnimationFrame(step)
      }

      rafRef.current = requestAnimationFrame(step)
    }

    runWave()
    const intervalId = window.setInterval(runWave, HEAVY_PREVIEW_REFRESH_MS)

    return () => {
      cancelled = true
      clearRaf()
      window.clearInterval(intervalId)
    }
  }, [mode])

  return mode === "1" ? oneXPreview : heavyPreview
}

const GeneratorRow: React.FC<{
  gen: Generator
  purchaseDiscountRank: number
  bulkPurchaseMode: BulkPurchaseMode
  previewEntry: BulkPreviewEntry
  buyGenerator: (id: string) => void
  claimGeneratorMilestones: (id: string) => void
  registerBar: (id: string, el: HTMLDivElement | null) => void
}> = ({
  gen,
  purchaseDiscountRank,
  bulkPurchaseMode,
  previewEntry,
  buyGenerator,
  claimGeneratorMilestones,
  registerBar,
}) => {
  const setProductionBarRef = useCallback(
    (el: HTMLDivElement | null) => {
      registerBar(gen.id, el)
    },
    [gen.id, registerBar]
  )

  const genIndex = parseInt(gen.id.replace("generator", ""), 10) || 1
  const cost = getGeneratorCost(gen, purchaseDiscountRank)
  const prevQuantityCost = getPreviousGeneratorQuantityCost(
    genIndex,
    purchaseDiscountRank
  )

  const canAfford = previewEntry.count > 0

  const buyButtonLabel = useMemo(() => {
    const { count, capped } = previewEntry
    if (count <= 0) return "Comprar"
    if (bulkPurchaseMode === "1" && count === 1) return "Comprar"
    const n = formatNumber(new Decimal(count))
    return capped ? `Comprar ×${n}+` : `Comprar ×${n}`
  }, [previewEntry, bulkPurchaseMode])
  const totalProduction = getExpectedProductionPerCycleWithCrit(gen)
  const effectiveDurMs = getEffectiveDuration(gen)
  const barShowPerSecond = effectiveDurMs < PRODUCTION_BAR_VISUAL_SLOW_THRESHOLD_MS
  const productionPerSecond = getEffectiveProductionPerSecond(gen)
  const claimed = gen.claimedMilestoneExponents ?? []
  const pendingMarcos = countPendingMilestones(gen.quantity, claimed)
  const pendingMilestoneCoins = getPendingMilestoneCurrency(
    gen.quantity,
    claimed,
    genIndex
  )
  const pendingMilestoneCoinsLabel = formatNumber(
    new Decimal(pendingMilestoneCoins)
  )
  const milestoneFill = getMilestoneBarProgress(gen.quantity, claimed)
  const nextMarco = getNextMilestoneGoalForBar(gen.quantity, claimed)
  const timerRef = useRef<any>(null)

  const stopBuying = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startBuying = useCallback(() => {
    stopBuying()
    // Initial buy
    buyGenerator(gen.id)
    
    // Series buy (10 times per second)
    timerRef.current = setInterval(() => {
      buyGenerator(gen.id)
    }, 100)
  }, [buyGenerator, gen.id, stopBuying])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopBuying()
  }, [stopBuying])

  // Segurar "Comprar" dispara compras a cada 100ms; sem isto o intervalo pode continuar
  // ao mudar de janela/aba (mouseleave/mouseup não disparam) e drenar recursos "sozinho".
  useEffect(() => {
    const stop = () => stopBuying()
    const onVis = () => {
      if (document.hidden) stop()
    }
    window.addEventListener("blur", stop)
    window.addEventListener("pointerup", stop)
    window.addEventListener("pointercancel", stop)
    document.addEventListener("visibilitychange", onVis)
    return () => {
      window.removeEventListener("blur", stop)
      window.removeEventListener("pointerup", stop)
      window.removeEventListener("pointercancel", stop)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [stopBuying])

  return (
    <div className="flex items-center gap-2 w-full">
      {/* 1. Name Card (Simplified Index) */}
      <GeneratorIndexCard index={genIndex} size="row" />

      {/* 2. Quantidade + barra de marco (clique resgata moedas pendentes) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0">
            <button
              type="button"
              disabled={pendingMilestoneCoins === 0}
              onClick={() => claimGeneratorMilestones(gen.id)}
              className={`relative h-10 w-[5.75rem] shrink-0 overflow-visible rounded-lg border border-muted-foreground/15 bg-[hsl(var(--progress-bg))] text-center transition-[box-shadow,transform] active:scale-[0.98] ${
                pendingMilestoneCoins > 0 ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
                <div
                  className="absolute top-0 left-0 h-full w-full origin-left border-r border-r-milestone-currency bg-milestone-currency will-change-transform"
                  style={{ transform: `scaleX(${milestoneFill})` }}
                  aria-hidden
                />
                <div className="relative flex h-full items-center justify-center px-1.5">
                  <span className="text-[13px] font-semibold font-sans tabular-nums leading-none tracking-normal text-neutral-950 dark:text-white dark:drop-shadow-[0_0_1px_rgba(0,0,0,0.55),0_1px_2px_rgba(0,0,0,0.35)]">
                    {formatNumber(gen.quantity)}
                  </span>
                </div>
              </div>
              {pendingMilestoneCoins > 0 ? (
                <span
                  className="pointer-events-none absolute -right-1 -top-1 z-10 flex min-h-[1.125rem] max-w-[min(5.5rem,calc(100vw-6rem))] min-w-[1.125rem] items-center justify-center rounded-md border border-milestone-currency bg-white px-1 text-[10px] font-bold tabular-nums leading-none text-milestone-currency shadow-md dark:bg-white"
                  aria-hidden
                  title={pendingMilestoneCoinsLabel}
                >
                  <span className="truncate">{pendingMilestoneCoinsLabel}</span>
                </span>
              ) : null}
            </button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs text-muted-foreground">Próximo marco</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatNumber(nextMarco)}
          </p>
          {pendingMilestoneCoins > 0 ? (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>Ao resgatar:</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-milestone-currency tabular-nums">
                <ResourceGlyph kind="milestone" />
                {pendingMilestoneCoinsLabel}
              </span>
              {pendingMarcos > 1 ? `(${pendingMarcos} marcos)` : null}
            </p>
          ) : null}
        </TooltipContent>
      </Tooltip>

      {/* 3. Progress Bar Card */}
      <div className="group relative h-10 flex-1 overflow-hidden rounded-lg border border-muted-foreground/15 bg-[hsl(var(--progress-bg))] shadow-inner">
        <div
          ref={setProductionBarRef}
          className="absolute left-0 top-0 h-full w-full origin-left bg-[hsl(var(--progress-fill))] border-r border-[hsl(var(--progress-fill))/0.5] will-change-transform"
          style={{ transform: "scaleX(0)" }}
        />
        <div
          className={`pointer-events-none absolute inset-0 flex items-center px-5 font-sans text-[14px] font-medium tabular-nums tracking-normal ${
            barShowPerSecond ? "justify-end" : "justify-between"
          }`}
        >
          {!barShowPerSecond ? (
            <span className="text-white mix-blend-difference drop-shadow-sm">
              {formatCycleDuration(effectiveDurMs)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <span className="text-white mix-blend-difference drop-shadow-sm">
              {barShowPerSecond
                ? `${formatNumber(productionPerSecond)}/s`
                : formatNumber(totalProduction)}
            </span>
            <span className="relative z-10 shrink-0" aria-hidden>
              {genIndex === 1 ? (
                <ResourceGlyph kind="base" className="scale-110" />
              ) : (
                <GeneratorIndexCard index={genIndex} size="mini" />
              )}
            </span>
          </span>
        </div>
      </div>

      {/* 4. Buy Button Card (With Hold-to-Buy) */}
      {canAfford ? (
        <Button
          onMouseDown={startBuying}
          onMouseUp={stopBuying}
          onMouseLeave={stopBuying}
          className="h-10 min-w-[10.5rem] max-w-[min(100%,14rem)] truncate rounded-lg border border-muted-foreground/15 px-4 text-[14px] font-medium tracking-wide shadow-none transition-transform active:scale-[0.98] bg-primary text-primary-foreground hover:bg-primary/90 sm:min-w-[11.5rem] sm:px-5"
        >
          {buyButtonLabel}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-default">
              <Button
                disabled
                className="h-10 min-w-[10.5rem] max-w-[min(100%,14rem)] truncate rounded-lg border border-muted-foreground/15 px-4 text-[14px] font-medium tracking-wide shadow-none bg-secondary/50 text-muted-foreground sm:min-w-[11.5rem] sm:px-5"
              >
                {buyButtonLabel}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="flex flex-col gap-1 text-xs font-semibold tabular-nums">
              <div className="flex items-center gap-2">
                <span className={RESOURCE_GLYPH_COLUMN_CLASS}>
                  <ResourceGlyph kind="base" />
                </span>
                <span className="text-primary">{formatNumber(cost)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={RESOURCE_GLYPH_COLUMN_CLASS}>
                  <ResourceGlyph kind="essence" />
                </span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  {formatNumber(GENERATOR_ESSENCE_COST)}
                </span>
              </div>
              {genIndex > 1 && prevQuantityCost.gt(0) ? (
                <div className="flex items-center gap-2">
                  <span className={RESOURCE_GLYPH_COLUMN_CLASS}>
                    <GeneratorIndexCard index={genIndex - 1} size="mini" />
                  </span>
                  <span className="text-neutral-950 dark:text-white">
                    {formatNumber(prevQuantityCost)}
                  </span>
                </div>
              ) : null}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export const GeneratorsPage: React.FC = () => {
  const {
    state,
    buyGenerator,
    claimGeneratorMilestones,
    claimAllGeneratorMilestones,
    registerBar,
    offlineProgress,
    clearOfflineProgress,
    bulkPurchaseMode,
  } = useGame()

  const bulkPreviewCounts = useBulkPurchasePreviewCounts(state, bulkPurchaseMode)

  const generators = Object.values(state.generators)
  const sortedGenerators = useMemo(
    () => [...generators].sort((a, b) => generatorSortIndex(a) - generatorSortIndex(b)),
    [generators]
  )
  const generatorsThrough10 = sortedGenerators.filter((g) => generatorSortIndex(g) <= 10)
  const generatorsAfter10 = sortedGenerators.filter((g) => generatorSortIndex(g) > 10)

  const pendingMilestoneCoinsAll = useMemo(
    () => getTotalPendingMilestoneCurrency(state.generators),
    [state.generators]
  )

  return (
    <div className="relative min-h-0 flex-1 w-full space-y-4 overflow-y-auto p-6 font-sans scrollbar-game">
      {/* Welcome Back Dialog */}
      <AlertDialog open={!!offlineProgress} onOpenChange={(open) => !open && clearOfflineProgress()}>
        <AlertDialogContent className="flex max-h-[min(92vh,44rem)] max-w-lg flex-col gap-4 overflow-hidden">
          <AlertDialogHeader className="shrink-0 space-y-3 text-left">
            <AlertDialogTitle>Bem-vindo de volta!</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <p>
                Sua produção continuou enquanto você estava fora por{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {offlineProgress ? formatTime(offlineProgress.timeOffline) : "—"}
                </span>
                .
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {offlineProgress && (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 scrollbar-none">
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <ResourceGlyph kind="base" />
                  Recurso base
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  +{formatNumber(offlineProgress.resourcesGained)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <ResourceGlyph kind="essence" />
                  Essência
                </span>
                <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  +{formatEssenceAmount(offlineProgress.essenceGained)}
                </span>
              </div>

              <div className="overflow-x-auto px-2 pb-2 pt-2 sm:px-3">
                <table className="w-full min-w-[320px] border-collapse text-sm">
                  <caption className="sr-only">
                    Produção offline por gerador
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th
                        scope="col"
                        className="px-2 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-3"
                      >
                        Gerador
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-3"
                      >
                        Antes
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-3"
                      >
                        Atual
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-3"
                      >
                        Gerado offline
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(offlineProgress.finalQuantities)
                      .sort(
                        (a, b) =>
                          parseInt(a.replace("generator", ""), 10) -
                          parseInt(b.replace("generator", ""), 10)
                      )
                      .map((id) => {
                        const initial =
                          offlineProgress.initialQuantities[id] ?? new Decimal(0)
                        const final =
                          offlineProgress.finalQuantities[id] ?? new Decimal(0)
                        const gained = final.minus(initial)

                        return (
                          <tr
                            key={id}
                            className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/40"
                          >
                            <th
                              scope="row"
                              className="whitespace-nowrap px-2 py-2.5 text-left font-medium text-foreground sm:px-3"
                            >
                              Gerador {id.replace("generator", "")}
                            </th>
                            <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground sm:px-3">
                              {formatNumber(initial)}
                            </td>
                            <td className="px-2 py-2.5 text-right tabular-nums font-medium text-foreground sm:px-3">
                              {formatNumber(final)}
                            </td>
                            <td
                              className={`px-2 py-2.5 text-right tabular-nums font-medium sm:px-3 ${
                                gained.eq(0)
                                  ? "text-muted-foreground"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {gained.gte(0) ? "+" : ""}
                              {formatNumber(gained)}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <AlertDialogFooter className="shrink-0">
            <AlertDialogAction
              onClick={clearOfflineProgress}
              className="w-full sm:w-auto"
            >
              Continuar Produzindo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {generatorsThrough10.map((gen) => (
        <GeneratorRow
          key={gen.id}
          gen={gen}
          purchaseDiscountRank={state.generatorPurchaseDiscountRank ?? 0}
          bulkPurchaseMode={bulkPurchaseMode}
          previewEntry={
            bulkPreviewCounts[gen.id] ?? { count: 0, capped: false }
          }
          buyGenerator={buyGenerator}
          claimGeneratorMilestones={claimGeneratorMilestones}
          registerBar={registerBar}
        />
      ))}

      {/* Mesma grelha: botão só na coluna da barra de ciclo (flex-1); à direita, espaço = coluna do Comprar */}
      <div className="flex w-full items-center gap-2">
        <div
          className="h-10 min-w-[48px] shrink-0 rounded-lg border border-transparent px-2"
          aria-hidden
        />
        <div className="h-10 w-[5.75rem] shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block w-full">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pendingMilestoneCoinsAll === 0}
                  onClick={claimAllGeneratorMilestones}
                  className="h-10 w-full gap-2 truncate rounded-lg border-milestone-currency/35 bg-background/80 px-4 text-sm font-medium text-milestone-currency shadow-none hover:bg-milestone-currency/10 hover:text-milestone-currency sm:px-5"
                >
                  <ResourceGlyph kind="milestone" className="scale-125" />
                  Resgatar marcos
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[min(18rem,calc(100vw-2rem))]">
              <div className="space-y-1 text-xs">
                <p>Resgatar todas as moedas pendentes de todos os geradores de uma vez.</p>
                {pendingMilestoneCoinsAll > 0 ? (
                  <p className="flex items-center gap-1.5">
                    <ResourceGlyph kind="milestone" />
                    <span className="font-semibold tabular-nums text-milestone-currency">
                      +{formatNumber(new Decimal(pendingMilestoneCoinsAll))}
                    </span>
                  </p>
                ) : null}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        <div
          className="h-10 shrink-0 basis-[11.5rem] min-w-[10.5rem] max-w-[14rem] sm:min-w-[11.5rem]"
          aria-hidden
        />
      </div>

      {generatorsAfter10.map((gen) => (
        <GeneratorRow
          key={gen.id}
          gen={gen}
          purchaseDiscountRank={state.generatorPurchaseDiscountRank ?? 0}
          bulkPurchaseMode={bulkPurchaseMode}
          previewEntry={
            bulkPreviewCounts[gen.id] ?? { count: 0, capped: false }
          }
          buyGenerator={buyGenerator}
          claimGeneratorMilestones={claimGeneratorMilestones}
          registerBar={registerBar}
        />
      ))}
    </div>
  )
}
