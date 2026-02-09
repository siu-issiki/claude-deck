import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ProjectList } from "./ProjectList";
import { useProjectStore } from "@/stores/projectStore";

interface SidebarProps {
  width: number;
}

export function Sidebar({ width }: SidebarProps) {
  const { searchQuery, setSearchQuery } = useProjectStore();

  return (
    <aside
      className="flex h-full flex-shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground"
      style={{ width }}
    >
      <div className="flex h-12 items-center border-b border-border px-4">
        <h1 className="text-sm font-semibold">nexus</h1>
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <ProjectList />
      </ScrollArea>
    </aside>
  );
}
