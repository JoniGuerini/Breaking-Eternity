import React from "react"
import Decimal from "break_eternity.js"
import { useGame } from "@/components/game-provider"
import { formatNumber } from "@/lib/game-logic"

export const Header: React.FC = () => {
  const { state } = useGame()

  return (
    <header className="relative z-50 flex shrink-0 items-center justify-between border-b border-muted-foreground/10 bg-secondary/50 p-4 overflow-visible">
      {/* Left side: Game Title */}
      <div className="w-1/3 flex justify-start">
        <h1 className="text-xl font-bold tracking-tight">Breaking Eternity</h1>
      </div>

      {/* Center: Basic Resource Display */}
      <div className="w-1/3 flex flex-col items-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
          Recurso Base
        </span>
        <span className="text-xl font-sans font-black text-primary leading-tight tabular-nums">
          {formatNumber(state.resources)}
        </span>
      </div>

      {/* Right side: moedas de marco (sempre visível) */}
      <div className="w-1/3 flex justify-end items-center gap-3 pr-2 sm:pr-3">
        <div className="text-right">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Moedas
          </span>
          <div className="text-sm font-bold font-sans tabular-nums text-milestone-currency">
            {formatNumber(new Decimal(state.milestoneCurrency))}
          </div>
        </div>
      </div>
    </header>
  )
}
