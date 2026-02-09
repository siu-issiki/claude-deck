import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ProjectInfo, SessionInfo } from "@/types/project";

interface ProjectState {
  projects: ProjectInfo[];
  sessionsByProject: Record<string, SessionInfo[]>;
  searchQuery: string;
  expandedProjectIds: Set<string>;
  selectedSessionId: string | null;
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchSessions: (projectId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleProject: (projectId: string) => void;
  selectSession: (projectId: string, sessionId: string) => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  sessionsByProject: {},
  searchQuery: "",
  expandedProjectIds: new Set(),
  selectedSessionId: null,
  selectedProjectId: null,
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

  fetchSessions: async (projectId: string) => {
    try {
      const sessions = await invoke<SessionInfo[]>("list_sessions", {
        projectId,
      });
      set((state) => ({
        sessionsByProject: {
          ...state.sessionsByProject,
          [projectId]: sessions,
        },
      }));
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  toggleProject: (projectId: string) => {
    const { expandedProjectIds, sessionsByProject, fetchSessions } = get();
    const next = new Set(expandedProjectIds);
    if (next.has(projectId)) {
      next.delete(projectId);
    } else {
      next.add(projectId);
      if (!sessionsByProject[projectId]) {
        fetchSessions(projectId);
      }
    }
    set({ expandedProjectIds: next });
  },

  selectSession: (projectId: string, sessionId: string) => {
    set({ selectedProjectId: projectId, selectedSessionId: sessionId });
  },
}));
