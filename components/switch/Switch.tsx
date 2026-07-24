"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
  size?: "sm" | "default"
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Switch({
  className,
  size = "default",
  checked,
  onCheckedChange,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <label
      className={cn(
        "relative inline-flex items-center",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
    >
      <input
        type="checkbox"
        role="switch"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        disabled={disabled}
        {...props}
      />
      {/* Track */}
      <div
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-colors outline-none",
          "after:absolute after:-inset-x-3 after:-inset-y-2",
          "peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          size === "default" && "h-[18.4px] w-[32px]",
          size === "sm" && "h-[14px] w-[24px]",
          checked ? "bg-primary" : "bg-input dark:bg-input/80"
        )}
      >
        {/* Thumb */}
        <span
          className={cn(
            "pointer-events-none block rounded-full bg-background ring-0 transition-transform",
            "translate-x-[2px]",
            size === "default" && "size-4 peer-checked:translate-x-[14px]",
            size === "sm" && "size-3 peer-checked:translate-x-[10px]",
            "dark:bg-primary-foreground"
          )}
        />
      </div>
    </label>
  )
}

export { Switch }