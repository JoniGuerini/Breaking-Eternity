import React, { useMemo } from "react"
import Decimal from "break_eternity.js"
import { useGame } from "@/components/game-provider"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatNumber, getTotalPendingMilestoneCurrency } from "@/lib/game-logic"
import { Coins, LayoutGrid, Settings, Sparkles } from "lucide-react"

export const Footer: React.FC = () => {
  const { fps, state, claimAllGeneratorMilestones } = useGame()

  const pendingMilestoneCoins = useMemo(
    () => getTotalPendingMilestoneCurrency(state.generators),
    [state.generators]
  )

  const fpsColor =
    fps >= 60 ? "text-green-500" : fps >= 30 ? "text-yellow-500" : "text-red-500"

  return (
    <footer className="relative z-50 shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 px-2 py-3 sm:gap-3 sm:px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingMilestoneCoins === 0}
                onClick={claimAllGeneratorMilestones}
                className="h-9 gap-1.5 rounded-lg border-milestone-currency/35 bg-background/80 px-2.5 text-[12px] font-medium text-milestone-currency shadow-none hover:bg-milestone-currency/10 hover:text-milestone-currency sm:h-10 sm:px-3 sm:text-sm"
              >
                <Coins className="size-4 shrink-0" aria-hidden />
                <span className="max-w-[7rem] truncate sm:max-w-none">
                  Resgatar marcos
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[min(18rem,calc(100vw-2rem))]">
            <p className="text-xs">
              Resgatar todas as moedas pendentes de todos os geradores de uma vez.
              {pendingMilestoneCoins > 0 ? (
                <>
                  {" "}
                  <span className="font-semibold tabular-nums text-milestone-currency">
                    +{formatNumber(new Decimal(pendingMilestoneCoins))}
                  </span>{" "}
                  moeda(s) disponíveis.
                </>
              ) : null}
            </p>
          </TooltipContent>
        </Tooltip>
        <div className="flex min-w-0 flex-1 justify-center">
          <TabsList className="grid h-11 w-full max-w-2xl grid-cols-3 gap-1 rounded-xl p-1 sm:h-12 sm:max-w-3xl">
          <TabsTrigger
            value="generators"
            className="group gap-1.5 rounded-lg px-2 text-[12px] sm:gap-2 sm:px-3 sm:text-sm"
          >
            <LayoutGrid className="size-4 shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-foreground" />
            Geradores
          </TabsTrigger>
          <TabsTrigger
            value="upgrades"
            className="group gap-1.5 rounded-lg px-2 text-[12px] sm:gap-2 sm:px-3 sm:text-sm"
          >
            <Sparkles className="size-4 shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-foreground" />
            Melhorias
          </TabsTrigger>
          <TabsTrigger
            value="options"
            className="group gap-1.5 rounded-lg px-2 text-[12px] sm:gap-2 sm:px-3 sm:text-sm"
          >
            <Settings className="size-4 shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-foreground" />
            Opções
          </TabsTrigger>
        </TabsList>
        </div>
      </div>
      {state.showFps ? (
        <span
          className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-sans text-[11px] font-bold tabular-nums sm:right-3 sm:text-[13px] ${fpsColor}`}
          aria-live="polite"
        >
          {fps} FPS
        </span>
      ) : null}
    </footer>
  )
}
