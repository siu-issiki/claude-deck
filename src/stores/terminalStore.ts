import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useSessionStore } from "./sessionStore";
import type { TerminalTab, PersistedTab } from "@/types/terminal";
import type { NexusSession } from "@/types/project";

const GENERATING_TIMEOUT_MS = 100;
const generatingTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  generatingTabIds: Set<string>;

  openSession: (session: NexusSession) => Promise<void>;
  openNewSession: (
    projectId: string,
    cwd: string,
    title?: string
  ) => Promise<void>;
  restoreTab: (persisted: PersistedTab) => Promise<void>;
  closeTab: (id: string) => Promise<void>;
  setActiveTab: (id: string) => void;
  markTabGenerating: (tabId: string) => void;
  clearTabGenerating: (tabId: string) => void;
}

export const useTerminalStore = create<TerminalState>()((set, get) => ({
  tabs: [],
  activeTabId: null,
  generatingTabIds: new Set<string>(),

  openSession: async (session) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.sessionId === session.id);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    try {
      const ptyId = await invoke<string>("spawn_pty", {
        cwd: session.cwd,
        cols: 80,
        rows: 24,
      });
      const tab: TerminalTab = {
        id: ptyId,
        sessionId: session.id,
        title: session.title,
        cwd: session.cwd,
      };
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: ptyId,
      }));
    } catch (e) {
      console.error("Failed to spawn PTY:", e);
      toast.error("ターミナルの起動に失敗しました");
    }
  },

  openNewSession: async (projectId, cwd, title) => {
    try {
      const session = await useSessionStore
        .getState()
        .createSession(projectId, cwd, title);

      const ptyId = await invoke<string>("spawn_pty", {
        cwd,
        cols: 80,
        rows: 24,
      });
      const tab: TerminalTab = {
        id: ptyId,
        sessionId: session.id,
        title: session.title,
        cwd,
      };
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: ptyId,
      }));
    } catch (e) {
      console.error("Failed to spawn PTY:", e);
      toast.error("ターミナルの起動に失敗しました");
    }
  },

  restoreTab: async (persisted) => {
    if (!persisted.sessionId) return;

    const { tabs } = get();
    if (tabs.some((t) => t.sessionId === persisted.sessionId)) {
      return;
    }

    const session = useSessionStore
      .getState()
      .sessions.find((s) => s.id === persisted.sessionId);
    if (!session) return;

    try {
      const ptyId = await invoke<string>("spawn_pty", {
        cwd: session.cwd,
        cols: 80,
        rows: 24,
      });
      const tab: TerminalTab = {
        id: ptyId,
        sessionId: persisted.sessionId,
        title: persisted.title,
        cwd: session.cwd,
      };
      set((state) => ({
        tabs: [...state.tabs, tab],
      }));
    } catch (e) {
      console.error("Failed to restore tab:", e);
      toast.error("タブの復元に失敗しました");
    }
  },

  closeTab: async (id) => {
    try {
      await invoke("kill_pty", { id });
    } catch (e) {
      console.error("Failed to kill PTY:", e);
    }
    const timer = generatingTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      generatingTimers.delete(id);
    }
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      let activeTabId = state.activeTabId;
      if (activeTabId === id) {
        activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
      }
      const generatingTabIds = new Set(state.generatingTabIds);
      generatingTabIds.delete(id);
      return { tabs, activeTabId, generatingTabIds };
    });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  markTabGenerating: (tabId) => {
    const existing = generatingTimers.get(tabId);
    if (existing) clearTimeout(existing);

    set((state) => {
      if (state.generatingTabIds.has(tabId)) return state;
      const generatingTabIds = new Set(state.generatingTabIds);
      generatingTabIds.add(tabId);
      return { generatingTabIds };
    });

    const timer = setTimeout(() => {
      generatingTimers.delete(tabId);
      set((state) => {
        if (!state.generatingTabIds.has(tabId)) return state;
        const generatingTabIds = new Set(state.generatingTabIds);
        generatingTabIds.delete(tabId);
        return { generatingTabIds };
      });
    }, GENERATING_TIMEOUT_MS);
    generatingTimers.set(tabId, timer);
  },

  clearTabGenerating: (tabId) => {
    const timer = generatingTimers.get(tabId);
    if (timer) {
      clearTimeout(timer);
      generatingTimers.delete(tabId);
    }
    set((state) => {
      if (!state.generatingTabIds.has(tabId)) return state;
      const generatingTabIds = new Set(state.generatingTabIds);
      generatingTabIds.delete(tabId);
      return { generatingTabIds };
    });
  },
}));

export function useIsSessionGenerating(sessionId: string): boolean {
  return useTerminalStore((state) => {
    const tab = state.tabs.find((t) => t.sessionId === sessionId);
    return tab ? state.generatingTabIds.has(tab.id) : false;
  });
}

export function useSessionTabId(sessionId: string): string | null {
  return useTerminalStore(
    (state) => state.tabs.find((t) => t.sessionId === sessionId)?.id ?? null
  );
}
