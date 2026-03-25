import React, { useRef, useCallback, useEffect } from "react"
import { useGame } from "@/components/game-provider"
import {
  formatNumber,
  getGeneratorCost,
  formatTime,
  formatCycleDuration,
  getMilestoneBarProgress,
  getNextMilestoneGoalForBar,
  countPendingMilestones,
  getPendingMilestoneCurrency,
  getEffectiveDuration,
  getEffectiveProductionPerCycle,
  getEffectiveProductionPerSecond,
  PRODUCTION_BAR_VISUAL_SLOW_THRESHOLD_MS,
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

const GeneratorRow: React.FC<{
  gen: any
  resources: Decimal
  buyGenerator: (id: string) => void
  claimGeneratorMilestones: (id: string) => void
  registerBar: (id: string, el: HTMLDivElement | null) => void
}> = ({ gen, resources, buyGenerator, claimGeneratorMilestones, registerBar }) => {
  const cost = getGeneratorCost(gen)
  const canAfford = resources.gte(cost)
  const totalProduction = getEffectiveProductionPerCycle(gen)
  const effectiveDurMs = getEffectiveDuration(gen)
  const barShowPerSecond = effectiveDurMs < PRODUCTION_BAR_VISUAL_SLOW_THRESHOLD_MS
  const productionPerSecond = getEffectiveProductionPerSecond(gen)
  const claimed = gen.claimedMilestoneExponents ?? []
  const genIndex = parseInt(gen.id.replace("generator", ""), 10) || 1
  const pendingMarcos = countPendingMilestones(gen.level, claimed)
  const pendingMilestoneCoins = getPendingMilestoneCurrency(
    gen.level,
    claimed,
    genIndex
  )
  const milestoneFill = getMilestoneBarProgress(gen.level, claimed)
  const nextMarco = getNextMilestoneGoalForBar(gen.level, claimed)
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
      <div className="h-10 min-w-[48px] px-2 bg-[hsl(var(--progress-bg))] border border-muted-foreground/15 rounded-lg flex items-center justify-center">
        <h2 className="text-[14px] font-medium tracking-wide">
          {gen.id.replace("generator", "")}
        </h2>
      </div>

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
                    {formatNumber(gen.level)}
                  </span>
                </div>
              </div>
              {pendingMilestoneCoins > 0 ? (
                <span
                  className="pointer-events-none absolute -right-1 -top-1 z-10 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-md border border-milestone-currency bg-white px-1 text-[10px] font-bold tabular-nums leading-none text-milestone-currency shadow-md dark:bg-white"
                  aria-hidden
                >
                  {pendingMilestoneCoins}
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
            <p className="mt-1 text-xs text-muted-foreground">
              Ao resgatar:{" "}
              <span className="font-semibold text-milestone-currency tabular-nums">
                {pendingMilestoneCoins}
              </span>{" "}
              moeda(s)
              {pendingMarcos > 1 ? ` (${pendingMarcos} marcos)` : null}
            </p>
          ) : null}
        </TooltipContent>
      </Tooltip>

      {/* 3. Progress Bar Card */}
      <div className="flex-1 relative h-10 bg-[hsl(var(--progress-bg))] rounded-lg overflow-hidden border border-muted-foreground/15 shadow-inner group">
        {/* Base Fill - GPU Accelerated */}
        <div 
          ref={(el) => registerBar(gen.id, el)}
          className="absolute top-0 left-0 h-full w-full bg-[hsl(var(--progress-fill))] border-r border-[hsl(var(--progress-fill))/0.5] origin-left will-change-transform"
          style={{ transform: 'scaleX(0)' }}
        />
        
        {/* Labels inside the bar (Refined 14px Medium) */}
        <div
          className={`absolute inset-0 flex items-center px-5 font-sans text-[14px] font-medium tabular-nums tracking-normal text-white mix-blend-difference pointer-events-none ${
            barShowPerSecond ? "justify-end" : "justify-between"
          }`}
        >
          {!barShowPerSecond ? (
            <span className="drop-shadow-sm">{formatCycleDuration(effectiveDurMs)}</span>
          ) : null}
          <span className="drop-shadow-sm">
            {barShowPerSecond
              ? `${formatNumber(productionPerSecond)}/s`
              : formatNumber(totalProduction)}
          </span>
        </div>
      </div>

      {/* 4. Buy Button Card (With Hold-to-Buy) */}
      {canAfford ? (
        <Button
          onMouseDown={startBuying}
          onMouseUp={stopBuying}
          onMouseLeave={stopBuying}
          className="h-10 min-w-[160px] rounded-lg border border-muted-foreground/15 px-6 text-[14px] font-medium tracking-wide shadow-none transition-transform active:scale-[0.98] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Comprar
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-default">
              <Button
                disabled
                className="h-10 min-w-[160px] rounded-lg border border-muted-foreground/15 px-6 text-[14px] font-medium tracking-wide shadow-none bg-secondary/50 text-muted-foreground"
              >
                Comprar
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span className="text-sm font-semibold tabular-nums text-destructive">
              {formatNumber(cost)}
            </span>
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
    registerBar,
    offlineProgress,
    clearOfflineProgress,
  } = useGame()

  // Dynamic rendering of all generators
  const generators = Object.values(state.generators)

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
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recurso base
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  +{formatNumber(offlineProgress.resourcesGained)}
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
                    {Object.keys(offlineProgress.finalLevels)
                      .sort(
                        (a, b) =>
                          parseInt(a.replace("generator", ""), 10) -
                          parseInt(b.replace("generator", ""), 10)
                      )
                      .map((id) => {
                        const initial =
                          offlineProgress.initialLevels[id] ?? new Decimal(0)
                        const final =
                          offlineProgress.finalLevels[id] ?? new Decimal(0)
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

      {generators.map((gen) => (
        <GeneratorRow
          key={gen.id}
          gen={gen}
          resources={state.resources}
          buyGenerator={buyGenerator}
          claimGeneratorMilestones={claimGeneratorMilestones}
          registerBar={registerBar}
        />
      ))}
    </div>
  )
}
