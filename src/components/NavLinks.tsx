import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Camera, Settings, FileBarChart } from "lucide-react";
import { cn } from "@/lib/utils";

export const NavLinks = () => {
  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/classes", icon: Users, label: "Classes" },
    { to: "/scan", icon: Camera, label: "Scan Scripts" },
    { to: "/reports", icon: FileBarChart, label: "Reports" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              isActive && "bg-muted text-primary"
            )
          }
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </NavLink>
      ))}
    </>
  );
};