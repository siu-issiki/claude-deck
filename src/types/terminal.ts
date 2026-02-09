export interface TerminalTab {
  id: string;
  projectId: string | null;
  sessionId: string | null;
  title: string;
  cwd: string | null;
}

export interface PersistedTab {
  projectId: string | null;
  sessionId: string | null;
  title: string;
  cwd: string | null;
}
