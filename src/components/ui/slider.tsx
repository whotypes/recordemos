"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  onIncrement?: () => void
  onDecrement?: () => void
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, defaultValue, value, min = 0, max = 100, onIncrement, onDecrement, ...props }, ref) => {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  const slider = (
    <SliderPrimitive.Root
      ref={ref}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-card shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )

  if (onIncrement || onDecrement) {
    return (
      <div className="flex w-full items-center gap-2.5">
        {onDecrement && (
          <Button
            variant="ghost"
            type="button"
            className="h-6 rounded-md border border-border/80 bg-primary/5 p-0.5"
            onClick={onDecrement}
            aria-label="Decrement"
          >
            <Minus className="h-[1.15rem] w-[1.15rem] text-primary/40 dark:text-primary/80" />
          </Button>
        )}
        {slider}
        {onIncrement && (
          <Button
            variant="ghost"
            type="button"
            className="h-6 rounded-md border border-border/80 bg-primary/5 p-0.5"
            onClick={onIncrement}
            aria-label="Increment"
          >
            <Plus className="h-[1.15rem] w-[1.15rem] text-primary/40 dark:text-primary/80" />
          </Button>
        )}
      </div>
    )
  }

  return slider
})

Slider.displayName = "Slider"

export { Slider }
