import * as React from "react"
import { cn } from "@/phone/lib/utils"

// shadcn/ui slider look on the browser's own range input: one value, keyboard and screen readers
// work by default, and the handle is a 48 px target. (Radix's slider does not place its handle under Preact.)
function Slider({ className, value, min = 0, max = 100, step = 1, onValueChange, ...props }:
  Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "min" | "max" | "step"> & { value: number; min?: number; max?: number; step?: number; onValueChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range"
      data-slot="slider"
      min={min}
      max={max}
      step={step}
      value={value}
      onInput={e => onValueChange(Number((e.target as HTMLInputElement).value))}
      onChange={e => onValueChange(Number((e.target as HTMLInputElement).value))}
      style={{ "--pct": `${pct}%` } as React.CSSProperties}
      className={cn("gloz-range h-12 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring", className)}
      {...props}
    />
  )
}

export { Slider }
