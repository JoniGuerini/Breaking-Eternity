import Decimal from "break_eternity.js"

export interface Generator {
  id: string
  name: string
  /** Quantidade possuída; Decimal para suportar valores >> Number.MAX_SAFE_INTEGER. */
  level: Decimal
  /** Preço fixo em recurso base por cada compra (não escala com o nível). */
  baseCost: Decimal
  baseProduction: Decimal
  duration: number // in ms
  progress: number // 0 to 1
  /** Expoentes e com marco 10^e já resgatado (e >= 1 → 10, 100, 1k, …). */
  claimedMilestoneExponents: number[]
  /** Melhorias com moedas de marco: produção ×2 por nível (0 = sem bónus). */
  productionUpgradeRank: number
  /** Metade do tempo de ciclo por nível; máximo quando o ciclo atinge 0,1s. */
  durationUpgradeRank: number
  /** Chance de crítico por ciclo: +2,5% por ranque (0 = sem crítico). */
  critChanceRank: number
  /** Multiplicador do crítico: 2×, 4×, 8×… = 2^(ranque+1). */
  critMultiplierRank: number
}

export interface GameState {
  resources: Decimal
  /**
   * Recurso secundário: cada compra de gerador consome `GENERATOR_ESSENCE_COST`.
   * Gera passivamente em ciclos de `ESSENCE_PASSIVE_CYCLE_MS` ms após existir pelo menos um gerador com nível ≥ 1.
   * Quantidade por ciclo: ver `getEssencePassivePerPulse`.
   */
  essence: Decimal
  showFps: boolean
  lastSaveTime: number
  generators: Record<string, Generator>
  /** Moeda de marcos (futuras melhorias). */
  milestoneCurrency: number
  /**
   * Desconto global no custo de compra de todos os geradores: cada ranque divide por 2 (metade).
   * Custo efectivo = baseCost do gerador ÷ 2^ranque (o preço base não sobe com a quantidade).
   */
  generatorPurchaseDiscountRank: number
  /** +1 unidade de essência por ciclo passivo por nível (soma à base antes do multiplicador). */
  essencePassiveFlatRank: number
  /** Cada nível dobra a essência passiva por ciclo (aplica-se a base + bónus fixo). */
  essencePassiveMultiplierRank: number
}

/** Essência gasta por compra de qualquer gerador. */
export const GENERATOR_ESSENCE_COST = new Decimal(1)

/** Taxa base de geração passiva de essência (unidades por ciclo completo). */
export const ESSENCE_PASSIVE_PER_SECOND = new Decimal(1)

/** Duração do “ciclo” de essência passiva (ms): ao completar, credita a taxa efectiva de uma vez. */
export const ESSENCE_PASSIVE_CYCLE_MS = 1000

/** Essência por ciclo completo: (base + flat) × 2^mult. */
export function getEssencePassivePerPulseFromRanks(
  flatRank: number,
  multiplierRank: number
): Decimal {
  const f = Math.max(0, Math.floor(flatRank) || 0)
  const m = Math.max(0, Math.floor(multiplierRank) || 0)
  const base = ESSENCE_PASSIVE_PER_SECOND.plus(f)
  return base.times(new Decimal(2).pow(m))
}

export function getEssencePassivePerPulse(state: Pick<GameState, "essencePassiveFlatRank" | "essencePassiveMultiplierRank">): Decimal {
  return getEssencePassivePerPulseFromRanks(
    state.essencePassiveFlatRank ?? 0,
    state.essencePassiveMultiplierRank ?? 0
  )
}

