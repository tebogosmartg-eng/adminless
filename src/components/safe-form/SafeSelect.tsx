import { FocusEvent, ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type FieldValidationRule = {
  type: "required" | "email" | "number";
  message?: string;
};

type SafeFormShape = {
  values: Record<string, string>;
  errors?: Record<string, string>;
  setFieldValue: (field: string, value: string, rules?: FieldValidationRule[]) => void;
};

interface SafeSelectOption {
  value: string;
  label: ReactNode;
}

interface SafeSelectProps {
  form: SafeFormShape;
  name: string;
  placeholder?: string;
  options: SafeSelectOption[];
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  rules?: FieldValidationRule[];
  error?: string;
  onValueChange?: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
}

export const SafeSelect = ({
  form,
  name,
  placeholder,
  options,
  triggerClassName,
  contentClassName,
  disabled,
  rules,
  error,
  onValueChange,
  onBlur,
}: SafeSelectProps) => {
  const value = form.values[name] ?? "";
  const fieldError = error ?? form.errors?.[name] ?? "";

  return (
    <div className="space-y-1">
      <Select
        value={value}
        onValueChange={(nextValue) => {
          form.setFieldValue(name, nextValue, rules);
          onValueChange?.(nextValue);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            triggerClassName,
            fieldError ? "border-destructive focus:ring-destructive" : "",
          )}
          aria-invalid={fieldError ? true : undefined}
          onBlur={onBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
    </div>
  );
};
