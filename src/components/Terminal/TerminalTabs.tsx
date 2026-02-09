import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTerminalStore } from "@/stores/terminalStore";
import { TerminalPane } from "./TerminalPane";
import { NewSessionDialog } from "./NewSessionDialog";
import { cn } from "@/lib/utils";

export function TerminalTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTerminalStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (tabs.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-9 items-center border-b border-border px-2">
          <span className="text-xs text-muted-foreground">Terminal</span>
          <button
            onClick={() => setDialogOpen(true)}
            className="ml-auto rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Welcome to nexus</p>
            <p className="mt-1 text-sm">
              Select a project from the sidebar to start a session
            </p>
          </div>
        </div>
        <NewSessionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center gap-0 border-b border-border bg-transparent px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "group flex h-7 items-center gap-1 rounded-sm px-2 text-xs",
              "transition-colors",
              tab.id === activeTabId
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
            )}
          >
            <span className="max-w-[120px] truncate">{tab.title}</span>
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-0.5 rounded-sm p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
        <button
          onClick={() => setDialogOpen(true)}
          className="ml-1 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative flex-1">
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
      <NewSessionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
