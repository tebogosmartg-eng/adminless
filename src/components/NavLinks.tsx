import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Settings, Book } from "lucide-react";
import { cn } from "@/lib/utils";

export const NavLinks = () => {
  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/classes", icon: Users, label: "Classes" },
    { to: "/teacher-file", icon: Book, label: "Teacher File" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="space-y-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200",
              isActive 
                ? "bg-primary/10 text-primary font-medium shadow-sm" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </NavLink>
      ))}
    </div>
  );
};