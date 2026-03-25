import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import { type GameState, INITIAL_STATE, getGeneratorCost } from "@/lib/game-logic"
import Decimal from "break_eternity.js"

interface GameContextType {
  state: GameState
  fps: number
  toggleFps: () => void
  resetGame: () => void
  buyGenerator: (id: string) => void
  registerBar: (id: string, el: HTMLDivElement | null) => void
  offlineProgress: OfflineProgress | null
  clearOfflineProgress: () => void
}

export interface OfflineProgress {
  resourcesGained: Decimal
  initialLevels: Record<string, number>
  finalLevels: Record<string, number>
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
            mergedGenerators[id] = {
              ...mergedGenerators[id],
              level: gen.level || 0,
              progress: gen.progress || 0,
            }
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
          if (gen.level > 0) {
            const totalPotentialTime = offlineTime + (gen.progress * gen.duration)
            const cycles = Math.floor(totalPotentialTime / gen.duration)
            const newProgress = (totalPotentialTime % gen.duration) / gen.duration
            
            const production = gen.baseProduction.times(gen.level).times(cycles)
            const genNum = parseInt(id.replace("generator", ""), 10) || 0
            
            if (genNum === 1) {
              resources = resources.plus(production)
            } else {
              const targetId = `generator${genNum - 1}`
              if (mergedGenerators[targetId]) {
                mergedGenerators[targetId].level += production.toNumber()
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
      const initialLevels: Record<string, number> = {}
      const tempGenerators = { ...INITIAL_STATE.generators }
      
      if (parsed.generators) {
        Object.entries(parsed.generators).forEach(([id, gen]: [string, any]) => {
          if (tempGenerators[id]) {
            tempGenerators[id] = { ...tempGenerators[id], level: gen.level || 0, progress: gen.progress || 0 }
            initialLevels[id] = gen.level || 0
          }
        })
      }

      const genIds = Object.keys(tempGenerators).sort((a, b) => {
        const numA = parseInt(a.replace("generator", ""), 10) || 0
        const numB = parseInt(b.replace("generator", ""), 10) || 0
        return numB - numA
      })

      genIds.forEach(id => {
        const gen = tempGenerators[id]
        if (gen.level > 0) {
          const totalPotentialTime = offlineTime + (gen.progress * gen.duration)
          const cycles = Math.floor(totalPotentialTime / gen.duration)
          
          const production = gen.baseProduction.times(gen.level).times(cycles)
          const genNum = parseInt(id.replace("generator", ""), 10) || 0
          
          if (genNum === 1) {
            resourcesGained = resourcesGained.plus(production)
          } else {
            const targetId = `generator${genNum - 1}`
            if (tempGenerators[targetId]) {
              tempGenerators[targetId].level += production.toNumber()
            }
          }
        }
      })

      const finalLevels: Record<string, number> = {}
      Object.keys(tempGenerators).forEach(id => {
        finalLevels[id] = tempGenerators[id].level
      })

      const hasLevelChanges = Object.keys(initialLevels).some(id => initialLevels[id] !== finalLevels[id])
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

  useEffect(() => {
    let animationFrameId: number
    let lastTime = performance.now()

    const gameLoop = (currentTime: number) => {
      const delta = currentTime - lastTime
      lastTime = currentTime
      const safeDelta = Math.min(delta, 100)

      frameCountRef.current++
      if (currentTime - lastFpsUpdateRef.current >= 1000) {
        setFps(frameCountRef.current)
        frameCountRef.current = 0
        lastFpsUpdateRef.current = currentTime
      }

      let cycleCompleted = false
      let resourcesAdded = new Decimal(0)
      const levelsAdded: Record<string, number> = {}

      const generators = stateRef.current.generators
      for (const id in generators) {
        const gen = generators[id]
        if (gen.level > 0) {
          progressRef.current[id] = (progressRef.current[id] || 0) + (safeDelta / gen.duration)
          
          if (progressRef.current[id] >= 1) {
            cycleCompleted = true
            const cycles = Math.floor(progressRef.current[id])
            const totalProd = gen.baseProduction.times(gen.level).times(cycles)
            
            const genNum = parseInt(id.replace("generator", ""))
            if (genNum === 1) {
              resourcesAdded = resourcesAdded.plus(totalProd)
            } else {
              const targetId = `generator${genNum - 1}`
              levelsAdded[targetId] = (levelsAdded[targetId] || 0) + totalProd.toNumber()
            }
            
            progressRef.current[id] %= 1
          }
          
          const bar = barRefs.current[id]
          if (bar) {
            bar.style.transform = `scaleX(${progressRef.current[id]})`
          }
        }
      }

      if (cycleCompleted) {
        setState(prev => {
          const nextGenerators = { ...prev.generators }
          Object.entries(levelsAdded).forEach(([targetId, amount]) => {
            if (nextGenerators[targetId]) {
              nextGenerators[targetId] = {
                ...nextGenerators[targetId],
                level: nextGenerators[targetId].level + amount
              }
            }
          })

          return {
            ...prev,
            resources: prev.resources.plus(resourcesAdded),
            generators: nextGenerators
          }
        })
      }

      animationFrameId = requestAnimationFrame(gameLoop)
    }

    animationFrameId = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  const toggleFps = () => {
    setState(prev => ({ ...prev, showFps: !prev.showFps }))
  }

  const resetGame = () => {
    localStorage.removeItem("breaking-eternity-save")
    Object.keys(progressRef.current).forEach(id => {
      progressRef.current[id] = 0
      if (barRefs.current[id]) barRefs.current[id].style.transform = 'scaleX(0)'
    })
    setState(INITIAL_STATE)
  }

  const buyGenerator = (id: string) => {
    setState(prev => {
      const gen = prev.generators[id]
      if (!gen) return prev
      const cost = getGeneratorCost(gen)
      if (prev.resources.gte(cost)) {
        return {
          ...prev,
          resources: prev.resources.minus(cost),
          generators: {
            ...prev.generators,
            [id]: { ...gen, level: gen.level + 1 },
          },
        }
      }
      return prev
    })
  }

  const value = {
    state,
    fps,
    toggleFps,
    resetGame,
    buyGenerator,
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
