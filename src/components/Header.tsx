import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import MobileSidebar from "./MobileSidebar";

const Header = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:justify-end md:px-6">
      <MobileSidebar />
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <Avatar>
          <AvatarImage src="/placeholder.svg" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default Header;