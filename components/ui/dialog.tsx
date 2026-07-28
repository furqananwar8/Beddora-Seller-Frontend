"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used inside <Dialog>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Dialog (Root)                                                      */
/* ------------------------------------------------------------------ */

function DialogRoot({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!isControlled) setUncontrolledOpen(value);
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange]
  );

  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <DialogContext.Provider
      value={{ open, onOpenChange: handleOpenChange, titleId, descriptionId }}
    >
      {children}
    </DialogContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  DialogTrigger                                                      */
/* ------------------------------------------------------------------ */

function DialogTrigger({ className, ...props }: React.ComponentProps<"button">) {
  const { onOpenChange } = useDialog();
  return (
    <button
      type="button"
      className={cn(className)}
      onClick={() => onOpenChange(true)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  DialogPortal                                                       */
/* ------------------------------------------------------------------ */

function DialogPortal({
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className={cn(className)} {...props}>
      {children}
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/*  DialogBackdrop                                                     */
/* ------------------------------------------------------------------ */

function DialogBackdrop({ className, ...props }: React.ComponentProps<"div">) {
  const { open, onOpenChange } = useDialog();
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in",
        className
      )}
      data-state={open ? "open" : "closed"}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  DialogPopup  (internal primitive used by DialogContent)            */
/* ------------------------------------------------------------------ */

function DialogPopup({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { open, onOpenChange, titleId, descriptionId } = useDialog();
  const ref = React.useRef<HTMLDivElement>(null);

  /* Lock body scroll */
  React.useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  /* Escape to close */
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  /* Focus the dialog surface when opened */
  React.useEffect(() => {
    if (open && ref.current) {
      ref.current.focus({ preventScroll: true });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
      data-state={open ? "open" : "closed"}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-[min(95vw,32rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 text-left shadow-2xl shadow-zinc-950/10 outline-none transition-all dark:border-zinc-800 dark:bg-zinc-950",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DialogContent                                                      */
/* ------------------------------------------------------------------ */

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPopup className={className} {...props}>
        {children}
      </DialogPopup>
    </DialogPortal>
  );
}

/* ------------------------------------------------------------------ */
/*  DialogHeader                                                       */
/* ------------------------------------------------------------------ */

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props} />
  );
}

/* ------------------------------------------------------------------ */
/*  DialogFooter                                                       */
/* ------------------------------------------------------------------ */

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  DialogTitle                                                        */
/* ------------------------------------------------------------------ */

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useDialog();
  return (
    <h2
      id={titleId}
      className={cn(
        "text-lg font-semibold text-zinc-900 dark:text-zinc-100",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  DialogDescription                                                  */
/* ------------------------------------------------------------------ */

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { descriptionId } = useDialog();
  return (
    <p
      id={descriptionId}
      className={cn(
        "text-sm leading-6 text-zinc-500 dark:text-zinc-400",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  DialogClose                                                        */
/* ------------------------------------------------------------------ */

function DialogClose({ className, ...props }: React.ComponentProps<"button">) {
  const { onOpenChange } = useDialog();
  return (
    <button
      type="button"
      className={cn(className)}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};