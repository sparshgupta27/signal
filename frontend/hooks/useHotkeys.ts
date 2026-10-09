import { useEffect, useRef } from "react";

export interface Hotkey {
  /** "+"-joined, e.g. "mod+k", "mod+shift+n", "alt+arrowup", "escape", "?". "mod" = Cmd on Mac, Ctrl elsewhere. */
  combo: string;
  handler: (e: KeyboardEvent) => void;
  /** Whether this fires while focus is in a text input/textarea/contenteditable. Default false. */
  allowInInputs?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

function matches(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1]!;
  const mod = e.metaKey || e.ctrlKey;
  if (parts.includes("mod") !== mod) return false;
  if (parts.includes("shift") !== e.shiftKey) return false;
  if (parts.includes("alt") !== e.altKey) return false;
  return e.key.toLowerCase() === key;
}

/** One window-level keydown listener dispatching to a config table — the shortcut list is free to change every render without re-attaching anything. */
export function useHotkeys(hotkeys: Hotkey[]) {
  const latest = useRef(hotkeys);
  // Keeping the ref current without re-attaching the listener every render
  // — this has to run after render (an effect), not during it: writing a
  // ref mid-render is exactly what this project's lint rule disallows.
  useEffect(() => {
    latest.current = hotkeys;
  }, [hotkeys]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const editable = isEditableTarget(e.target);
      for (const hotkey of latest.current) {
        if (editable && !hotkey.allowInInputs) continue;
        if (matches(e, hotkey.combo)) {
          e.preventDefault();
          hotkey.handler(e);
          return;
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
