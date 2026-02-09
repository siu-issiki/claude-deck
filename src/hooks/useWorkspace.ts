import { useEffect, useRef } from "react";
import { useTerminalStore } from "@/stores/terminalStore";
import { useWorkspaceStore, settingsStore } from "@/stores/workspaceStore";

export function useWorkspace() {
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const aborted = { current: false };

    const restore = async () => {
      const { setIsRestoring } = useWorkspaceStore.getState();
      setIsRestoring(true);

      try {
        const workspace = await useWorkspaceStore.getState().loadWorkspace();
        const { restoreTab, setActiveTab, closeTab } =
          useTerminalStore.getState();
        const restoredTabIds: string[] = [];

        for (const persisted of workspace.tabs) {
          if (aborted.current) {
            for (const id of restoredTabIds) {
              closeTab(id);
            }
            return;
          }
          await restoreTab(persisted);
          const currentTabs = useTerminalStore.getState().tabs;
          if (currentTabs.length > restoredTabIds.length) {
            restoredTabIds.push(currentTabs[currentTabs.length - 1].id);
          }
        }

        if (aborted.current) {
          for (const id of restoredTabIds) {
            closeTab(id);
          }
          return;
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
        if (!aborted.current) {
          setIsRestoring(false);
        }
      }
    };

    restore();
    return () => {
      aborted.current = true;
    };
  }, []);

  useEffect(() => {
    const unsub = useTerminalStore.subscribe((state) => {
      if (useWorkspaceStore.getState().isRestoring) return;

      const persistedTabs = state.tabs.map(
        ({ projectId, sessionId, title, cwd }) => ({
          projectId,
          sessionId,
          title,
          cwd,
        })
      );
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
