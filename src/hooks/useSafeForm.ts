import { useCallback, useMemo, useRef, useState } from "react";

type SafeFormValues = Record<string, string>;
type ValidationType = "required" | "email" | "number";

interface FieldValidationRule {
  type: ValidationType;
  message?: string;
}

type ValidationRules<TValues extends SafeFormValues> = Partial<
  Record<keyof TValues, FieldValidationRule[]>
>;

interface UseSafeFormOptions<TValues extends SafeFormValues> {
  initialValues: TValues;
}

export const useSafeForm = <TValues extends SafeFormValues>({
  initialValues,
}: UseSafeFormOptions<TValues>) => {
  const initialValuesRef = useRef<TValues>(initialValues);
  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof TValues, string>>>({});

  const runValidation = useCallback(
    <TField extends keyof TValues>(
      field: TField,
      value: TValues[TField],
      rules?: FieldValidationRule[],
    ): string => {
      if (!rules?.length) return "";
      const normalizedValue = String(value ?? "").trim();

      for (const rule of rules) {
        if (rule.type === "required" && !normalizedValue) {
          return rule.message ?? "This field is required.";
        }
        if (rule.type === "email" && normalizedValue) {
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue);
          if (!isEmail) {
            return rule.message ?? "Please enter a valid email address.";
          }
        }
        if (rule.type === "number" && normalizedValue) {
          if (Number.isNaN(Number(normalizedValue))) {
            return rule.message ?? "Please enter a valid number.";
          }
        }
      }

      return "";
    },
    [],
  );

  const setFieldValue = useCallback(
    <TField extends keyof TValues>(
      field: TField,
      value: TValues[TField],
      rules?: FieldValidationRule[],
    ) => {
      setValues((prev) => {
        if (prev[field] === value) return prev;
        return {
          ...prev,
          [field]: value,
        };
      });

      const nextError = runValidation(field, value, rules);
      setErrors((prev) => {
        if (!nextError && !prev[field]) return prev;
        if (nextError && prev[field] === nextError) return prev;

        if (!nextError) {
          const { [field]: _removed, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [field]: nextError,
        };
      });
    },
    [runValidation],
  );

  const reset = useCallback((nextValues?: TValues) => {
    if (nextValues) {
      initialValuesRef.current = nextValues;
      setValues(nextValues);
      setErrors({});
      return;
    }
    setValues(initialValuesRef.current);
    setErrors({});
  }, []);

  const isDirty = useMemo(() => {
    const initial = initialValuesRef.current;
    const currentKeys = Object.keys(values);
    const initialKeys = Object.keys(initial);

    if (currentKeys.length !== initialKeys.length) return true;

    return currentKeys.some((key) => values[key] !== initial[key]);
  }, [values]);

  const getValue = useCallback(
    <TField extends keyof TValues>(field: TField): TValues[TField] => {
      const value = values[field];
      return (value ?? "") as TValues[TField];
    },
    [values],
  );

  const validateField = useCallback(
    <TField extends keyof TValues>(
      field: TField,
      rules?: FieldValidationRule[],
      valueOverride?: TValues[TField],
    ) => {
      const valueToValidate = valueOverride ?? values[field];
      const nextError = runValidation(field, valueToValidate, rules);
      setErrors((prev) => {
        if (!nextError && !prev[field]) return prev;
        if (nextError && prev[field] === nextError) return prev;
        if (!nextError) {
          const { [field]: _removed, ...rest } = prev;
          return rest;
        }
        return {
          ...prev,
          [field]: nextError,
        };
      });
      return !nextError;
    },
    [runValidation, values],
  );

  const validateAll = useCallback(
    (rules: ValidationRules<TValues>) => {
      const nextErrors: Partial<Record<keyof TValues, string>> = {};
      (Object.keys(rules) as (keyof TValues)[]).forEach((field) => {
        const message = runValidation(field, values[field], rules[field]);
        if (message) {
          nextErrors[field] = message;
        }
      });
      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    },
    [runValidation, values],
  );

  return useMemo(
    () => ({
      values,
      errors,
      isDirty,
      setValues,
      setFieldValue,
      getValue,
      reset,
      validateField,
      validateAll,
    }),
    [errors, getValue, isDirty, reset, setFieldValue, validateAll, validateField, values],
  );
};
