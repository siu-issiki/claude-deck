import { create } from "zustand";
import { LazyStore } from "@tauri-apps/plugin-store";
import type { PersistedTab } from "@/types/terminal";
import type { PersistedWorkspace } from "@/types/workspace";
import { WORKSPACE_DEFAULTS } from "@/types/workspace";

const store = new LazyStore("settings.json");

interface WorkspaceState {
  sidebarWidth: number;
  isRestoring: boolean;

  setSidebarWidth: (width: number) => void;
  saveTabs: (tabs: PersistedTab[], activeTabIndex: number) => void;
  loadWorkspace: () => Promise<PersistedWorkspace>;
  setIsRestoring: (value: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  sidebarWidth: WORKSPACE_DEFAULTS.sidebarWidth,
  isRestoring: false,

  setSidebarWidth: (width) => {
    set({ sidebarWidth: width });
    store.set("sidebarWidth", width);
  },

  saveTabs: (tabs, activeTabIndex) => {
    if (get().isRestoring) return;
    store.set("tabs", tabs);
    store.set("activeTabIndex", activeTabIndex);
  },

  loadWorkspace: async () => {
    const tabs =
      (await store.get<PersistedTab[]>("tabs")) ?? WORKSPACE_DEFAULTS.tabs;
    const activeTabIndex =
      (await store.get<number>("activeTabIndex")) ??
      WORKSPACE_DEFAULTS.activeTabIndex;
    const sidebarWidth =
      (await store.get<number>("sidebarWidth")) ??
      WORKSPACE_DEFAULTS.sidebarWidth;

    set({ sidebarWidth });

    return { tabs, activeTabIndex, sidebarWidth };
  },

  setIsRestoring: (value) => {
    set({ isRestoring: value });
  },
}));

export { store as settingsStore };
