import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { NavLinks } from "./NavLinks";
import logo from "@/source bucket/AdminLess logo.png";

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
        <div className="flex h-24 items-center border-b px-6 gap-4">
          <div className="bg-white p-2 rounded-2xl shadow-md border">
            <img src={logo} alt="AdminLess Logo" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">AdminLess</h1>
        </div>
        <nav className="grid gap-2 text-lg font-medium p-4">
          <NavLinks />
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebar;