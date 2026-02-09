import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TerminalTabs() {
  return (
    <Tabs defaultValue="welcome" className="flex h-full flex-col">
      <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-2">
        <TabsTrigger value="welcome" className="text-xs">
          Welcome
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="welcome"
        className="flex flex-1 items-center justify-center"
      >
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Welcome to nexus</p>
          <p className="mt-1 text-sm">
            Select a project from the sidebar to start a session
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
