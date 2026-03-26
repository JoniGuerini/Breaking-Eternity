import React from "react"
import { Select } from "radix-ui"
import { useGame } from "@/components/game-provider"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { BulkPurchaseMode } from "@/lib/game-logic"
import { Check, ChevronDown, LayoutGrid, Settings, Sparkles } from "lucide-react"

const BULK_OPTIONS: { value: BulkPurchaseMode; label: string }[] = [
  { value: "1", label: "1×" },
  { value: "p1", label: "1%" },
  { value: "p10", label: "10%" },
  { value: "p50", label: "50%" },
  { value: "p100", label: "100%" },
  { value: "marco", label: "Marco" },
]

export const Footer: React.FC = () => {
  const { fps, state, bulkPurchaseMode, setBulkPurchaseMode } = useGame()

  const fpsColor =
    fps >= 60 ? "text-green-500" : fps >= 30 ? "text-yellow-500" : "text-red-500"

  return (
    <footer className="relative z-50 shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 py-3 sm:gap-3 sm:px-3">
        <div className="flex min-w-0 justify-start">
          <div className="w-[4.75rem] shrink-0 sm:w-[5.5rem]">
            <Select.Root
              value={bulkPurchaseMode}
              onValueChange={(v) =>
                setBulkPurchaseMode(v as BulkPurchaseMode)
              }
            >
              <Select.Trigger
                id="bulk-buy-mode"
                aria-label="Modo de compra de geradores"
                className={cn(
                  "flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-muted-foreground/15 bg-[hsl(var(--progress-bg))] px-1.5 py-0 text-[11px] font-medium tabular-nums text-foreground shadow-inner outline-none transition-[border-color,box-shadow,transform]",
                  "hover:border-muted-foreground/25 focus-visible:border-muted-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:border-muted-foreground/30",
                  "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
                  "sm:h-10 sm:gap-1 sm:px-2 sm:text-xs [&>span]:line-clamp-1"
                )}
              >
                <Select.Value />
                <Select.Icon asChild>
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground sm:size-4" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  side="top"
                  align="center"
                  sideOffset={6}
                  collisionPadding={12}
                  className={cn(
                    "z-[200] overflow-hidden rounded-lg border border-muted-foreground/15 bg-[hsl(var(--progress-bg))] shadow-lg",
                    "min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                  )}
                >
                  <Select.Viewport className="p-1">
                    {BULK_OPTIONS.map((o) => (
                      <Select.Item
                        key={o.value}
                        value={o.value}
                        className={cn(
                          "relative flex h-8 w-full cursor-default select-none items-center justify-center rounded-md py-1.5 pr-2 pl-7 text-center text-[11px] font-medium tabular-nums text-foreground outline-none sm:h-9 sm:text-xs",
                          "data-[highlighted]:bg-muted/50 data-[state=checked]:bg-muted/40",
                          "data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
                        )}
                      >
                        <span className="absolute left-1.5 flex size-4 items-center justify-center sm:left-2">
                          <Select.ItemIndicator>
                            <Check
                              className="size-3.5 text-foreground sm:size-4"
                              strokeWidth={2.5}
                            />
                          </Select.ItemIndicator>
                        </span>
                        <Select.ItemText>{o.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 justify-center">
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
        {/* Coluna espelho da esquerda: mantém o menu centralizado no footer inteiro */}
        <div className="min-w-0" aria-hidden />
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
