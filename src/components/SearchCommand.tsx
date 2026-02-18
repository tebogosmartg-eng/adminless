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
import { useNavigate, useParams } from "react-router-dom";
import { useClasses } from "@/context/ClassesContext";
import { LayoutDashboard, Users, Camera, Settings, User, BookOpen, FileBarChart, BadgeCheck, Book } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { classId } = useParams();
  const { classes } = useClasses();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
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

  // Process all learners and tag them if they belong to the current active class
  const allLearners = useMemo(() => {
    const list = classes.flatMap(c => 
      c.learners.map(l => ({ 
        ...l, 
        classId: c.id, 
        className: c.className,
        subject: c.subject,
        grade: c.grade,
        isCurrentClass: c.id === classId,
        key: `${c.id}-${l.name}`
      }))
    );
    
    // Sort so current class learners appear first
    return list.sort((a, b) => (a.isCurrentClass === b.isCurrentClass ? 0 : a.isCurrentClass ? -1 : 1));
  }, [classes, classId]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search for a learner..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="In This Class">
            {allLearners.filter(l => l.isCurrentClass).map((l) => (
                <CommandItem 
                    key={l.key} 
                    onSelect={() => runCommand(() => navigate(`/classes/${l.classId}`, { state: { openLearnerId: l.id || l.name } }))}
                >
                    <User className="mr-2 h-4 w-4 text-primary" />
                    <div className="flex flex-1 items-center justify-between">
                        <span>{l.name}</span>
                        <Badge variant="secondary" className="text-[8px] h-4 bg-primary/10 text-primary">Active Session</Badge>
                    </div>
                </CommandItem>
            ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Global Learner Search">
           {allLearners.filter(l => !l.isCurrentClass).map((l) => (
             <CommandItem 
                key={l.key} 
                onSelect={() => runCommand(() => navigate(`/classes/${l.classId}`, { state: { openLearnerId: l.id || l.name } }))}
             >
               <User className="mr-2 h-4 w-4 opacity-50" />
               <div className="flex flex-col">
                 <span className="text-sm">{l.name}</span>
                 <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    {l.grade} • {l.subject} ({l.className})
                 </span>
               </div>
             </CommandItem>
           ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/classes"))}>
            <Users className="mr-2 h-4 w-4" /> All Classes
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/teacher-file"))}>
            <Book className="mr-2 h-4 w-4" /> Teacher File
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/scan"))}>
            <Camera className="mr-2 h-4 w-4" /> Scan Scripts
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/reports"))}>
            <FileBarChart className="mr-2 h-4 w-4" /> Reports
          </CommandItem>
           <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}