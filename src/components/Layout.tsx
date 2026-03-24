import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ContextBar } from "./ContextBar";
import { SearchCommand } from "./SearchCommand";
import { DebugPanel } from "./DebugPanel";

const Layout = () => {
  return (
    <div className="flex min-h-screen w-full bg-muted/40 overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 w-full max-w-full">
        <Header />
        <ContextBar />
        <main className="flex-1 p-3 md:p-4 mt-2 md:mt-0 w-full max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <SearchCommand />
      <DebugPanel />
    </div>
  );
};

export default Layout;