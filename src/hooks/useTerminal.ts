import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useTerminalStore } from "@/stores/terminalStore";
import "@xterm/xterm/css/xterm.css";

/**
 * Convert a KeyboardEvent into the byte sequence a PTY expects.
 * Returns null for keys that should be left to xterm.js onData
 * (arrow keys, function keys, etc. which produce multi-byte escape sequences).
 */
function keyToData(e: KeyboardEvent): string | null {
  // Let xterm handle Meta/Alt combos (e.g. Cmd+C for copy)
  if (e.metaKey || e.altKey) return null;

  if (e.ctrlKey) {
    // Ignore modifier-only keypress
    if (e.key === "Control") return null;
    const code = e.key.toLowerCase().charCodeAt(0);
    // Ctrl+A..Z → 0x01..0x1A
    if (code >= 97 && code <= 122) return String.fromCharCode(code - 96);
    // Ctrl+[ → ESC, Ctrl+\ → 0x1C, Ctrl+] → 0x1D
    if (e.key === "[") return "\x1b";
    if (e.key === "\\") return "\x1c";
    if (e.key === "]") return "\x1d";
    return null;
  }

  // Printable characters (length === 1 covers letters, digits, symbols, non-ASCII)
  if (e.key.length === 1) return e.key;

  switch (e.key) {
    case "Enter":
      return "\r";
    case "Backspace":
      return "\x7f";
    case "Tab":
      return "\t";
    case "Escape":
      return "\x1b";
    case "ArrowUp":
      return "\x1b[A";
    case "ArrowDown":
      return "\x1b[B";
    case "ArrowRight":
      return "\x1b[C";
    case "ArrowLeft":
      return "\x1b[D";
    case "Home":
      return "\x1b[H";
    case "End":
      return "\x1b[F";
    case "Delete":
      return "\x1b[3~";
    case "PageUp":
      return "\x1b[5~";
    case "PageDown":
      return "\x1b[6~";
    default:
      return null;
  }
}

export function useTerminal(tabId: string, isVisible: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      theme: {
        background: "#1a1a1a",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    requestAnimationFrame(() => {
      fitAddon.fit();
      terminal.focus();
    });

    const unlistenData = listen<string>(`pty:${tabId}:data`, (event) => {
      const decoded = atob(event.payload);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      terminal.write(bytes);
      const store = useTerminalStore.getState();
      if (store.activeTabId === tabId) {
        store.markTabGenerating(tabId);
      }
    });

    const unlistenExit = listen(`pty:${tabId}:exit`, () => {
      terminal.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
      useTerminalStore.getState().clearTabGenerating(tabId);
    });

    let pending = "";
    let inFlight = false;

    function flushInput() {
      if (pending.length === 0 || inFlight) return;
      inFlight = true;
      const batch = pending;
      pending = "";
      invoke("write_pty", { id: tabId, data: batch })
        .catch(console.error)
        .finally(() => {
          inFlight = false;
          flushInput();
        });
    }

    // Bypass xterm.js textarea-based input entirely (unreliable on WKWebView:
    // the hidden textarea's input events are dropped during fast typing).
    // Handle all keyboard input via keydown and paste via clipboard events.
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return false;
      const data = keyToData(event);
      if (data !== null) {
        event.preventDefault();
        pending += data;
        flushInput();
      }
      return false; // Always block xterm's internal textarea handling
    });

    const container = containerRef.current;
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text");
      if (text) {
        pending += text;
        flushInput();
      }
    };
    container.addEventListener("paste", onPaste);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        fitAddon.fit();
        invoke("resize_pty", {
          id: tabId,
          cols: terminal.cols,
          rows: terminal.rows,
        }).catch(console.error);
      }, 50);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      container.removeEventListener("paste", onPaste);
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      unlistenData.then((fn) => fn());
      unlistenExit.then((fn) => fn());
      useTerminalStore.getState().clearTabGenerating(tabId);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [tabId]);

  useEffect(() => {
    if (isVisible && fitAddonRef.current && terminalRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        terminalRef.current?.focus();
      });
    }
  }, [isVisible]);

  return { containerRef };
}
