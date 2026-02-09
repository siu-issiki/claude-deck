import { ChevronRight, Folder } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { SessionItem } from "./SessionItem";
import { cn } from "@/lib/utils";
import type { ProjectInfo } from "@/types/project";

interface ProjectItemProps {
  project: ProjectInfo;
}

export function ProjectItem({ project }: ProjectItemProps) {
  const { expandedProjectIds, sessionsByProject, toggleProject } =
    useProjectStore();

  const isExpanded = expandedProjectIds.has(project.id);
  const sessions = sessionsByProject[project.id];

  return (
    <div>
      <button
        onClick={() => toggleProject(project.id)}
        className={cn(
          "flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "transition-colors"
        )}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )}
        />
        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{project.displayName}</span>
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          {project.sessionCount}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-3">
          {!sessions ? (
            <p className="px-3 py-1 text-[10px] text-muted-foreground">
              Loading...
            </p>
          ) : sessions.length === 0 ? (
            <p className="px-3 py-1 text-[10px] text-muted-foreground">
              No sessions
            </p>
          ) : (
            sessions.map((session) => (
              <SessionItem key={session.id} session={session} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
