import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-12 items-center border-b border-border px-4">
        <h1 className="text-sm font-semibold">nexus</h1>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          <p className="text-xs text-muted-foreground">
            Projects will appear here
          </p>
        </div>
      </ScrollArea>
    </aside>
  );
}
