import { useProjects } from "@/hooks/useProjects";
import { ProjectItem } from "./ProjectItem";

export function ProjectList() {
  const { projects, isLoading, error } = useProjects();

  if (isLoading && projects.length === 0) {
    return (
      <div className="p-4">
        <p className="text-xs text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-xs text-destructive">Error: {error}</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-4">
        <p className="text-xs text-muted-foreground">No projects found</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {projects.map((project) => (
        <ProjectItem key={project.id} project={project} />
      ))}
    </div>
  );
}
