import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react"
import {
  type GameState,
  INITIAL_STATE,
  claimEligibleMilestones,
  parseGeneratorQuantity,
  getEffectiveDuration,
  getEffectiveProductionPerCycle,
  getExpectedProductionPerCycleWithCrit,
  rollProductionWithCrit,
  getNextMilestoneUpgradeCost,
  canBuyDurationUpgrade,
  canBuyCritChanceUpgrade,
  getCritChanceUpgradeCost,
  getCritMultiplierUpgradeCost,
  getGlobalPurchaseDiscountUpgradeCost,
  getDurationUpgradeCap,
  PRODUCTION_BAR_VISUAL_SLOW_THRESHOLD_MS,
  CRIT_CHANCE_MAX_RANK,
  isEssencePassiveUnlocked,
  parseEssenceFromSave,
  getEssencePassivePerPulseFromRanks,
  ESSENCE_PASSIVE_CYCLE_MS,
  applyBulkGeneratorPurchasesWithCount,
  type BulkPurchaseMode,
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
    quantity: parseGeneratorQuantity(gen.quantity ?? gen.level),
    progress:
      typeof gen.progress === "number" && Number.isFinite(gen.progress)
        ? gen.progress
        : 0,
    claimedMilestoneExponents: Array.isArray(gen.claimedMilestoneExponents)
      ? gen.claimedMilestoneExponents
      : [],
    productionUpgradeRank: prodR,
    durationUpgradeRank: durR,
    critChanceRank:
      typeof gen.critChanceRank === "number" && Number.isFinite(gen.critChanceRank)
        ? Math.max(0, Math.min(CRIT_CHANCE_MAX_RANK, Math.floor(gen.critChanceRank)))
        : base.critChanceRank ?? 0,
    critMultiplierRank:
      typeof gen.critMultiplierRank === "number" && Number.isFinite(gen.critMultiplierRank)
        ? Math.max(0, Math.floor(gen.critMultiplierRank))
        : base.critMultiplierRank ?? 0,
  }
}

interface GameContextType {
  state: GameState
  fps: number
  toggleFps: () => void
  resetGame: () => void
  buyGenerator: (id: string) => void
  bulkPurchaseMode: BulkPurchaseMode
  setBulkPurchaseMode: (m: BulkPurchaseMode) => void
  claimGeneratorMilestones: (id: string) => void
  claimAllGeneratorMilestones: () => void
  buyMilestoneUpgrade: (
    id: string,
    kind: "production" | "duration" | "critChance" | "critMultiplier"
  ) => void
  buyGlobalPurchaseDiscountUpgrade: () => void
  buyEssencePassiveUpgrade: (kind: "flat" | "multiplier") => void
  registerBar: (id: string, el: HTMLDivElement | null) => void
  offlineProgress: OfflineProgress | null
  clearOfflineProgress: () => void
}

export interface OfflineProgress {
  resourcesGained: Decimal
  essenceGained: Decimal
  /** Quantidade de cada gerador antes / depois do período offline. */
  initialQuantities: Record<string, Decimal>
  finalQuantities: Record<string, Decimal>
  timeOffline: number
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  /** Progresso do ciclo de essência passiva (ms até ao próximo pulso); não vai para o React state. */
  const essencePassiveAccMsRef = useRef(0)

  const [bulkPurchaseMode, setBulkPurchaseMode] =
    useState<BulkPurchaseMode>("1")
  const bulkPurchaseModeRef = useRef<BulkPurchaseMode>(bulkPurchaseMode)
  bulkPurchaseModeRef.current = bulkPurchaseMode

  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem("breaking-eternity-save")
    if (!saved) {
      essencePassiveAccMsRef.current = 0
      return INITIAL_STATE
    }

