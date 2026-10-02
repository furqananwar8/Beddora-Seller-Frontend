"use client"

import * as React from "react"
import { cn } from "@/utils/cn"

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type" | "role"> {
  size?: "sm" | "default"
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

/** On / off switch. A button with role="switch", so it is keyboard- and screen-reader-operable. */
function Switch({ className, size = "default", checked = false, onCheckedChange, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "default" ? "h-5 w-9" : "h-4 w-7",
        checked ? "bg-primary-600" : "bg-secondary-300",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute rounded-full bg-white shadow transition-all",
          size === "default" ? "top-0.5 h-4 w-4" : "top-0.5 h-3 w-3",
          checked ? (size === "default" ? "left-[18px]" : "left-[14px]") : "left-0.5"
        )}
      />
    </button>
  )
}

export { Switch }
