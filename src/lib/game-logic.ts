import Decimal from "break_eternity.js"

export interface Generator {
  id: string
  name: string
  level: number
  baseCost: Decimal
  baseProduction: Decimal
  duration: number // in ms
  progress: number // 0 to 1
}

export interface GameState {
  resources: Decimal
  showFps: boolean
  lastSaveTime: number
  generators: Record<string, Generator>
}

export const INITIAL_STATE: GameState = {
  resources: new Decimal(10),
  showFps: true,
  lastSaveTime: Date.now(),
  generators: {
    generator1: {
      id: "generator1",
      name: "Gerador 1",
      level: 0,
      baseCost: new Decimal(10),
      baseProduction: new Decimal(3),
      duration: 2000,
      progress: 0,
    },
    generator2: {
      id: "generator2",
      name: "Gerador 2",
      level: 0,
      baseCost: new Decimal(100),
      baseProduction: new Decimal(4),
      duration: 4000,
      progress: 0,
    },
    generator3: {
      id: "generator3",
      name: "Gerador 3",
      level: 0,
      baseCost: new Decimal(1000),
      baseProduction: new Decimal(5),
      duration: 8000,
      progress: 0,
    },
    generator4: {
      id: "generator4",
      name: "Gerador 4",
      level: 0,
      baseCost: new Decimal(10000),
      baseProduction: new Decimal(6),
      duration: 16000,
      progress: 0,
    },
    generator5: {
      id: "generator5",
      name: "Gerador 5",
      level: 0,
      baseCost: new Decimal(100000),
      baseProduction: new Decimal(7),
      duration: 32000,
      progress: 0,
    },
    generator6: {
      id: "generator6",
      name: "Gerador 6",
      level: 0,
      baseCost: new Decimal(1000000),
      baseProduction: new Decimal(8),
      duration: 64000,
      progress: 0,
    },
    generator7: {
      id: "generator7",
      name: "Gerador 7",
      level: 0,
      baseCost: new Decimal(10000000),
      baseProduction: new Decimal(9),
      duration: 128000,
      progress: 0,
    },
    generator8: {
      id: "generator8",
      name: "Gerador 8",
      level: 0,
      baseCost: new Decimal(100000000),
      baseProduction: new Decimal(10),
      duration: 256000,
      progress: 0,
    },
    generator9: {
      id: "generator9",
      name: "Gerador 9",
      level: 0,
      baseCost: new Decimal(1000000000),
      baseProduction: new Decimal(11),
      duration: 512000,
      progress: 0,
    },
    generator10: {
      id: "generator10",
      name: "Gerador 10",
      level: 0,
      baseCost: new Decimal(10000000000),
      baseProduction: new Decimal(12),
      duration: 1024000,
      progress: 0,
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

export const formatNumber = (num: Decimal): string => {
  if (num.lt(1000)) return num.floor().toString()
  
  if (num.lt(1000000)) {
    // Portuguese format: 1.000
    return Math.floor(num.toNumber()).toLocaleString('pt-BR')
  }

  const standardSuffixes = ["", " M", " B", " T", " Qa", " Qi", " Sx", " Sp", " Oc", " No"]
  const exp = Math.floor(num.log10() as unknown as number)
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

export const getGeneratorCost = (generator: Generator): Decimal => {
  // Cost formula: baseCost * 1.5 ^ level
  return generator.baseCost.times(new Decimal(1.5).pow(generator.level))
}
