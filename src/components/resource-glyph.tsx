import { cn } from "@/lib/utils"

export type ResourceGlyphKind = "base" | "essence" | "milestone"

const glyphWrap = "inline-flex shrink-0 items-center justify-center"

/** Marcador geométrico por tipo de recurso (círculo, triângulo, quadrado). */
export function ResourceGlyph({
  kind,
  className,
  "aria-hidden": ariaHidden = true,
}: {
  kind: ResourceGlyphKind
  className?: string
  "aria-hidden"?: boolean
}) {
  if (kind === "base") {
    return (
      <span
        className={cn(glyphWrap, "h-2 w-2", className)}
        aria-hidden={ariaHidden}
      >
        <span className="block h-2 w-2 rounded-full bg-primary" />
      </span>
    )
  }
  if (kind === "essence") {
    return (
      <span
        className={cn(
          glyphWrap,
          "h-2 w-2.5 text-emerald-700 dark:text-emerald-400",
          className
        )}
        aria-hidden={ariaHidden}
      >
        <svg
          viewBox="0 0 10 9"
          className="h-[7px] w-2.5"
          fill="currentColor"
          aria-hidden
        >
          <polygon points="5,0 10,9 0,9" />
        </svg>
      </span>
    )
  }
  return (
    <span
      className={cn(glyphWrap, "h-2 w-2", className)}
      aria-hidden={ariaHidden}
    >
      <span className="block h-2 w-2 rounded-[2px] bg-milestone-currency" />
    </span>
  )
}

/** Coluna fixa para alinhar glifos / mini-cartão de gerador nos tooltips. */
export const RESOURCE_GLYPH_COLUMN_CLASS = "flex w-8 shrink-0 justify-center"
