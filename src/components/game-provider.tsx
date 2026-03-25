import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import {
  type GameState,
  INITIAL_STATE,
  getGeneratorCost,
  claimEligibleMilestones,
  parseGeneratorLevel,
  getEffectiveDuration,
  getEffectiveProductionPerCycle,
  getNextMilestoneUpgradeCost,
  canBuyDurationUpgrade,
  getDurationUpgradeCap,
  PRODUCTION_BAR_VISUAL_SLOW_THRESHOLD_MS,
  type Generator,
} from "@/lib/game-logic"
import Decimal from "break_eternity.js"

function applyProductionBarVisual(
  bar: HTMLDivElement,
  durationMs: number,
  progress01: number
) {
  if (durationMs < PRODUCTION_BAR_VISUAL_SLOW_THRESHOLD_MS) {
    bar.style.transform = "scaleX(1)"
  } else {
    bar.style.transform = `scaleX(${progress01})`
  }
}

function mergeGeneratorFromSave(base: Generator, gen: any): Generator {
  const prodR =
    typeof gen.productionUpgradeRank === "number" && Number.isFinite(gen.productionUpgradeRank)
      ? Math.max(0, Math.floor(gen.productionUpgradeRank))
      : base.productionUpgradeRank ?? 0
  let durR =
    typeof gen.durationUpgradeRank === "number" && Number.isFinite(gen.durationUpgradeRank)
      ? Math.max(0, Math.floor(gen.durationUpgradeRank))
      : base.durationUpgradeRank ?? 0
  durR = Math.min(durR, getDurationUpgradeCap(base.duration))
  return {
    ...base,
    level: parseGeneratorLevel(gen.level),
    progress: gen.progress || 0,
    claimedMilestoneExponents: Array.isArray(gen.claimedMilestoneExponents)
      ? gen.claimedMilestoneExponents
      : [],
    productionUpgradeRank: prodR,
    durationUpgradeRank: durR,
  }
}

interface GameContextType {
  state: GameState
  fps: number
  toggleFps: () => void
  resetGame: () => void
  buyGenerator: (id: string) => void
  claimGeneratorMilestones: (id: string) => void
  claimAllGeneratorMilestones: () => void
  buyMilestoneUpgrade: (id: string, kind: "production" | "duration") => void
  registerBar: (id: string, el: HTMLDivElement | null) => void
  offlineProgress: OfflineProgress | null
  clearOfflineProgress: () => void
}

export interface OfflineProgress {
  resourcesGained: Decimal
  initialLevels: Record<string, Decimal>
  finalLevels: Record<string, Decimal>
  timeOffline: number
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem("breaking-eternity-save")
    if (!saved) return INITIAL_STATE

