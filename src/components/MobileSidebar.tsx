import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, Users, Camera, Settings, FileBarChart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const MobileSidebar = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col p-0">
        <div className="sr-only">
          <SheetTitle>Mobile Navigation Menu</SheetTitle>
          <SheetDescription>
            Navigate through Dashboard, Classes, Scan Scripts, Reports, and Settings.
          </SheetDescription>
        </div>
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-2xl font-bold">SmaReg</h1>
        </div>
        <nav className="grid gap-2 text-lg font-medium p-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
              )
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </NavLink>
          <NavLink
            to="/classes"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
              )
            }
          >
            <Users className="h-5 w-5" />
            Classes
          </NavLink>
          <NavLink
            to="/scan"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
              )
            }
          >
            <Camera className="h-5 w-5" />
            Scan Scripts
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
              )
            }
          >
            <FileBarChart className="h-5 w-5" />
            Reports
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
              )
            }
          >
            <Settings className="h-5 w-5" />
            Settings
          </NavLink>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebar;