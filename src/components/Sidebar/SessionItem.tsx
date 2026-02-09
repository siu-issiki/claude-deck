import { MessageSquare } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { cn } from "@/lib/utils";
import type { SessionInfo } from "@/types/project";

interface SessionItemProps {
  session: SessionInfo;
}

function formatRelativeTime(unixMs: number | null): string {
  if (unixMs === null) return "";
  const now = Date.now();
  const diffMs = now - unixMs;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(unixMs).toLocaleDateString();
}

export function SessionItem({ session }: SessionItemProps) {
  const { selectedSessionId, selectSession } = useProjectStore();
  const openSession = useTerminalStore((s) => s.openSession);
  const isSelected = selectedSessionId === session.id;
  const preview = session.firstMessage || "No message";

  const handleClick = () => {
    selectSession(session.projectId, session.id);
    openSession(
      session.projectId,
      session.id,
      session.cwd ?? undefined,
      session.firstMessage ?? "New session"
    );
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full flex-col gap-0.5 px-3 py-1.5 text-left",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "transition-colors",
        isSelected && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs">{preview}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2 pl-[18px]">
        {session.gitBranch && (
          <span className="truncate text-[10px] text-muted-foreground">
            {session.gitBranch}
          </span>
        )}
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          {formatRelativeTime(session.updatedAt)}
        </span>
      </div>
    </button>
  );
}
