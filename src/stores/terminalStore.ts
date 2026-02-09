import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { TerminalTab } from "@/types/terminal";

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;

  openSession: (
    projectId: string,
    sessionId: string,
    cwd: string | undefined,
    title: string
  ) => Promise<void>;
  openNewSession: (cwd: string, title?: string) => Promise<void>;
  closeTab: (id: string) => Promise<void>;
  setActiveTab: (id: string) => void;
}

export const useTerminalStore = create<TerminalState>()((set, get) => ({
  tabs: [],
  activeTabId: null,

  openSession: async (projectId, sessionId, cwd, title) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.sessionId === sessionId);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    try {
      const ptyId = await invoke<string>("spawn_pty", {
        cwd: cwd ?? null,
        sessionId,
        cols: 80,
        rows: 24,
      });
      const tab: TerminalTab = { id: ptyId, projectId, sessionId, title };
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: ptyId,
      }));
    } catch (e) {
      console.error("Failed to spawn PTY:", e);
    }
  },

  openNewSession: async (cwd, title) => {
    const label = title ?? cwd.split("/").filter(Boolean).pop() ?? "New Session";
    try {
      const ptyId = await invoke<string>("spawn_pty", {
        cwd,
        sessionId: null,
        cols: 80,
        rows: 24,
      });
      const tab: TerminalTab = {
        id: ptyId,
        projectId: null,
        sessionId: null,
        title: label,
      };
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: ptyId,
      }));
    } catch (e) {
      console.error("Failed to spawn PTY:", e);
    }
  },

  closeTab: async (id) => {
    try {
      await invoke("kill_pty", { id });
    } catch (e) {
      console.error("Failed to kill PTY:", e);
    }
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      let activeTabId = state.activeTabId;
      if (activeTabId === id) {
        activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
      }
      return { tabs, activeTabId };
    });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },
}));
