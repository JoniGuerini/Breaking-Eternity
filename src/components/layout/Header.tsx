import React from "react"
import { useGame } from "@/components/game-provider"
import { formatNumber } from "@/lib/game-logic"

export const Header: React.FC = () => {
  const { state, fps } = useGame()

  const getFpsColor = () => {
    if (fps >= 60) return "text-green-500"
    if (fps >= 30) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <header className="border-b border-muted-foreground/10 bg-secondary/50 p-4 flex items-center justify-between sticky top-0 z-50">
      {/* Left side: Game Title */}
      <div className="w-1/3 flex justify-start">
        <h1 className="text-xl font-bold tracking-tight">Breaking Eternity</h1>
      </div>

      {/* Center: Basic Resource Display */}
      <div className="w-1/3 flex flex-col items-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
          Recurso Base
        </span>
        <span className="text-xl font-mono font-black text-primary leading-tight">
          {formatNumber(state.resources)}
        </span>
      </div>

      {/* Right side: FPS Counter */}
      <div className="w-1/3 flex justify-end items-center">
        {state.showFps && (
          <span className={`font-mono text-[14px] font-bold ${getFpsColor()}`}>
            {fps} FPS
          </span>
        )}
      </div>
    </header>
  )
}
