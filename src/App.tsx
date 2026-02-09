import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Toaster } from "sonner";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useThemeStore } from "@/stores/themeStore";
import { useTerminalStore } from "@/stores/terminalStore";

function App() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    useThemeStore.getState().initTheme();
  }, []);

  useEffect(() => {
    const unlisten = listen("close-active-tab", () => {
      const { activeTabId, closeTab } = useTerminalStore.getState();
      if (activeTabId) {
        closeTab(activeTabId);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <>
      <Toaster theme={theme === "system" ? "system" : theme} />
      <MainLayout />
    </>
  );
}

export default App;
