import { Moon, Sun, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {theme === 'light' && <Sun className="h-[1.2rem] w-[1.2rem]" />}
          {theme === 'dark' && <Moon className="h-[1.2rem] w-[1.2rem]" />}
          {theme === 'system' && <Sparkles className="h-[1.2rem] w-[1.2rem] text-primary" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="h-4 w-4" /> Calm Classroom
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="h-4 w-4" /> Night Marker
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Sparkles className="h-4 w-4" /> Contextual AI
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}