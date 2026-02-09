import { Sidebar } from "@/components/Sidebar/Sidebar";
import { TerminalTabs } from "@/components/Terminal/TerminalTabs";

export function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <TerminalTabs />
      </main>
    </div>
  );
}