    try {
      const parsed = JSON.parse(saved)
      let resources = new Decimal(parsed.resources || 0)
      const mergedGenerators = { ...INITIAL_STATE.generators }
      
      if (parsed.generators) {
        Object.entries(parsed.generators).forEach(([id, gen]: [string, any]) => {
          if (mergedGenerators[id]) {
            mergedGenerators[id] = mergeGeneratorFromSave(mergedGenerators[id], gen)
          }
        })
      }

      const lastSave = parsed.lastSaveTime || Date.now()
      const offlineTime = Date.now() - lastSave
      
      // Silent Offline Production (maintain game balance)
      if (offlineTime > 5000) {
        const genIds = Object.keys(mergedGenerators).sort((a, b) => {
          const numA = parseInt(a.replace("generator", ""), 10) || 0
          const numB = parseInt(b.replace("generator", ""), 10) || 0
          return numB - numA
        })

        genIds.forEach(id => {
          const gen = mergedGenerators[id]
          if (gen.level.gt(0)) {
            const dur = getEffectiveDuration(gen)
            const totalPotentialTime = offlineTime + (gen.progress * dur)
            const cycles = Math.floor(totalPotentialTime / dur)
            const newProgress = (totalPotentialTime % dur) / dur

            const production = getEffectiveProductionPerCycle(gen).times(cycles)
            const genNum = parseInt(id.replace("generator", ""), 10) || 0
            
            if (genNum === 1) {
              resources = resources.plus(production)
            } else {
              const targetId = `generator${genNum - 1}`
              if (mergedGenerators[targetId]) {
                mergedGenerators[targetId] = {
                  ...mergedGenerators[targetId],
                  level: mergedGenerators[targetId].level.plus(production),
                }
              }
            }
            gen.progress = newProgress
          }
        })
      }

      return {
        ...INITIAL_STATE,
        ...parsed,
        resources,
        milestoneCurrency:
          typeof parsed.milestoneCurrency === "number" && Number.isFinite(parsed.milestoneCurrency)
            ? Math.max(0, Math.floor(parsed.milestoneCurrency))
            : 0,
        generators: mergedGenerators,
        lastSaveTime: Date.now(),
      }
    } catch (e) {
      console.error("Initialization error:", e)
      return INITIAL_STATE
    }
  })

  const [offlineProgress, setOfflineProgress] = useState<OfflineProgress | null>(() => {
    const saved = localStorage.getItem("breaking-eternity-save")
    if (!saved) return null
    try {
      const parsed = JSON.parse(saved)
      const lastSave = parsed.lastSaveTime || Date.now()
      const offlineTime = Date.now() - lastSave
      if (offlineTime < 5000) return null

      let resourcesGained = new Decimal(0)
      const initialLevels: Record<string, Decimal> = {}
      const tempGenerators = { ...INITIAL_STATE.generators }

      if (parsed.generators) {
        Object.entries(parsed.generators).forEach(([id, gen]: [string, any]) => {
          if (tempGenerators[id]) {
            tempGenerators[id] = mergeGeneratorFromSave(tempGenerators[id], gen)
          }
        })
      }

      Object.keys(tempGenerators).forEach((id) => {
        initialLevels[id] = new Decimal(tempGenerators[id].level)
      })

      const genIds = Object.keys(tempGenerators).sort((a, b) => {
        const numA = parseInt(a.replace("generator", ""), 10) || 0
        const numB = parseInt(b.replace("generator", ""), 10) || 0
        return numB - numA
      })

      genIds.forEach(id => {
        const gen = tempGenerators[id]
        if (gen.level.gt(0)) {
          const dur = getEffectiveDuration(gen)
          const totalPotentialTime = offlineTime + (gen.progress * dur)
          const cycles = Math.floor(totalPotentialTime / dur)

          const production = getEffectiveProductionPerCycle(gen).times(cycles)
          const genNum = parseInt(id.replace("generator", ""), 10) || 0
          
          if (genNum === 1) {
            resourcesGained = resourcesGained.plus(production)
          } else {
            const targetId = `generator${genNum - 1}`
            if (tempGenerators[targetId]) {
              tempGenerators[targetId] = {
                ...tempGenerators[targetId],
                level: tempGenerators[targetId].level.plus(production),
              }
            }
          }
        }
      })

      const finalLevels: Record<string, Decimal> = {}
      Object.keys(tempGenerators).forEach(id => {
        finalLevels[id] = new Decimal(tempGenerators[id].level)
      })

      const hasLevelChanges = Object.keys(initialLevels).some(
        (id) => !initialLevels[id].eq(finalLevels[id])
      )
      if (resourcesGained.eq(0) && !hasLevelChanges) return null

      return {
        resourcesGained,
        initialLevels,
        finalLevels,
        timeOffline: offlineTime
      }
    } catch (e) {
      return null
    }
  })

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const [fps, setFps] = useState(0)
  const frameCountRef = useRef(0)
  const lastFpsUpdateRef = useRef(0)
  
  // Direct DOM refs for progress bars (Zero Latency)
  const barRefs = useRef<Record<string, HTMLDivElement>>({})
  const registerBar = (id: string, el: HTMLDivElement | null) => {
    if (el) {
      barRefs.current[id] = el
      el.style.transform = `scaleX(0)`
    } else {
      delete barRefs.current[id]
    }
  }

  // Volatile progress tracking initialized from saved state
  const progressRef = useRef<Record<string, number>>(
    Object.fromEntries(
      Object.entries(state.generators).map(([id, g]) => [id, g.progress])
    )
  )

  useEffect(() => {
    const handleSave = () => {
      const stateToSave = {
        ...stateRef.current,
        lastSaveTime: Date.now(),
        generators: Object.fromEntries(
          Object.entries(stateRef.current.generators).map(([id, gen]) => [
            id,
            { ...gen, progress: progressRef.current[id] || 0 }
          ])
        )
      }
      localStorage.setItem("breaking-eternity-save", JSON.stringify(stateToSave))
    }

    const saveInterval = setInterval(handleSave, 1000)
    window.addEventListener("beforeunload", handleSave)

    return () => {
      clearInterval(saveInterval)
      window.removeEventListener("beforeunload", handleSave)
    }
  }, [])

  // Com aba visível: requestAnimationFrame; cada frame usa applyTickDelta(Δt real).
  // Com aba em segundo plano: rAF pausa → setInterval aplica delta por tempo real.
  useEffect(() => {
    let rafId: number | null = null
    let intervalId: number | null = null
    let lastTime = performance.now()
    lastFpsUpdateRef.current = lastTime

    const MAX_DELTA_MS = 1000 * 60 * 60 * 24 * 7

    const commitProduction = (
      cycleCompleted: boolean,
      resourcesAdded: Decimal,
      levelsAdded: Record<string, Decimal>
    ) => {
      if (!cycleCompleted) return
      setState((prev) => {
        const nextGenerators = { ...prev.generators }
        Object.entries(levelsAdded).forEach(([targetId, amount]) => {
          if (nextGenerators[targetId]) {
            nextGenerators[targetId] = {
              ...nextGenerators[targetId],
              level: nextGenerators[targetId].level.plus(amount),
            }
          }
        })
        return {
          ...prev,
          resources: prev.resources.plus(resourcesAdded),
          generators: nextGenerators,
        }
      })
    }

    /** Avanço exato para qualquer Δt (fundo / hitch / volta à aba). */
    const applyTickDelta = (deltaMs: number) => {
      if (deltaMs <= 0) return

      const dt = Math.min(deltaMs, MAX_DELTA_MS)
      let cycleCompleted = false
      let resourcesAdded = new Decimal(0)
      const levelsAdded: Record<string, Decimal> = {}

      const generators = stateRef.current.generators
      for (const id in generators) {
        const gen = generators[id]
        if (gen.level.gt(0)) {
          const duration = getEffectiveDuration(gen)
          const prev = progressRef.current[id] || 0
          const totalMs = prev * duration + dt
          const cycles = Math.floor(totalMs / duration)
          progressRef.current[id] = (totalMs % duration) / duration

          if (cycles > 0) {
            cycleCompleted = true
            const totalProd = getEffectiveProductionPerCycle(gen).times(cycles)
            const genNum = parseInt(id.replace("generator", ""), 10) || 0
            if (genNum === 1) {
              resourcesAdded = resourcesAdded.plus(totalProd)
            } else {
              const targetId = `generator${genNum - 1}`
              const prevAdd = levelsAdded[targetId] ?? new Decimal(0)
              levelsAdded[targetId] = prevAdd.plus(totalProd)
            }
          }

          const bar = barRefs.current[id]
          if (bar) {
            applyProductionBarVisual(bar, duration, progressRef.current[id])
          }
        }
      }

      commitProduction(cycleCompleted, resourcesAdded, levelsAdded)
    }

    const gameLoop = (currentTime: number) => {
      const delta = currentTime - lastTime
      lastTime = currentTime

      applyTickDelta(Math.min(delta, MAX_DELTA_MS))

      frameCountRef.current += 1
      if (currentTime - lastFpsUpdateRef.current >= 1000) {
        setFps(frameCountRef.current)
        frameCountRef.current = 0
        lastFpsUpdateRef.current = currentTime
      }

      rafId = requestAnimationFrame(gameLoop)
    }

    const backgroundTick = () => {
      const now = performance.now()
      const dt = now - lastTime
      lastTime = now
      applyTickDelta(Math.min(dt, MAX_DELTA_MS))
    }

    const startVisibleLoop = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
      lastTime = performance.now()
      rafId = requestAnimationFrame(gameLoop)
    }

    const startBackgroundLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      lastTime = performance.now()
      intervalId = window.setInterval(backgroundTick, 250)
    }

    const onVisibility = () => {
      if (document.hidden) {
        startBackgroundLoop()
      } else {
        const now = performance.now()
        const dt = now - lastTime
        lastTime = now
        applyTickDelta(Math.min(dt, MAX_DELTA_MS))
        startVisibleLoop()
      }
    }

    document.addEventListener("visibilitychange", onVisibility)

    if (document.hidden) {
      startBackgroundLoop()
    } else {
      rafId = requestAnimationFrame(gameLoop)
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (intervalId !== null) window.clearInterval(intervalId)
    }
  }, [])

  const toggleFps = () => {
    setState(prev => ({ ...prev, showFps: !prev.showFps }))
  }

  const resetGame = () => {
    localStorage.removeItem("breaking-eternity-save")
    Object.keys(progressRef.current).forEach((id) => {
      progressRef.current[id] = 0
      const bar = barRefs.current[id]
      if (bar) {
        bar.style.transform = "scaleX(0)"
      }
    })
    setState(INITIAL_STATE)
  }

  const buyGenerator = (id: string) => {
    setState((prev) => {
      const gen = prev.generators[id]
      if (!gen) return prev
      const cost = getGeneratorCost(gen)
      if (prev.resources.cmp(cost) < 0) return prev
      return {
        ...prev,
        resources: prev.resources.minus(cost),
        generators: {
          ...prev.generators,
          [id]: {
            ...gen,
            level: gen.level.plus(1),
            claimedMilestoneExponents: gen.claimedMilestoneExponents ?? [],
          },
        },
      }
    })
  }

  const claimGeneratorMilestones = (id: string) => {
    setState((prev) => {
      const gen = prev.generators[id]
      if (!gen) return prev
      const claimed = gen.claimedMilestoneExponents ?? []
      const genIndex = parseInt(id.replace("generator", ""), 10) || 1
      const { nextClaimed, coinsGained } = claimEligibleMilestones(
        gen.level,
        claimed,
        genIndex
      )
      if (coinsGained === 0) return prev
      return {
        ...prev,
        milestoneCurrency: prev.milestoneCurrency + coinsGained,
        generators: {
          ...prev.generators,
          [id]: { ...gen, claimedMilestoneExponents: nextClaimed },
        },
      }
    })
  }

  const claimAllGeneratorMilestones = () => {
    setState((prev) => {
      let totalCoins = 0
      const nextGenerators = { ...prev.generators }
      let changed = false
      for (const id of Object.keys(nextGenerators)) {
        const gen = nextGenerators[id]
        const genIndex = parseInt(id.replace("generator", ""), 10) || 1
        const claimed = gen.claimedMilestoneExponents ?? []
        const { nextClaimed, coinsGained } = claimEligibleMilestones(
          gen.level,
          claimed,
          genIndex
        )
        if (coinsGained > 0) {
          changed = true
          totalCoins += coinsGained
          nextGenerators[id] = { ...gen, claimedMilestoneExponents: nextClaimed }
        }
      }
      if (!changed) return prev
      return {
        ...prev,
        milestoneCurrency: prev.milestoneCurrency + totalCoins,
        generators: nextGenerators,
      }
    })
  }

  const buyMilestoneUpgrade = (id: string, kind: "production" | "duration") => {
    setState((prev) => {
      const gen = prev.generators[id]
      if (!gen) return prev
      const rank =
        kind === "production"
          ? gen.productionUpgradeRank ?? 0
          : gen.durationUpgradeRank ?? 0
      const cost = getNextMilestoneUpgradeCost(rank)
      if (prev.milestoneCurrency < cost) return prev
      if (kind === "duration" && !canBuyDurationUpgrade(gen)) return prev

      if (kind === "duration") {
        const oldD = getEffectiveDuration(gen)
        const nextGen = { ...gen, durationUpgradeRank: rank + 1 }
        const newD = getEffectiveDuration(nextGen)
        const p = progressRef.current[id] ?? 0
        progressRef.current[id] = newD > 0 ? Math.min(1, (p * oldD) / newD) : p
      }

      return {
        ...prev,
        milestoneCurrency: prev.milestoneCurrency - cost,
        generators: {
          ...prev.generators,
          [id]:
            kind === "production"
              ? { ...gen, productionUpgradeRank: rank + 1 }
              : { ...gen, durationUpgradeRank: rank + 1 },
        },
      }
    })
  }

  const value = {
    state,
    fps,
    toggleFps,
    resetGame,
    buyGenerator,
    claimGeneratorMilestones,
    claimAllGeneratorMilestones,
    buyMilestoneUpgrade,
    registerBar,
    offlineProgress,
    clearOfflineProgress: () => setOfflineProgress(null),
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) throw new Error("useGame must be used within GameProvider")
  return context
}
