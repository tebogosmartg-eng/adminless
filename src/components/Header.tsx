import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import MobileSidebar from "./MobileSidebar";
import { useSettings } from "@/context/SettingsContext";

const Header = () => {
  const { teacherName } = useSettings();

  const initials = teacherName
    ? teacherName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : "T";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:justify-end md:px-6">
      <MobileSidebar />
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="flex items-center gap-2">
          {teacherName && (
            <span className="text-sm font-medium hidden md:block text-muted-foreground">
              {teacherName}
            </span>
          )}
          <Avatar>
            <AvatarImage src="" alt={teacherName || "Teacher"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default Header;