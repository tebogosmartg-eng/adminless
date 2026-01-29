import { NavLinks } from "./NavLinks";

const Sidebar = () => {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-sidebar text-sidebar-foreground md:block transition-colors duration-300">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <h1 className="text-xl font-bold tracking-tight text-white/90">SmaReg</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-sidebar-border text-[10px] text-white/30 uppercase tracking-widest text-center">
          Calm Classroom v3.0
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;