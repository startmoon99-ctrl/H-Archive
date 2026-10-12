import type { CSSProperties } from 'react'

/** { hue: 280 } → style={{ '--hue': 280 }} */
export function cssVars(vars: Record<string, string | number | undefined>): CSSProperties {
  const style: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(vars)) {
    if (value !== undefined) style[`--${name}`] = value
  }
  return style as CSSProperties
}

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}
