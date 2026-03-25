import Decimal from "break_eternity.js"

export interface Generator {
  id: string
  name: string
  /** Quantidade possuída; Decimal para suportar valores >> Number.MAX_SAFE_INTEGER. */
  level: Decimal
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
}

export interface GameState {
  resources: Decimal
  showFps: boolean
  lastSaveTime: number
  generators: Record<string, Generator>
  /** Moeda de marcos (futuras melhorias). */
  milestoneCurrency: number
}

export const INITIAL_STATE: GameState = {
  resources: new Decimal(10),
  showFps: true,
  lastSaveTime: Date.now(),
  milestoneCurrency: 0,
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

/** Produção por segundo (ciclo efectivo em ms). */
export function getEffectiveProductionPerSecond(gen: Generator): Decimal {
  const dur = getEffectiveDuration(gen)
  if (dur <= 0) return new Decimal(0)
  return getEffectiveProductionPerCycle(gen).times(1000).div(dur)
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

export const getGeneratorCost = (generator: Generator): Decimal => {
  // Cost formula: baseCost * 1.5 ^ level
  return generator.baseCost.times(new Decimal(1.5).pow(generator.level))
}
