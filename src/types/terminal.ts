export interface TerminalTab {
  id: string;
  sessionId: string;
  title: string;
  cwd: string;
}

export type PersistedTab = Pick<TerminalTab, "sessionId" | "title" | "cwd">;
