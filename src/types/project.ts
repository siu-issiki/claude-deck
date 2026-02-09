export interface ProjectInfo {
  id: string;
  path: string;
  displayName: string;
  sessionCount: number;
  lastActivity: number | null;
}

export interface SessionInfo {
  id: string;
  projectId: string;
  createdAt: string | null;
  updatedAt: number | null;
  firstMessage: string | null;
  gitBranch: string | null;
  cwd: string | null;
}
