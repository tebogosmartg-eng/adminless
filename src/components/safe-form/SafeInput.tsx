import { ChangeEvent } from "react";
import { Input, InputProps } from "@/components/ui/input";
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

interface SafeInputProps extends Omit<InputProps, "name" | "value" | "onChange"> {
  form: SafeFormShape;
  name: string;
  rules?: FieldValidationRule[];
  error?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const SafeInput = ({ form, name, rules, error, onChange, ...props }: SafeInputProps) => {
  const value = form.values[name] ?? "";
  const fieldError = error ?? form.errors?.[name] ?? "";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    form.setFieldValue(name, event.target.value, rules);
    onChange?.(event);
  };

  return (
    <div className="space-y-1">
      <Input
        {...props}
        name={name}
        value={value}
        onChange={handleChange}
        className={cn(props.className, fieldError ? "border-destructive focus-visible:ring-destructive" : "")}
        aria-invalid={fieldError ? true : undefined}
      />
      {fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
    </div>
  );
};
