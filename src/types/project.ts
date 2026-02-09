export interface ProjectInfo {
  id: string;
  path: string;
  displayName: string;
  host: string;
  owner: string;
}

export interface NexusSession {
  id: string;
  projectId: string;
  title: string;
  cwd: string;
  createdAt: number;
  updatedAt: number;
}
