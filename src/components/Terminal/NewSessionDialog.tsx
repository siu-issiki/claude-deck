import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTerminalStore } from "@/stores/terminalStore";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCwd?: string;
}

export function NewSessionDialog({
  open: isOpen,
  onOpenChange,
  defaultCwd = "",
}: NewSessionDialogProps) {
  const [cwd, setCwd] = useState(defaultCwd);
  const openNewSession = useTerminalStore((s) => s.openNewSession);

  useEffect(() => {
    if (isOpen) setCwd(defaultCwd);
  }, [isOpen, defaultCwd]);

  const handleBrowse = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      setCwd(selected as string);
    }
  };

  const handleStart = async () => {
    if (!cwd.trim()) return;
    await openNewSession(cwd.trim());
    onOpenChange(false);
    setCwd("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Session</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            placeholder="/path/to/project"
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleStart();
            }}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleBrowse}>
            <FolderOpen className="h-4 w-4" />
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={handleStart} disabled={!cwd.trim()}>
            Start Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
