import { useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { TerminalTabs } from "@/components/Terminal/TerminalTabs";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useWorkspace } from "@/hooks/useWorkspace";

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;

export function MainLayout() {
  useWorkspace();

  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth);
  const setSidebarWidth = useWorkspaceStore((s) => s.setSidebarWidth);
  const dragging = useRef(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX));
        setSidebarWidth(width);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [setSidebarWidth]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar width={sidebarWidth} />
      <div
        className="h-full w-1 flex-shrink-0 cursor-col-resize hover:bg-primary/20 active:bg-primary/30"
        onMouseDown={onMouseDown}
      />
      <main className="flex-1 overflow-hidden">
        <TerminalTabs />
      </main>
    </div>
  );
}