export const INITIAL_STATE: GameState = {
  resources: new Decimal(10),
  essence: new Decimal(1),
  showFps: true,
  lastSaveTime: Date.now(),
  milestoneCurrency: 0,
  generatorPurchaseDiscountRank: 0,
  essencePassiveFlatRank: 0,
  essencePassiveMultiplierRank: 0,
  generators: {
    generator1: {
      id: "generator1",
      name: "Gerador 1",
      level: new Decimal(0),
      baseCost: new Decimal(10),
      baseProduction: new Decimal(3),
      duration: 2000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
    generator2: {
      id: "generator2",
      name: "Gerador 2",
      level: new Decimal(0),
      baseCost: new Decimal(100),
      baseProduction: new Decimal(4),
      duration: 4000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
    generator3: {
      id: "generator3",
      name: "Gerador 3",
      level: new Decimal(0),
      baseCost: new Decimal(1000),
      baseProduction: new Decimal(5),
      duration: 8000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
    generator4: {
      id: "generator4",
      name: "Gerador 4",
      level: new Decimal(0),
      baseCost: new Decimal(10000),
      baseProduction: new Decimal(6),
      duration: 16000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
    generator5: {
      id: "generator5",
      name: "Gerador 5",
      level: new Decimal(0),
      baseCost: new Decimal(100000),
      baseProduction: new Decimal(7),
      duration: 32000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
    generator6: {
      id: "generator6",
      name: "Gerador 6",
      level: new Decimal(0),
      baseCost: new Decimal(1000000),
      baseProduction: new Decimal(8),
      duration: 64000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
    generator7: {
      id: "generator7",
      name: "Gerador 7",
      level: new Decimal(0),
      baseCost: new Decimal(10000000),
      baseProduction: new Decimal(9),
      duration: 128000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
    generator8: {
      id: "generator8",
      name: "Gerador 8",
      level: new Decimal(0),
      baseCost: new Decimal(100000000),
      baseProduction: new Decimal(10),
      duration: 256000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
    generator9: {
      id: "generator9",
      name: "Gerador 9",
      level: new Decimal(0),
      baseCost: new Decimal(1000000000),
      baseProduction: new Decimal(11),
      duration: 512000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
    generator10: {
      id: "generator10",
      name: "Gerador 10",
      level: new Decimal(0),
      baseCost: new Decimal(10000000000),
      baseProduction: new Decimal(12),
      duration: 1024000,
      progress: 0,
      claimedMilestoneExponents: [],
      productionUpgradeRank: 0,
      durationUpgradeRank: 0,
      critChanceRank: 0,
      critMultiplierRank: 0,
    },
  },
}

const getLetterSuffix = (index: number): string => {
  let lettersCount = 2
  let currentIdx = index
  
  while (true) {
    const combinations = Math.pow(26, lettersCount)
    if (currentIdx < combinations) break
    currentIdx -= combinations
    lettersCount++
    if (lettersCount > 5) return "???" // Limit per user request (999 ZZZZZ)
  }
  
  let result = ""
  for (let i = 0; i < lettersCount; i++) {
    const charCode = Math.floor(currentIdx / Math.pow(26, lettersCount - i - 1)) % 26
    result += String.fromCharCode(65 + charCode)
  }
  return ` ${result}` // Add space before suffix
}

/** Nível de gerador a partir de save (número, string ou Decimal). */
export function parseGeneratorLevel(raw: unknown): Decimal {
  if (raw instanceof Decimal && raw.isFinite()) return raw
  if (typeof raw === "number" && Number.isFinite(raw)) return new Decimal(raw)
  if (typeof raw === "string" && raw.trim() !== "") {
    const d = new Decimal(raw)
    return d.isFinite() ? d : new Decimal(0)
  }
  return new Decimal(0)
}

const MAX_MILESTONE_EXP = 300

/** Limiar 10^e como Decimal (evita Math.pow com expoentes grandes). */
export function milestoneThresholdDecimal(exp: number): Decimal {
  if (exp < 1 || !Number.isFinite(exp)) return new Decimal(NaN)
  return new Decimal(10).pow(Math.floor(exp))
}

/** Próximo marco estritamente acima do nível actual (potência de 10). */
export function getNextMilestoneThreshold(level: Decimal): Decimal {
  if (level.lt(10)) return new Decimal(10)
  let m = new Decimal(10)
  while (m.lte(level)) {
    m = m.times(10)
  }
  return m
}

/** Próximo limiar de marco a exibir / perseguir: menor 10^e não resgatado com 10^e ≥ nível. */
export function getNextMilestoneGoalForBar(
  level: Decimal,
  claimed: readonly number[]
): Decimal {
  const set = new Set(claimed)
  for (let e = 1; e <= MAX_MILESTONE_EXP; e++) {
    const th = milestoneThresholdDecimal(e)
    if (!th.isFinite()) break
    if (set.has(e)) continue
    if (th.gte(level)) return th
  }
  return getNextMilestoneThreshold(level)
}

/** Barra 0–1 entre o limiar anterior (goal/10) e o próximo marco ainda não resgatado. */
export function getMilestoneBarProgress(
  level: Decimal,
  claimed: readonly number[]
): number {
  if (level.lt(0)) return 0
  const goal = getNextMilestoneGoalForBar(level, claimed)
  const ten = new Decimal(10)
  if (goal.lte(ten)) {
    const denom = Decimal.max(goal, ten)
    const r = level.div(denom).toNumber()
    return Math.min(1, Math.max(0, Number.isFinite(r) ? r : 0))
  }
  const prevBound = goal.div(10)
  const span = goal.minus(prevBound)
  if (span.lte(0)) return 1
  const r = level.minus(prevBound).div(span).toNumber()
  return Math.min(1, Math.max(0, Number.isFinite(r) ? r : 0))
}

/** Quantos marcos elegíveis (nível atual ≥ 10^e) ainda não resgatados. */
export function countPendingMilestones(
  level: Decimal,
  claimedExponents: readonly number[]
): number {
  const claimed = new Set(claimedExponents)
  let n = 0
  for (let e = 1; e <= MAX_MILESTONE_EXP; e++) {
    const th = milestoneThresholdDecimal(e)
    if (!th.isFinite() || th.gt(level)) break
    if (!claimed.has(e)) n++
  }
  return n
}

/** Moedas ganhas pelo marco de expoente e (1 = primeiro 10, 2 = 100, …): e × índice do gerador. */
export function getMilestoneCoinReward(
  generatorIndex: number,
  milestoneExponent: number
): number {
  const g = Math.max(1, Math.floor(generatorIndex) || 1)
  const e = Math.max(1, Math.floor(milestoneExponent) || 1)
  return g * e
}

/** Soma das moedas dos marcos pendentes (nível ≥ limiar e ainda não resgatados). */
export function getPendingMilestoneCurrency(
  level: Decimal,
  claimedExponents: readonly number[],
  generatorIndex: number
): number {
  const claimed = new Set(claimedExponents)
  let sum = 0
  for (let e = 1; e <= MAX_MILESTONE_EXP; e++) {
    const th = milestoneThresholdDecimal(e)
    if (!th.isFinite() || th.gt(level)) break
    if (!claimed.has(e)) sum += getMilestoneCoinReward(generatorIndex, e)
  }
  return sum
}

/** Total de moedas de marco pendentes em todos os geradores. */
export function getTotalPendingMilestoneCurrency(
  generators: Record<string, Generator>
): number {
  let sum = 0
  for (const id of Object.keys(generators)) {
    const gen = generators[id]
    const genIndex = parseInt(id.replace("generator", ""), 10) || 1
    const claimed = gen.claimedMilestoneExponents ?? []
    sum += getPendingMilestoneCurrency(gen.level, claimed, genIndex)
  }
  return sum
}

/** Resgata todos os marcos atualmente válidos; moedas = índice do gerador × nº do marco (1, 2, 3…). */
export function claimEligibleMilestones(
  level: Decimal,
  claimedExponents: readonly number[],
  generatorIndex: number
): { nextClaimed: number[]; coinsGained: number } {
  const set = new Set(claimedExponents)
  let coinsGained = 0
  for (let e = 1; e <= MAX_MILESTONE_EXP; e++) {
    const th = milestoneThresholdDecimal(e)
    if (!th.isFinite() || th.gt(level)) break
    if (!set.has(e)) {
      set.add(e)
      coinsGained += getMilestoneCoinReward(generatorIndex, e)
    }
  }
  const nextClaimed = [...set].sort((a, b) => a - b)
  return { nextClaimed, coinsGained }
}

export const formatNumber = (num: Decimal): string => {
  if (num.lt(1000)) return num.floor().toString()
  
  if (num.lt(1000000)) {
    // Portuguese format: 1.000
    return Math.floor(num.toNumber()).toLocaleString('pt-BR')
  }

  const standardSuffixes = ["", " M", " B", " T", " Qa", " Qi", " Sx", " Sp", " Oc", " No"]
  // log10() devolve Decimal; Math.floor(Decimal) era coerção frágil (valueOf → string).
  const logN = num.log10().toNumber()
  if (!Number.isFinite(logN)) return num.toString()
  const exp = Math.floor(logN)
  const suffixIdx = Math.floor(exp / 3) - 1
  
  if (suffixIdx < 0) return Math.floor(num.toNumber()).toLocaleString('pt-BR')
  
  // Choose suffix type
  let suffix = ""
  if (suffixIdx < standardSuffixes.length) {
    suffix = standardSuffixes[suffixIdx]
  } else {
    // Start letter suffixes from suffixIdx 10 (Decillions)
    suffix = getLetterSuffix(suffixIdx - 10)
  }
  
  const value = num.div(new Decimal(10).pow((suffixIdx + 1) * 3))
  const formattedValue = value.lt(10) 
    ? value.toFixed(1).replace(".", ",") 
    : value.toFixed(0)
    
  // Clean up if trailing ,0 (e.g. 1,0 M -> 1 M)
  const finalValue = formattedValue.endsWith(",0") 
    ? formattedValue.split(",")[0] 
    : formattedValue

  return `${finalValue}${suffix}`
}

/** Pelo menos um gerador com nível ≥ 1 → essência gera passivamente. */
export function isEssencePassiveUnlocked(generators: Record<string, Generator>): boolean {
  return Object.values(generators).some((g) => g.level.gt(0))
}

export function parseEssenceFromSave(raw: unknown): Decimal {
  try {
    if (raw === undefined || raw === null) return INITIAL_STATE.essence
    const d = new Decimal(raw as string | number)
    if (!d.isFinite()) return INITIAL_STATE.essence
    return d.lt(0) ? new Decimal(0) : d
  } catch {
    return INITIAL_STATE.essence
  }
}

/** Formatação da essência (decimais visíveis enquanto &lt; 1000). */
export function formatEssenceAmount(num: Decimal): string {
  if (!num.isFinite()) return "0"
  if (num.lt(1000)) {
    return num.toNumber().toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
  return formatNumber(num)
}

export const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

/** Duração mínima do ciclo após melhorias de tempo (0,1s). */
export const MIN_GENERATOR_DURATION_MS = 100

/** Ciclo mais rápido que isto: barra de produção fica cheia (fixa); a lógica do jogo mantém a duração real. */
export const PRODUCTION_BAR_VISUAL_SLOW_THRESHOLD_MS = 1000

/** Ranque máximo de melhoria de tempo (nº de compras permitidas) para esta duração base. */
export function getDurationUpgradeCap(baseDurationMs: number): number {
  if (!Number.isFinite(baseDurationMs) || baseDurationMs < MIN_GENERATOR_DURATION_MS) return 0
  return Math.floor(Math.log2(baseDurationMs / MIN_GENERATOR_DURATION_MS))
}

/** Ciclo efectivo (ms) com melhorias de tempo. */
export function getEffectiveDuration(gen: Generator): number {
  const rank = Math.max(0, gen.durationUpgradeRank ?? 0)
  const cap = getDurationUpgradeCap(gen.duration)
  const safeRank = Math.min(rank, cap)
  const t = gen.duration / Math.pow(2, safeRank)
  return Math.max(MIN_GENERATOR_DURATION_MS, t)
}

export function getProductionMultiplier(rank: number): Decimal {
  const r = Math.max(0, Math.floor(rank) || 0)
  return new Decimal(2).pow(r)
}

/** Produção por ciclo completo (nível × base × 2^ranque produção). */
export function getEffectiveProductionPerCycle(gen: Generator): Decimal {
  if (!gen.level.isFinite() || gen.level.lte(0)) return new Decimal(0)
  const mult = getProductionMultiplier(gen.productionUpgradeRank ?? 0)
  return gen.baseProduction.times(gen.level).times(mult)
}

/** +2,5% de chance de crítico por ranque; máximo 100%. */
export const CRIT_CHANCE_PER_RANK = 0.025
export const CRIT_CHANCE_MAX_RANK = 40

/** Acima disto, produção offline usa valor esperado em vez de sortear cada ciclo. */
export const CRIT_OFFLINE_SIMULATION_CYCLE_CAP = 8000

export function getCritChance(gen: Generator): number {
  const r = Math.max(0, Math.floor(gen.critChanceRank ?? 0))
  return Math.min(1, r * CRIT_CHANCE_PER_RANK)
}

export function formatCritChancePercent(chance01: number): string {
  const pct = chance01 * 100
  return `${pct.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

export function canBuyCritChanceUpgrade(gen: Generator): boolean {
  return (gen.critChanceRank ?? 0) < CRIT_CHANCE_MAX_RANK
}

/** Custo da melhoria de chance de crítico (mais caro que produção/tempo). */
export function getCritChanceUpgradeCost(currentRank: number): number {
  const r = Math.max(0, Math.floor(currentRank) || 0)
  return Math.pow(2, r + 4)
}

/** Multiplicador quando o crítico dispara: ranque 0 → ×2, 1 → ×4, 2 → ×8… */
export function getCritMultiplier(gen: Generator): Decimal {
  const r = Math.max(0, Math.floor(gen.critMultiplierRank ?? 0))
  return new Decimal(2).pow(r + 1)
}

export function getCritMultiplierUpgradeCost(currentRank: number): number {
  const r = Math.max(0, Math.floor(currentRank) || 0)
  return Math.pow(2, r + 2)
}

/** Valor esperado por ciclo (média a longo prazo, inclui crítico). */
export function getExpectedProductionPerCycleWithCrit(gen: Generator): Decimal {
  const base = getEffectiveProductionPerCycle(gen)
  const chance = getCritChance(gen)
  if (chance <= 0) return base
  const mult = getCritMultiplier(gen)
  return base.times(new Decimal(1).plus(new Decimal(chance).times(mult.minus(1))))
}

/**
 * Produção total de vários ciclos com sorteio de crítico por ciclo.
 * Para muitos ciclos (ex.: offline), usar valor esperado.
 */
export function rollProductionWithCrit(
  basePerCycle: Decimal,
  cycles: number,
  gen: Generator
): Decimal {
  if (cycles <= 0) return new Decimal(0)
  const chance = getCritChance(gen)
  if (chance <= 0) return basePerCycle.times(cycles)
  if (cycles > CRIT_OFFLINE_SIMULATION_CYCLE_CAP) {
    return getExpectedProductionPerCycleWithCrit(gen).times(cycles)
  }
  const mult = getCritMultiplier(gen)
  let total = new Decimal(0)
  for (let i = 0; i < cycles; i++) {
    let p = basePerCycle
    if (Math.random() < chance) {
      p = p.times(mult)
    }
    total = total.plus(p)
  }
  return total
}

/** Produção por segundo (ciclo efectivo em ms), média esperada com crítico. */
export function getEffectiveProductionPerSecond(gen: Generator): Decimal {
  const dur = getEffectiveDuration(gen)
  if (dur <= 0) return new Decimal(0)
  return getExpectedProductionPerCycleWithCrit(gen).times(1000).div(dur)
}

/** Custo da próxima melhoria: 1, 2, 4, … = 2^ranque actual. */
export function getNextMilestoneUpgradeCost(currentRank: number): number {
  const r = Math.max(0, Math.floor(currentRank) || 0)
  return Math.pow(2, r)
}

export function canBuyDurationUpgrade(gen: Generator): boolean {
  const cap = getDurationUpgradeCap(gen.duration)
  return (gen.durationUpgradeRank ?? 0) < cap
}

export function formatCycleDuration(ms: number): string {
  const sec = ms / 1000
  if (sec < 60) {
    const hasDecimals = Math.abs(sec - Math.round(sec)) > 1e-6
    return `${sec.toLocaleString("pt-BR", {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })}s`
  }
  return formatTime(ms)
}

/**
 * Quantidade (unidades possuídas) do gerador (n−1) consumida para comprar uma unidade do gerador n.
 * Balanceamento: G2←10, G3←50, G4←250, G5←5k, G6←25k, G7←500k, G8←2,5M, G9←50M, G10←250M.
 */
const PREVIOUS_GENERATOR_QUANTITY_COST: Record<number, number> = {
  2: 10,
  3: 50,
  4: 250,
  5: 5_000,
  6: 25_000,
  7: 500_000,
  8: 2_500_000,
  9: 50_000_000,
  10: 250_000_000,
}

/**
 * Quantidade do gerador anterior a consumir (0 para o gerador 1).
 * `purchaseDiscountRank`: mesmo desconto global que o recurso base (÷2 por ranque, acumula).
 */
export function getPreviousGeneratorQuantityCost(
  generatorNumber: number,
  purchaseDiscountRank = 0
): Decimal {
  const n = Math.floor(generatorNumber)
  if (n <= 1) return new Decimal(0)
  const v = PREVIOUS_GENERATOR_QUANTITY_COST[n]
  const raw =
    typeof v === "number" && Number.isFinite(v) ? new Decimal(v) : new Decimal(0)
  const r = Math.max(0, Math.floor(purchaseDiscountRank) || 0)
  return raw.div(new Decimal(2).pow(r))
}

/** Custo em recurso base antes do desconto global (preço fixo por gerador). */
export function getGeneratorBaseCostBeforeDiscount(generator: Generator): Decimal {
  return generator.baseCost
}

/**
 * Custo em recurso base para comprar mais uma unidade do gerador (fixo por tipo, salvo desconto global).
 * `purchaseDiscountRank`: ranques globais que cortam metade cada (÷2 por ranque); o mesmo ranque reduz
 * a quantidade exigida do gerador anterior — ver `getPreviousGeneratorQuantityCost`.
 */
export const getGeneratorCost = (
  generator: Generator,
  purchaseDiscountRank = 0
): Decimal => {
  const r = Math.max(0, Math.floor(purchaseDiscountRank) || 0)
  const base = getGeneratorBaseCostBeforeDiscount(generator)
  return base.div(new Decimal(2).pow(r))
}

/** Moedas de marco para o próximo ranque de desconto global na compra de geradores. */
export function getGlobalPurchaseDiscountUpgradeCost(currentRank: number): number {
  return getNextMilestoneUpgradeCost(currentRank)
}

/** Modo de compra em lote no footer (1×, % do recurso base, ou até o próximo marco). */
export type BulkPurchaseMode = "1" | "p1" | "p10" | "p50" | "p100" | "marco"

const MAX_BULK_PURCHASE_ITERATIONS = 200_000

/**
 * Limite de simulação só para o texto do botão (modos % / Marco). Evita bloquear o UI quando cada
 * compra é muito barata e o lote real vai a centenas de milhares. A compra efectiva usa
 * `MAX_BULK_PURCHASE_ITERATIONS`.
 */
export const BULK_PREVIEW_MAX_ITERATIONS = 2_500

function cloneGeneratorsMap(g: Record<string, Generator>): Record<string, Generator> {
  const o: Record<string, Generator> = {}
  for (const k of Object.keys(g)) {
    const x = g[k]!
    o[k] = {
      ...x,
      level: new Decimal(x.level),
      baseCost: new Decimal(x.baseCost),
      baseProduction: new Decimal(x.baseProduction),
      claimedMilestoneExponents: [...(x.claimedMilestoneExponents ?? [])],
    }
  }
  return o
}

function cloneGameStateForSim(state: GameState): GameState {
  return {
    ...state,
    resources: new Decimal(state.resources),
    essence: new Decimal(state.essence),
    generators: cloneGeneratorsMap(state.generators),
  }
}

/**
 * Uma compra de gerador (imutável). `null` se não der.
 */
export function applyOneGeneratorPurchase(state: GameState, id: string): GameState | null {
  const gen = state.generators[id]
  if (!gen) return null
  const rank = state.generatorPurchaseDiscountRank ?? 0
  const genNum = parseInt(id.replace("generator", ""), 10) || 0
  const prevQuantityCost = getPreviousGeneratorQuantityCost(genNum, rank)
  const prevId = genNum > 1 ? `generator${genNum - 1}` : null
  if (prevId && prevQuantityCost.gt(0)) {
    const prevGen = state.generators[prevId]
    if (!prevGen || prevGen.level.lt(prevQuantityCost)) return null
  }
  const cost = getGeneratorCost(gen, rank)
  if (state.resources.lt(cost)) return null
  if (state.essence.lt(GENERATOR_ESSENCE_COST)) return null

  const nextGenerators = { ...state.generators }
  if (prevId && prevQuantityCost.gt(0)) {
    const p = nextGenerators[prevId]!
    nextGenerators[prevId] = {
      ...p,
      level: p.level.minus(prevQuantityCost),
    }
  }
  nextGenerators[id] = {
    ...gen,
    level: gen.level.plus(1),
    claimedMilestoneExponents: gen.claimedMilestoneExponents ?? [],
  }

  return {
    ...state,
    resources: state.resources.minus(cost),
    essence: state.essence.minus(GENERATOR_ESSENCE_COST),
    generators: nextGenerators,
  }
}

/**
 * Quantas unidades seriam compradas com o modo atual (simulação; não altera o estado real).
 */
export function countGeneratorPurchasesForMode(
  state: GameState,
  id: string,
  mode: BulkPurchaseMode,
  options?: { maxIterations?: number }
): number {
  return applyBulkGeneratorPurchasesWithCount(state, id, mode, options).count
}

export interface BulkPurchaseResult {
  state: GameState
  count: number
  /** `true` se ainda era possível continuar mas o limite de iterações foi atingido. */
  capped: boolean
}

/**
 * Aplica compras em lote e devolve estado final + quantidade (0 se nada).
 */
export function applyBulkGeneratorPurchasesWithCount(
  state: GameState,
  id: string,
  mode: BulkPurchaseMode,
  options?: { maxIterations?: number }
): BulkPurchaseResult {
  const maxIterations = Math.min(
    MAX_BULK_PURCHASE_ITERATIONS,
    Math.max(1, Math.floor(options?.maxIterations ?? MAX_BULK_PURCHASE_ITERATIONS))
  )

  if (mode === "1") {
    const next = applyOneGeneratorPurchase(state, id)
    if (!next) return { state, count: 0, capped: false }
    return { state: next, count: 1, capped: false }
  }

  let sim = cloneGameStateForSim(state)
  let count = 0

  if (mode === "marco") {
    while (count < maxIterations) {
      const g = sim.generators[id]
      if (!g) break
      const goal = getNextMilestoneGoalForBar(g.level, g.claimedMilestoneExponents ?? [])
      if (!g.level.lt(goal)) break
      const next = applyOneGeneratorPurchase(sim, id)
      if (!next) break
      sim = next
      count++
    }
    let capped = false
    if (count >= maxIterations) {
      const g = sim.generators[id]
      if (g) {
        const goal = getNextMilestoneGoalForBar(g.level, g.claimedMilestoneExponents ?? [])
        if (g.level.lt(goal) && applyOneGeneratorPurchase(sim, id) !== null) {
          capped = true
        }
      }
    }
    return { state: sim, count, capped }
  }

  const pct =
    mode === "p1" ? 0.01 : mode === "p10" ? 0.1 : mode === "p50" ? 0.5 : 1
  /** Orçamento em recurso base e em essência (cada um = % do que há no início da compra). */
  const budgetBase = sim.resources.times(pct)
  const budgetEssence = sim.essence.times(pct)
  let spentBase = new Decimal(0)
  let spentEssence = new Decimal(0)

  while (count < maxIterations) {
    const g = sim.generators[id]
    if (!g) break
    const cost = getGeneratorCost(g, sim.generatorPurchaseDiscountRank ?? 0)
    if (spentBase.plus(cost).gt(budgetBase)) break
    if (spentEssence.plus(GENERATOR_ESSENCE_COST).gt(budgetEssence)) break
    const next = applyOneGeneratorPurchase(sim, id)
    if (!next) break
    sim = next
    spentBase = spentBase.plus(cost)
    spentEssence = spentEssence.plus(GENERATOR_ESSENCE_COST)
    count++
  }

  let capped = false
  if (count >= maxIterations) {
    const g = sim.generators[id]
    if (g) {
      const cost = getGeneratorCost(g, sim.generatorPurchaseDiscountRank ?? 0)
      const budgetOk =
        !spentBase.plus(cost).gt(budgetBase) &&
        !spentEssence.plus(GENERATOR_ESSENCE_COST).gt(budgetEssence)
      if (budgetOk && applyOneGeneratorPurchase(sim, id) !== null) {
        capped = true
      }
    }
  }

  return { state: sim, count, capped }
}
