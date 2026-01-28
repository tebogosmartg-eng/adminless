import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClasses } from "@/context/ClassesContext";
import { LayoutDashboard, Users, Camera, Settings, User, BookOpen, FileBarChart } from "lucide-react";

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { classes } = useClasses();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    // Listen for custom event trigger from Header button
    const openHandler = () => setOpen(true);
    window.addEventListener("open-command-search", openHandler);

    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-search", openHandler);
    };
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  // Flatten learners for search
  const allLearners = useMemo(() => classes.flatMap(c => 
    c.learners.map(l => ({ 
      ...l, 
      classId: c.id, 
      className: c.className,
      subject: c.subject,
      key: `${c.id}-${l.name}`
    }))
  ), [classes]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search for a student..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/classes"))}>
            <Users className="mr-2 h-4 w-4" />
            All Classes
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/scan"))}>
            <Camera className="mr-2 h-4 w-4" />
            Scan Scripts
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/reports"))}>
            <FileBarChart className="mr-2 h-4 w-4" />
            Reports
          </CommandItem>
           <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Classes">
          {classes.map((c) => (
            <CommandItem key={c.id} onSelect={() => runCommand(() => navigate(`/classes/${c.id}`))}>
              <BookOpen className="mr-2 h-4 w-4" />
              {c.subject} ({c.className})
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Learners">
           {allLearners.map((l) => (
             <CommandItem 
                key={l.key} 
                onSelect={() => runCommand(() => navigate(`/classes/${l.classId}`, { state: { openLearnerId: l.id || l.name } }))}
             >
               <User className="mr-2 h-4 w-4" />
               <div className="flex flex-col">
                 <span>{l.name}</span>
                 <span className="text-xs text-muted-foreground">{l.subject} - {l.className}</span>
               </div>
             </CommandItem>
           ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}