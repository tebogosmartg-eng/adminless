import { NavLinks } from "./NavLinks";
import logo from "@/source bucket/AdminLess logo.png";

const Sidebar = () => {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-[#1a1a1a] text-sidebar-foreground md:block transition-colors duration-300">
      <div className="flex h-full flex-col">
        <div className="flex h-20 items-center border-b border-white/5 px-6 gap-4">
          <div className="bg-white p-1 rounded-xl shadow-sm">
            <img src={logo} alt="AdminLess Logo" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">AdminLess</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-white/5 text-[10px] text-white/30 uppercase tracking-widest text-center">
          AdminLess v3.1
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;