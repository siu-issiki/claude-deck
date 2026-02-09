import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ProjectInfo } from "@/types/project";

interface ProjectState {
  projects: ProjectInfo[];
  searchQuery: string;
  expandedProjectIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleProject: (projectId: string) => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  searchQuery: "",
  expandedProjectIds: new Set(),
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await invoke<ProjectInfo[]>("list_projects");
      set({ projects, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  toggleProject: (projectId: string) => {
    const { expandedProjectIds } = get();
    const next = new Set(expandedProjectIds);
    if (next.has(projectId)) {
      next.delete(projectId);
    } else {
      next.add(projectId);
    }
    set({ expandedProjectIds: next });
  },
}));
