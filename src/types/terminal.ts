export interface TerminalTab {
  id: string;
  projectId: string | null;
  sessionId: string | null;
  title: string;
  cwd: string | null;
}

export type PersistedTab = Pick<TerminalTab, "projectId" | "sessionId" | "title" | "cwd">;
