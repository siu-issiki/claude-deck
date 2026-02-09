import { useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";

export function useProjects() {
  const { projects, searchQuery, isLoading, error, fetchProjects } =
    useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = searchQuery.trim()
    ? projects.filter((p) => {
        const query = searchQuery.toLowerCase();
        return (
          p.displayName.toLowerCase().includes(query) ||
          p.path.toLowerCase().includes(query) ||
          p.owner.toLowerCase().includes(query)
        );
      })
    : projects;

  return {
    projects: filteredProjects,
    isLoading,
    error,
    refetch: fetchProjects,
  };
}
