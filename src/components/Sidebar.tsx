import { NavLinks } from "./NavLinks";
import icon from "@/source bucket/ICON.png";

const Sidebar = () => {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-background text-foreground md:block transition-colors duration-300">
      <div className="flex h-full flex-col">
        <div className="flex h-24 items-center border-b border-border px-4 gap-2 flex-shrink-0 min-w-0 overflow-hidden">
          <img
            src={icon}
            alt="AdminLess Icon"
            className="h-12 w-auto object-contain flex-shrink-0"
          />
          <h1 className="text-xl font-bold tracking-tight text-foreground truncate">AdminLess</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-border text-[10px] text-muted-foreground uppercase tracking-widest text-center">
          AdminLess v3.1
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;