import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const EmptyState = ({ title, description, icon = <FolderOpen className="h-12 w-12 opacity-20" /> }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
    {icon}
    <h3 className="font-bold text-foreground mt-4">{title}</h3>
    <p className="text-sm max-w-xs mt-1">{description}</p>
  </div>
);