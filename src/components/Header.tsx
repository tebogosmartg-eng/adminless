import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  return (
    <header className="flex h-16 items-center justify-end border-b bg-background px-4 md:px-6">
      <Avatar>
        <AvatarImage src="/placeholder.svg" alt="User" />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </header>
  );
};

export default Header;