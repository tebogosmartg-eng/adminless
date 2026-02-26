import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ContextBar } from "./ContextBar";
import { SearchCommand } from "./SearchCommand";
import { DebugPanel } from "./DebugPanel";

const Layout = () => {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <ContextBar />
        <main className="flex-1 p-3 md:p-4 mt-4 md:mt-0">
          <Outlet />
        </main>
      </div>
      <SearchCommand />
      <DebugPanel />
    </div>
  );
};

export default Layout;