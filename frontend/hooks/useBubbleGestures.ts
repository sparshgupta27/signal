import { useRef, useState, type MouseEvent, type PointerEvent } from "react";

const LONG_PRESS_MS = 450;
// Movement past this decides the gesture: a mostly-horizontal rightward
// drag becomes swipe-to-reply, anything else is a scroll and gets left to
// the browser.
const DECIDE_PX = 10;
export const SWIPE_TRIGGER_PX = 64;
const SWIPE_MAX_PX = 88;

type Mode = "idle" | "pending" | "swipe" | "scroll" | "longpress";

/**
 * Touch-only message gestures: long-press opens the action sheet, swipe
 * right replies. Mouse and pen input is ignored, so desktop keeps its hover
 * toolbar. The element using these handlers needs `touch-action: pan-y`, so
 * the browser keeps vertical scrolling and leaves horizontal moves to us.
 */
export function useBubbleGestures({
  enabled,
  onLongPress,
  onSwipeReply,
}: {
  enabled: boolean;
  onLongPress: () => void;
  onSwipeReply: () => void;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mode = useRef<Mode>("idle");
  // A long-press or a swipe must not also count as a tap (which would open
  // an image's lightbox or jump to a quoted message).
  const suppressClick = useRef(false);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const reset = () => {
    clearTimer();
    start.current = null;
    mode.current = "idle";
    setSwipeX(0);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!enabled || e.pointerType !== "touch") return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    mode.current = "pending";
    suppressClick.current = false;
    timer.current = setTimeout(() => {
      if (mode.current !== "pending") return;
      mode.current = "longpress";
      suppressClick.current = true;
      navigator.vibrate?.(12);
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: PointerEvent) => {
    const s = start.current;
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;

    if (mode.current === "pending" && (Math.abs(dx) > DECIDE_PX || Math.abs(dy) > DECIDE_PX)) {
      clearTimer();
      mode.current = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.5 ? "swipe" : "scroll";
    }
    if (mode.current === "swipe") {
      suppressClick.current = true;
      setSwipeX(Math.max(0, Math.min(dx, SWIPE_MAX_PX)));
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const s = start.current;
    if (!s || e.pointerId !== s.id) return;
    if (mode.current === "swipe" && e.clientX - s.x >= SWIPE_TRIGGER_PX) {
      navigator.vibrate?.(8);
      onSwipeReply();
    }
    reset();
  };

  const onClickCapture = (e: MouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  // Android fires contextmenu on a long-press (image save menu, text
  // selection handles) — ours replaces it while a finger is down.
  const onContextMenu = (e: MouseEvent) => {
    if (start.current || mode.current === "longpress") e.preventDefault();
  };

  return {
    swipeX,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
      onClickCapture,
      onContextMenu,
    },
  };
}