    try {
      const parsed = JSON.parse(saved)
      let resources = new Decimal(parsed.resources || 0)
      let essence = parseEssenceFromSave(parsed.essence)
      let essencePassiveAccMs =
        typeof parsed.essencePassiveAccMs === "number" &&
        Number.isFinite(parsed.essencePassiveAccMs)
          ? Math.max(
              0,
              Math.min(ESSENCE_PASSIVE_CYCLE_MS - 1, Math.floor(parsed.essencePassiveAccMs))
            )
          : 0
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
      const passiveEssenceWhileOffline = isEssencePassiveUnlocked(mergedGenerators)
      if (offlineTime > 5000) {
        const genIds = Object.keys(mergedGenerators).sort((a, b) => {
          const numA = parseInt(a.replace("generator", ""), 10) || 0
          const numB = parseInt(b.replace("generator", ""), 10) || 0
          return numB - numA
        })

        genIds.forEach(id => {
          const gen = mergedGenerators[id]
          if (gen.quantity.gt(0)) {
            const dur = getEffectiveDuration(gen)
            const totalPotentialTime = offlineTime + (gen.progress * dur)
            const cycles = Math.floor(totalPotentialTime / dur)
            const newProgress = (totalPotentialTime % dur) / dur

            const production = getExpectedProductionPerCycleWithCrit(gen).times(cycles)
            const genNum = parseInt(id.replace("generator", ""), 10) || 0
            
            if (genNum === 1) {
              resources = resources.plus(production)
            } else {
              const targetId = `generator${genNum - 1}`
              if (mergedGenerators[targetId]) {
                mergedGenerators[targetId] = {
                  ...mergedGenerators[targetId],
                  quantity: mergedGenerators[targetId].quantity.plus(production),
                }
              }
            }
            gen.progress = newProgress
          }
        })

        if (passiveEssenceWhileOffline) {
          const flatR =
            typeof parsed.essencePassiveFlatRank === "number" &&
            Number.isFinite(parsed.essencePassiveFlatRank)
              ? Math.max(0, Math.floor(parsed.essencePassiveFlatRank))
              : 0
          const multR =
            typeof parsed.essencePassiveMultiplierRank === "number" &&
            Number.isFinite(parsed.essencePassiveMultiplierRank)
              ? Math.max(0, Math.floor(parsed.essencePassiveMultiplierRank))
              : 0
          const perPulse = getEssencePassivePerPulseFromRanks(flatR, multR)
          const totalMs = essencePassiveAccMs + offlineTime
          const pulses = Math.floor(totalMs / ESSENCE_PASSIVE_CYCLE_MS)
          essencePassiveAccMs = totalMs % ESSENCE_PASSIVE_CYCLE_MS
          essence = essence.plus(perPulse.times(pulses))
        }
      }

      essencePassiveAccMsRef.current = essencePassiveAccMs

      return {
        ...INITIAL_STATE,
        ...parsed,
        resources,
        essence,
        milestoneCurrency:
          typeof parsed.milestoneCurrency === "number" && Number.isFinite(parsed.milestoneCurrency)
            ? Math.max(0, Math.floor(parsed.milestoneCurrency))
            : 0,
        generatorPurchaseDiscountRank:
          typeof parsed.generatorPurchaseDiscountRank === "number" &&
          Number.isFinite(parsed.generatorPurchaseDiscountRank)
            ? Math.max(0, Math.floor(parsed.generatorPurchaseDiscountRank))
            : INITIAL_STATE.generatorPurchaseDiscountRank,
        essencePassiveFlatRank:
          typeof parsed.essencePassiveFlatRank === "number" &&
          Number.isFinite(parsed.essencePassiveFlatRank)
            ? Math.max(0, Math.floor(parsed.essencePassiveFlatRank))
            : INITIAL_STATE.essencePassiveFlatRank,
        essencePassiveMultiplierRank:
          typeof parsed.essencePassiveMultiplierRank === "number" &&
          Number.isFinite(parsed.essencePassiveMultiplierRank)
            ? Math.max(0, Math.floor(parsed.essencePassiveMultiplierRank))
            : INITIAL_STATE.essencePassiveMultiplierRank,
        generators: mergedGenerators,
        lastSaveTime: Date.now(),
      }
    } catch (e) {
      console.error("Initialization error:", e)
      essencePassiveAccMsRef.current = 0
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
      const initialQuantities: Record<string, Decimal> = {}
      const tempGenerators = { ...INITIAL_STATE.generators }

      if (parsed.generators) {
        Object.entries(parsed.generators).forEach(([id, gen]: [string, any]) => {
          if (tempGenerators[id]) {
            tempGenerators[id] = mergeGeneratorFromSave(tempGenerators[id], gen)
          }
        })
      }

      Object.keys(tempGenerators).forEach((id) => {
        initialQuantities[id] = new Decimal(tempGenerators[id].quantity)
      })

      const genIds = Object.keys(tempGenerators).sort((a, b) => {
        const numA = parseInt(a.replace("generator", ""), 10) || 0
        const numB = parseInt(b.replace("generator", ""), 10) || 0
        return numB - numA
      })

      const passiveEssenceWhileOffline = isEssencePassiveUnlocked(tempGenerators)

      genIds.forEach(id => {
        const gen = tempGenerators[id]
        if (gen.quantity.gt(0)) {
          const dur = getEffectiveDuration(gen)
          const totalPotentialTime = offlineTime + (gen.progress * dur)
          const cycles = Math.floor(totalPotentialTime / dur)

          const production = getExpectedProductionPerCycleWithCrit(gen).times(cycles)
          const genNum = parseInt(id.replace("generator", ""), 10) || 0
          
          if (genNum === 1) {
            resourcesGained = resourcesGained.plus(production)
          } else {
            const targetId = `generator${genNum - 1}`
            if (tempGenerators[targetId]) {
              tempGenerators[targetId] = {
                ...tempGenerators[targetId],
                quantity: tempGenerators[targetId].quantity.plus(production),
              }
            }
          }
        }
      })

      const finalQuantities: Record<string, Decimal> = {}
      Object.keys(tempGenerators).forEach(id => {
        finalQuantities[id] = new Decimal(tempGenerators[id].quantity)
      })

      let essenceGained = new Decimal(0)
      if (offlineTime > 5000 && passiveEssenceWhileOffline) {
        const essenceStart = parseEssenceFromSave(parsed.essence)
        let essence = new Decimal(essenceStart)
        let essencePassiveAccMs =
          typeof parsed.essencePassiveAccMs === "number" &&
          Number.isFinite(parsed.essencePassiveAccMs)
            ? Math.max(
                0,
                Math.min(ESSENCE_PASSIVE_CYCLE_MS - 1, Math.floor(parsed.essencePassiveAccMs))
              )
            : 0
        const flatR =
          typeof parsed.essencePassiveFlatRank === "number" &&
          Number.isFinite(parsed.essencePassiveFlatRank)
            ? Math.max(0, Math.floor(parsed.essencePassiveFlatRank))
            : 0
        const multR =
          typeof parsed.essencePassiveMultiplierRank === "number" &&
          Number.isFinite(parsed.essencePassiveMultiplierRank)
            ? Math.max(0, Math.floor(parsed.essencePassiveMultiplierRank))
            : 0
        const perPulse = getEssencePassivePerPulseFromRanks(flatR, multR)
        const totalMs = essencePassiveAccMs + offlineTime
        const pulses = Math.floor(totalMs / ESSENCE_PASSIVE_CYCLE_MS)
        essencePassiveAccMs = totalMs % ESSENCE_PASSIVE_CYCLE_MS
        essence = essence.plus(perPulse.times(pulses))
        essenceGained = essence.minus(essenceStart)
      }

      const hasQuantityChanges = Object.keys(initialQuantities).some(
        (id) => !initialQuantities[id].eq(finalQuantities[id])
      )
      if (resourcesGained.eq(0) && !hasQuantityChanges && essenceGained.eq(0)) return null

      return {
        resourcesGained,
        essenceGained,
        initialQuantities,
        finalQuantities,
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
  
  // Volatile progress tracking initialized from saved state
  const progressRef = useRef<Record<string, number>>(
    Object.fromEntries(
      Object.entries(state.generators).map(([id, g]) => [id, g.progress])
    )
  )

  // Direct DOM refs for progress bars (Zero Latency)
  const barRefs = useRef<Record<string, HTMLDivElement>>({})
  const registerBar = (id: string, el: HTMLDivElement | null) => {
    if (el) {
      barRefs.current[id] = el
      const gen = stateRef.current.generators[id]
      const p = progressRef.current[id] ?? 0
      if (gen) {
        applyProductionBarVisual(el, getEffectiveDuration(gen), p)
      } else {
        el.style.transform = "scaleX(0)"
      }
    } else {
      delete barRefs.current[id]
    }
  }

  useEffect(() => {
    const handleSave = () => {
      const stateToSave = {
        ...stateRef.current,
        essencePassiveAccMs: Math.min(
          ESSENCE_PASSIVE_CYCLE_MS - 1,
          Math.max(0, Math.floor(essencePassiveAccMsRef.current))
        ),
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

    const commitTickProgress = (
      cycleCompleted: boolean,
      resourcesAdded: Decimal,
      quantitiesAdded: Record<string, Decimal>,
      essenceGained: Decimal
    ) => {
      if (!cycleCompleted && !essenceGained.gt(0)) return
      setState((prev) => {
        const nextGenerators = { ...prev.generators }
        Object.entries(quantitiesAdded).forEach(([targetId, amount]) => {
          const tg = nextGenerators[targetId]
          if (!tg) return
          nextGenerators[targetId] = {
            ...tg,
            quantity: tg.quantity.plus(amount),
          }
        })
        return {
          ...prev,
          resources: prev.resources.plus(resourcesAdded),
          essence: essenceGained.gt(0)
            ? prev.essence.plus(essenceGained)
            : prev.essence,
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
      const quantitiesAdded: Record<string, Decimal> = {}
      const gens = stateRef.current.generators
      let essenceGained = new Decimal(0)
      if (isEssencePassiveUnlocked(gens)) {
        essencePassiveAccMsRef.current += dt
        const st = stateRef.current
        const perPulse = getEssencePassivePerPulseFromRanks(
          st.essencePassiveFlatRank ?? 0,
          st.essencePassiveMultiplierRank ?? 0
        )
        while (essencePassiveAccMsRef.current >= ESSENCE_PASSIVE_CYCLE_MS) {
          essencePassiveAccMsRef.current -= ESSENCE_PASSIVE_CYCLE_MS
          essenceGained = essenceGained.plus(perPulse)
        }
      }

      const generators = gens
      for (const id in generators) {
        const gen = generators[id]
        if (gen.quantity.gt(0)) {
          const duration = getEffectiveDuration(gen)
          if (duration <= 0) continue

          const prev = progressRef.current[id] || 0
          const totalMs = prev * duration + dt
          const cycles = Math.floor(totalMs / duration)
          progressRef.current[id] = (totalMs % duration) / duration

          if (cycles > 0) {
            cycleCompleted = true
            const basePerCycle = getEffectiveProductionPerCycle(gen)
            const totalProd = rollProductionWithCrit(basePerCycle, cycles, gen)
            const genNum = parseInt(id.replace("generator", ""), 10) || 0
            if (genNum === 1) {
              resourcesAdded = resourcesAdded.plus(totalProd)
            } else {
              const targetId = `generator${genNum - 1}`
              const prevAdd = quantitiesAdded[targetId] ?? new Decimal(0)
              quantitiesAdded[targetId] = prevAdd.plus(totalProd)
            }
          }

          const bar = barRefs.current[id]
          if (bar) {
            applyProductionBarVisual(bar, duration, progressRef.current[id])
          }
        }
        /* Quantidade 0: não avança ciclo nem altera progressRef — barra fica congelada no último %. */
      }

      commitTickProgress(cycleCompleted, resourcesAdded, quantitiesAdded, essenceGained)
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
        const t0 = performance.now()
        const dt = t0 - lastTime
        lastTime = t0
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
    essencePassiveAccMsRef.current = 0
    setState(INITIAL_STATE)
  }

  const buyGenerator = (id: string) => {
    setState((prev) => {
      const { state: next, count } = applyBulkGeneratorPurchasesWithCount(
        prev,
        id,
        bulkPurchaseModeRef.current
      )
      if (count === 0) return prev
      return next
    })
  }

  const claimGeneratorMilestones = (id: string) => {
    setState((prev) => {
      const gen = prev.generators[id]
      if (!gen) return prev
      const claimed = gen.claimedMilestoneExponents ?? []
      const genIndex = parseInt(id.replace("generator", ""), 10) || 1
      const { nextClaimed, coinsGained } = claimEligibleMilestones(
        gen.quantity,
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
          gen.quantity,
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

  const buyGlobalPurchaseDiscountUpgrade = () => {
    setState((prev) => {
      const rank = prev.generatorPurchaseDiscountRank ?? 0
      const cost = getGlobalPurchaseDiscountUpgradeCost(rank)
      if (prev.milestoneCurrency < cost) return prev
      return {
        ...prev,
        milestoneCurrency: prev.milestoneCurrency - cost,
        generatorPurchaseDiscountRank: rank + 1,
      }
    })
  }

  const buyEssencePassiveUpgrade = (kind: "flat" | "multiplier") => {
    setState((prev) => {
      if (!isEssencePassiveUnlocked(prev.generators)) return prev
      if (kind === "flat") {
        const rank = prev.essencePassiveFlatRank ?? 0
        const cost = getNextMilestoneUpgradeCost(rank)
        if (prev.milestoneCurrency < cost) return prev
        return {
          ...prev,
          milestoneCurrency: prev.milestoneCurrency - cost,
          essencePassiveFlatRank: rank + 1,
        }
      }
      const rank = prev.essencePassiveMultiplierRank ?? 0
      const cost = getNextMilestoneUpgradeCost(rank)
      if (prev.milestoneCurrency < cost) return prev
      return {
        ...prev,
        milestoneCurrency: prev.milestoneCurrency - cost,
        essencePassiveMultiplierRank: rank + 1,
      }
    })
  }

  const buyMilestoneUpgrade = (
    id: string,
    kind: "production" | "duration" | "critChance" | "critMultiplier"
  ) => {
    setState((prev) => {
      const gen = prev.generators[id]
      if (!gen) return prev

      let cost: number
      let nextGen: Generator

      if (kind === "production") {
        const rank = gen.productionUpgradeRank ?? 0
        cost = getNextMilestoneUpgradeCost(rank)
        nextGen = { ...gen, productionUpgradeRank: rank + 1 }
      } else if (kind === "duration") {
        const rank = gen.durationUpgradeRank ?? 0
        if (!canBuyDurationUpgrade(gen)) return prev
        cost = getNextMilestoneUpgradeCost(rank)
        const oldD = getEffectiveDuration(gen)
        const ng = { ...gen, durationUpgradeRank: rank + 1 }
        const newD = getEffectiveDuration(ng)
        const p = progressRef.current[id] ?? 0
        progressRef.current[id] = newD > 0 ? Math.min(1, (p * oldD) / newD) : p
        nextGen = ng
      } else if (kind === "critChance") {
        const rank = gen.critChanceRank ?? 0
        if (!canBuyCritChanceUpgrade(gen)) return prev
        cost = getCritChanceUpgradeCost(rank)
        nextGen = { ...gen, critChanceRank: rank + 1 }
      } else {
        const rank = gen.critMultiplierRank ?? 0
        cost = getCritMultiplierUpgradeCost(rank)
        nextGen = { ...gen, critMultiplierRank: rank + 1 }
      }

      if (prev.milestoneCurrency < cost) return prev

      return {
        ...prev,
        milestoneCurrency: prev.milestoneCurrency - cost,
        generators: {
          ...prev.generators,
          [id]: nextGen,
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
    bulkPurchaseMode,
    setBulkPurchaseMode,
    claimGeneratorMilestones,
    claimAllGeneratorMilestones,
    buyMilestoneUpgrade,
    buyGlobalPurchaseDiscountUpgrade,
    buyEssencePassiveUpgrade,
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
