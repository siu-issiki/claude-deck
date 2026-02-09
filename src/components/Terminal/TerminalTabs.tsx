import { useTerminalStore } from "@/stores/terminalStore";
import { TerminalPane } from "./TerminalPane";

export function TerminalTabs() {
  const { tabs, activeTabId } = useTerminalStore();

  if (tabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Welcome to nexus</p>
          <p className="mt-1 text-sm">
            Select a project from the sidebar to start a session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="absolute inset-0"
          style={{ display: tab.id === activeTabId ? "block" : "none" }}
        >
          <TerminalPane tabId={tab.id} isVisible={tab.id === activeTabId} />
        </div>
      ))}
    </div>
  );
}
