import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ContextBar } from "./ContextBar";
import { SearchCommand } from "./SearchCommand";

const Layout = () => {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <ContextBar />
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:p-6 mt-4 md:mt-0">
          <Outlet />
        </main>
      </div>
      <SearchCommand />
    </div>
  );
};

export default Layout;