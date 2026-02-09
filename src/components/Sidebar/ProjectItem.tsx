import { useState } from "react";
import { ChevronRight, Folder, Plus } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { SessionItem } from "./SessionItem";
import { NewSessionDialog } from "@/components/Terminal/NewSessionDialog";
import { cn } from "@/lib/utils";
import type { ProjectInfo } from "@/types/project";

interface ProjectItemProps {
  project: ProjectInfo;
}

export function ProjectItem({ project }: ProjectItemProps) {
  const { expandedProjectIds, sessionsByProject, toggleProject } =
    useProjectStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isExpanded = expandedProjectIds.has(project.id);
  const sessions = sessionsByProject[project.id];

  return (
    <div className="overflow-hidden">
      <div className="group flex items-center">
        <button
          onClick={() => toggleProject(project.id)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 px-3 py-1.5 text-left text-xs",
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDialogOpen(true);
          }}
          className="mr-2 rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-hover:opacity-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

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

      <NewSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultCwd={project.path}
      />
    </div>
  );
}
