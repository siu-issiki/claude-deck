import { create } from "zustand";
import { settingsStore } from "./workspaceStore";
import type { NexusSession } from "@/types/project";

interface SessionState {
  sessions: NexusSession[];
  isLoaded: boolean;

  loadSessions: () => Promise<void>;
  createSession: (
    projectId: string,
    cwd: string,
    title?: string
  ) => Promise<NexusSession>;
  updateSession: (
    id: string,
    updates: Partial<Pick<NexusSession, "title" | "updatedAt">>
  ) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  getSessionsByProject: (projectId: string) => NexusSession[];
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  sessions: [],
  isLoaded: false,

  loadSessions: async () => {
    const raw = await settingsStore.get<NexusSession[]>("sessions");
    set({ sessions: raw ?? [], isLoaded: true });
  },

  createSession: async (projectId, cwd, title) => {
    const session: NexusSession = {
      id: crypto.randomUUID(),
      projectId,
      title: title ?? cwd.split("/").filter(Boolean).pop() ?? "New Session",
      cwd,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const next = [...get().sessions, session];
    set({ sessions: next });
    await settingsStore.set("sessions", next);

    return session;
  },

  updateSession: async (id, updates) => {
    const next = get().sessions.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    set({ sessions: next });
    await settingsStore.set("sessions", next);
  },

  deleteSession: async (id) => {
    const next = get().sessions.filter((s) => s.id !== id);
    set({ sessions: next });
    await settingsStore.set("sessions", next);
  },

  getSessionsByProject: (projectId) => {
    return get().sessions.filter((s) => s.projectId === projectId);
  },
}));
