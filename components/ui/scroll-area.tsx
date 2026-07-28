"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface ScrollAreaContextValue {
  viewportRef: React.RefObject<HTMLDivElement>;
}

const ScrollAreaContext = React.createContext<ScrollAreaContextValue | null>(null);

function useScrollArea() {
  const ctx = React.useContext(ScrollAreaContext);
  if (!ctx) throw new Error("ScrollArea subcomponents must be used inside <ScrollArea>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  ScrollArea                                                         */
/* ------------------------------------------------------------------ */

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const viewportRef = React.useRef<HTMLDivElement>(null);

  return (
    <ScrollAreaContext.Provider value={{ viewportRef }}>
      <div
        data-slot="scroll-area"
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <div
          ref={viewportRef}
          data-slot="scroll-area-viewport"
          className="size-full overflow-scroll rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {children}
        </div>
        <ScrollBar orientation="vertical" />
        <div data-slot="scroll-area-corner" className="absolute bottom-0 right-0" />
      </div>
    </ScrollAreaContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  ScrollBar                                                          */
/* ------------------------------------------------------------------ */

function ScrollBar({
  className,
  orientation = "vertical",
  onPointerDown: userOnPointerDown,
  ...props
}: React.ComponentProps<"div"> & { orientation?: "vertical" | "horizontal" }) {
  const { viewportRef } = useScrollArea();
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [thumbSize, setThumbSize] = React.useState(0);
  const [thumbOffset, setThumbOffset] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const dragState = React.useRef<{
    startMouse: number;
    startScroll: number;
    isDragging: boolean;
  }>({ startMouse: 0, startScroll: 0, isDragging: false });

  const isHorizontal = orientation === "horizontal";

  const updateThumb = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (isHorizontal) {
      const scrollable = viewport.scrollWidth - viewport.clientWidth;
      if (scrollable <= 0) {
        setVisible(false);
        return;
      }
      setVisible(true);
      const ratio = viewport.clientWidth / viewport.scrollWidth;
      const size = Math.max(ratio * viewport.clientWidth, 20);
      setThumbSize(size);
      const maxOffset = viewport.clientWidth - size;
      setThumbOffset((viewport.scrollLeft / scrollable) * maxOffset);
    } else {
      const scrollable = viewport.scrollHeight - viewport.clientHeight;
      if (scrollable <= 0) {
        setVisible(false);
        return;
      }
      setVisible(true);
      const ratio = viewport.clientHeight / viewport.scrollHeight;
      const size = Math.max(ratio * viewport.clientHeight, 20);
      setThumbSize(size);
      const maxOffset = viewport.clientHeight - size;
      setThumbOffset((viewport.scrollTop / scrollable) * maxOffset);
    }
  }, [isHorizontal, viewportRef]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    updateThumb();

    const ro = new ResizeObserver(() => updateThumb());
    ro.observe(viewport);

    const mo = new MutationObserver(() => updateThumb());
    mo.observe(viewport, { childList: true, subtree: true });

    const handleScroll = () => updateThumb();
    viewport.addEventListener("scroll", handleScroll, { passive: true });

    const handleResize = () => updateThumb();
    window.addEventListener("resize", handleResize);

    return () => {
      ro.disconnect();
      mo.disconnect();
      viewport.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateThumb, viewportRef]);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;

      dragState.current.isDragging = true;
      dragState.current.startMouse = isHorizontal ? e.clientX : e.clientY;
      dragState.current.startScroll = isHorizontal
        ? viewport.scrollLeft
        : viewport.scrollTop;

      const handlePointerMove = (ev: PointerEvent) => {
        if (!dragState.current.isDragging) return;
        const delta =
          (isHorizontal ? ev.clientX : ev.clientY) -
          dragState.current.startMouse;
        const trackSize = isHorizontal
          ? track.clientWidth
          : track.clientHeight;
        const scrollable = isHorizontal
          ? viewport.scrollWidth - viewport.clientWidth
          : viewport.scrollHeight - viewport.clientHeight;
        const trackScrollable = trackSize - thumbSize;
        if (trackScrollable <= 0) return;

        const newScroll =
          dragState.current.startScroll +
          (delta / trackScrollable) * scrollable;

        if (isHorizontal) {
          viewport.scrollLeft = newScroll;
        } else {
          viewport.scrollTop = newScroll;
        }
      };

      const handlePointerUp = () => {
        dragState.current.isDragging = false;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [isHorizontal, viewportRef, thumbSize]
  );

  if (!visible) return null;

  return (
    <div
      ref={trackRef}
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      className={cn(
        "absolute flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        isHorizontal ? "bottom-0 left-0 w-full" : "right-0 top-0",
        className
      )}
      onPointerDown={(e) => {
        handlePointerDown(e);
        userOnPointerDown?.(e);
      }}
      {...props}
    >
      <div
        data-slot="scroll-area-thumb"
        className="relative rounded-full bg-border"
        style={
          isHorizontal
            ? {
                width: thumbSize,
                height: "100%",
                transform: `translateX(${thumbOffset}px)`,
              }
            : {
                height: thumbSize,
                width: "100%",
                transform: `translateY(${thumbOffset}px)`,
              }
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { ScrollArea, ScrollBar };