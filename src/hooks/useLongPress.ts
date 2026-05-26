"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 400;
const DEFAULT_MOVE_THRESHOLD_PX = 10;

/**
 * Pure helper — determine whether a pointer move should cancel an in-flight
 * long-press based on Euclidean distance between the start and current
 * positions.
 *
 * Exported separately so it can be unit/property tested without React.
 */
export function shouldCancelLongPress(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold: number
): boolean {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return Math.hypot(dx, dy) > threshold;
}

export interface UseLongPressOptions {
  /** Fired when the pointer is held for at least `durationMs` without moving > threshold. */
  onLongPress: () => void;
  /** Optional — fired when the pointer is released before the long-press timer (a "tap"). */
  onTap?: () => void;
  /** Long-press duration in ms. Defaults to 400. */
  durationMs?: number;
  /** Movement threshold in px to cancel the long-press. Defaults to 10. */
  moveThresholdPx?: number;
}

export interface UseLongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  /** Desktop right-click fallback — also triggers `onLongPress`. */
  onContextMenu: (e: React.MouseEvent) => void;
}

export type UseLongPressReturn = UseLongPressHandlers & {
  /** True while the pointer is down and the long-press timer is still pending. */
  pressing: boolean;
};

/**
 * `useLongPress` — gesture hook for detecting long-press on touch and pointer
 * devices, with a desktop right-click fallback.
 *
 * Behaviour:
 *  - Pointer down → start timer.
 *  - Pointer move > `moveThresholdPx` → cancel timer (no long-press, no tap).
 *  - Pointer up before timer fires → fire `onTap` (if provided).
 *  - Timer fires (pointer still down, no excessive move) → `navigator.vibrate(8)`
 *    + fire `onLongPress`. Subsequent pointer up does NOT fire `onTap`.
 *  - Right-click (`contextmenu`) → fire `onLongPress` immediately.
 *
 * The hook also returns a `pressing` boolean for visual cues (e.g. scale-down
 * effect while the user is holding).
 *
 * Note: caller is still free to attach their own handlers on top — the
 * returned handlers don't bundle navigation or any side-effect beyond timer
 * management, vibration, and the supplied callbacks.
 */
export function useLongPress(options: UseLongPressOptions): UseLongPressReturn {
  const {
    onLongPress,
    onTap,
    durationMs = DEFAULT_DURATION_MS,
    moveThresholdPx = DEFAULT_MOVE_THRESHOLD_PX,
  } = options;

  // Keep callbacks in refs so we don't restart the timer or re-create handlers
  // every render when the consumer passes inline functions.
  const onLongPressRef = useRef(onLongPress);
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const movedRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const [pressing, setPressing] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount to avoid stray timers firing after the component goes away.
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      longPressFiredRef.current = false;
      movedRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      setPressing(true);

      clearTimer();
      timerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        timerRef.current = null;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate?.(8);
          } catch {
            /* ignore vibrate errors (some browsers throw on user-gesture rules) */
          }
        }
        onLongPressRef.current();
      }, durationMs);
    },
    [clearTimer, durationMs]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = startPosRef.current;
      if (!start || !timerRef.current) return;
      const current = { x: e.clientX, y: e.clientY };
      if (shouldCancelLongPress(start, current, moveThresholdPx)) {
        movedRef.current = true;
        clearTimer();
        setPressing(false);
      }
    },
    [clearTimer, moveThresholdPx]
  );

  const handlePointerUp = useCallback(
    () => {
      setPressing(false);

      // If long-press already fired, the gesture was a press (not a tap).
      if (longPressFiredRef.current) return;

      // Pending timer that hasn't fired yet — this is a tap.
      const wasPendingTap = !!timerRef.current && !movedRef.current;
      clearTimer();

      if (wasPendingTap) {
        onTapRef.current?.();
      }
    },
    [clearTimer]
  );

  const handlePointerCancel = useCallback(() => {
    setPressing(false);
    clearTimer();
  }, [clearTimer]);

  const handlePointerLeave = useCallback(() => {
    setPressing(false);
    clearTimer();
  }, [clearTimer]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Treat desktop right-click as an immediate long-press trigger.
    longPressFiredRef.current = true;
    clearTimerImmediate();
    onLongPressRef.current();
    // Helper closes over local refs; defined inline to avoid stale closure issues.
    function clearTimerImmediate() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  return {
    pressing,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerLeave,
    onContextMenu: handleContextMenu,
  };
}
