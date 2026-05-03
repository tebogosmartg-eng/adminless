import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface LabeledFieldRowProps {
  label: React.ReactNode;
  htmlFor?: string;
  /** Field control(s); receives full width on mobile and 3/4 grid span from `sm`. */
  children: React.ReactNode;
  className?: string;
  /** Extra classes on the label (e.g. `text-xs`). */
  labelClassName?: string;
  /** Use when the control block is tall (multi-line). */
  alignStart?: boolean;
}

/**
 * Responsive dialog form row: stacks label + control on narrow screens;
 * label | control (3 cols) from `sm` upward. Matches EditClassDialog / GlobalAddNoteDialog.
 */
export function LabeledFieldRow({
  label,
  htmlFor,
  children,
  className,
  labelClassName,
  alignStart,
}: LabeledFieldRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-4",
        alignStart
          ? "items-start sm:items-start"
          : "items-start sm:items-center",
        className,
      )}
    >
      <Label
        htmlFor={htmlFor}
        className={cn("sm:text-right shrink-0", labelClassName)}
      >
        {label}
      </Label>
      <div className="sm:col-span-3 w-full min-w-0">{children}</div>
    </div>
  );
}
