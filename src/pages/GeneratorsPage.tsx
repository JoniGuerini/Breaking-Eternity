import React, { useRef, useCallback, useEffect } from "react"
import { useGame } from "@/components/game-provider"
import { formatNumber, getGeneratorCost, formatTime } from "@/lib/game-logic"
import { Button } from "@/components/ui/button"
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
  gen: any; 
  resources: Decimal; 
  buyGenerator: (id: string) => void;
  registerBar: (id: string, el: HTMLDivElement | null) => void;
}> = ({ gen, resources, buyGenerator, registerBar }) => {
  const cost = getGeneratorCost(gen)
  const canAfford = resources.gte(cost)
  const totalProduction = gen.baseProduction.times(gen.level)
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

  return (
    <div className="flex items-center gap-2 w-full">
      {/* 1. Name Card (Simplified Index) */}
      <div className="h-10 min-w-[48px] px-2 bg-[hsl(var(--progress-bg))] border border-muted-foreground/15 rounded-lg flex items-center justify-center">
        <h2 className="text-[14px] font-medium tracking-wide">
          {gen.id.replace("generator", "")}
        </h2>
      </div>

      {/* 2. Quantity Card (Fixed Width for Stability) */}
      <div className="h-10 w-24 bg-[hsl(var(--progress-bg))] border border-muted-foreground/15 rounded-lg flex items-center justify-center shrink-0">
        <span className="text-[14px] font-medium font-mono">
          {formatNumber(new Decimal(gen.level))}
        </span>
      </div>

      {/* 3. Progress Bar Card */}
      <div className="flex-1 relative h-10 bg-[hsl(var(--progress-bg))] rounded-lg overflow-hidden border border-muted-foreground/15 shadow-inner group">
        {/* Base Fill - GPU Accelerated */}
        <div 
          ref={(el) => registerBar(gen.id, el)}
          className="absolute top-0 left-0 h-full w-full bg-[hsl(var(--progress-fill))] border-r border-[hsl(var(--progress-fill))/0.5] origin-left will-change-transform"
          style={{ transform: 'scaleX(0)' }}
        />
        
        {/* Labels inside the bar (Refined 14px Medium) */}
        <div className="absolute inset-0 flex items-center justify-between px-5 font-mono font-medium text-[14px] pointer-events-none tracking-normal mix-blend-difference text-white">
          <span className="drop-shadow-sm">
            {formatTime(gen.duration)}
          </span>
          <span className="drop-shadow-sm">
            {formatNumber(totalProduction)}
          </span>
        </div>
      </div>

      {/* 4. Buy Button Card (With Hold-to-Buy) */}
      <Button 
        onMouseDown={startBuying}
        onMouseUp={stopBuying}
        onMouseLeave={stopBuying}
        disabled={!canAfford}
        className={`h-10 px-6 border border-muted-foreground/15 text-[14px] font-medium tracking-wide min-w-[160px] rounded-lg shadow-none active:scale-[0.98] transition-transform ${canAfford ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary/50 text-muted-foreground'}`}
      >
        Comprar
      </Button>
    </div>
  )
}

export const GeneratorsPage: React.FC = () => {
  const { state, buyGenerator, registerBar, offlineProgress, clearOfflineProgress } = useGame()

  // Dynamic rendering of all generators
  const generators = Object.values(state.generators)

  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto w-full font-sans relative">
      {/* Welcome Back Dialog */}
      <AlertDialog open={!!offlineProgress} onOpenChange={(open) => !open && clearOfflineProgress()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Bem-vindo de volta!</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Sua produção continuou enquanto você estava fora por {offlineProgress && formatTime(offlineProgress.timeOffline)}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-none">
            {/* Resources Gained */}
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recurso Base</span>
              <span className="text-lg font-mono font-bold text-primary">
                +{offlineProgress && formatNumber(offlineProgress.resourcesGained)} Sx
              </span>
            </div>

            {/* Generator Gains */}
            {offlineProgress && (
              <div className="space-y-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1 blur-[0.2px]">Produção Offline</span>
                <div className="grid gap-2">
                  {Object.keys(offlineProgress.initialLevels)
                    .sort((a, b) => parseInt(a.replace("generator", ""), 10) - parseInt(b.replace("generator", ""), 10))
                    .map((id) => {
                      const initial = offlineProgress.initialLevels[id]
                      const final = offlineProgress.finalLevels[id]
                      const gained = final - initial
                      
                      // Only show if it has a level or gained something
                      if (initial === 0 && gained === 0) return null

                      return (
                        <div key={id} className="flex items-center justify-between p-3 bg-card border border-border/40 rounded-md shadow-sm">
                          <span className="text-sm font-bold text-zinc-300">Gerador {id.replace("generator", "")}</span>
                          <div className="flex items-center gap-2 font-mono text-sm leading-none">
                            <span className="text-zinc-500">{formatNumber(new Decimal(initial))}</span>
                            <span className="text-zinc-600">→</span>
                            <span className="text-primary font-bold">{formatNumber(new Decimal(final))}</span>
                            <span className="text-green-500 font-bold ml-1">(+{formatNumber(new Decimal(gained))})</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={clearOfflineProgress} className="w-full sm:w-auto h-11 font-bold">
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
          registerBar={registerBar}
        />
      ))}
    </div>
  )
}
