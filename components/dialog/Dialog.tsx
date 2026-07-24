"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialog() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("Dialog components must be rendered inside <Dialog>")
  return ctx
}

// -----------------------------------------------------------------------------
// Dialog
// -----------------------------------------------------------------------------

interface DialogProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function Dialog({ children, open: controlledOpen, defaultOpen, onOpenChange }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      onOpenChange?.(value)
      if (!isControlled) setUncontrolledOpen(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

// -----------------------------------------------------------------------------
// DialogTrigger
// -----------------------------------------------------------------------------

function DialogTrigger({
  children,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useDialog()

  const handleClick = (e: React.MouseEvent) => {
    props.onClick?.(e as any)
    onOpenChange(true)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, { onClick: handleClick })
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  )
}

// -----------------------------------------------------------------------------
// DialogClose
// -----------------------------------------------------------------------------

function DialogClose({
  children,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useDialog()

  const handleClick = (e: React.MouseEvent) => {
    props.onClick?.(e as any)
    onOpenChange(false)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, { onClick: handleClick })
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  )
}

// -----------------------------------------------------------------------------
// DialogContent  (includes portal + backdrop + panel)
// -----------------------------------------------------------------------------

function DialogContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, onOpenChange } = useDialog()
  const [mounted, setMounted] = React.useState(false)
  const [visible, setVisible] = React.useState(false)

  // Client-side only (SSR safe)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Enter / exit animation timing
  React.useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setVisible(true))
      document.body.style.overflow = "hidden"
      return () => cancelAnimationFrame(raf)
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 200)
      document.body.style.overflow = ""
      return () => clearTimeout(timer)
    }
  }, [open])

  // Escape key
  React.useEffect(() => {
    if (!open && !mounted) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, mounted, onOpenChange])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" {...props}>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-50 grid w-[min(95vw,32rem)] gap-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 text-left shadow-2xl shadow-zinc-950/10 outline-none transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950",
          visible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

// -----------------------------------------------------------------------------
// DialogHeader / Footer / Title / Description
// -----------------------------------------------------------------------------

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-lg font-semibold text-zinc-900 dark:text-zinc-100", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm leading-6 text-zinc-500 dark:text-zinc-400", className)}
      {...props}
    />
  )
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}