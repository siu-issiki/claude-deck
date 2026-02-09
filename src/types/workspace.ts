import type { PersistedTab } from "./terminal";

export interface PersistedWorkspace {
  tabs: PersistedTab[];
  activeTabIndex: number;
  sidebarWidth: number;
}

export const WORKSPACE_DEFAULTS: PersistedWorkspace = {
  tabs: [],
  activeTabIndex: -1,
  sidebarWidth: 256,
};
