import { useEffect, useRef } from "react";
import { useTerminalStore } from "@/stores/terminalStore";
import { useWorkspaceStore, settingsStore } from "@/stores/workspaceStore";

export function useWorkspace() {
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const restore = async () => {
      const { setIsRestoring } = useWorkspaceStore.getState();
      setIsRestoring(true);

      try {
        const workspace = await useWorkspaceStore.getState().loadWorkspace();
        const { restoreTab, setActiveTab } = useTerminalStore.getState();

        for (const persisted of workspace.tabs) {
          await restoreTab(persisted);
        }

        const currentTabs = useTerminalStore.getState().tabs;
        if (currentTabs.length > 0 && workspace.activeTabIndex >= 0) {
          const idx = Math.min(
            workspace.activeTabIndex,
            currentTabs.length - 1
          );
          setActiveTab(currentTabs[idx].id);
        }
      } catch (e) {
        console.error("Failed to restore workspace:", e);
      } finally {
        setIsRestoring(false);
      }
    };

    restore();
  }, []);

  useEffect(() => {
    const unsub = useTerminalStore.subscribe((state) => {
      const { isRestoring } = useWorkspaceStore.getState();
      if (isRestoring) return;

      const { getPersistedTabs } = useTerminalStore.getState();
      const persistedTabs = getPersistedTabs();
      const activeIdx = state.tabs.findIndex(
        (t) => t.id === state.activeTabId
      );
      useWorkspaceStore.getState().saveTabs(persistedTabs, activeIdx);
    });

    return unsub;
  }, []);

  useEffect(() => {
    const handler = () => {
      settingsStore.save();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}
