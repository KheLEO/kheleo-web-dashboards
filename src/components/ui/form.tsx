"use client";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./button";
import { Alert } from "./alert";
import { sameOperation, type MutationOperation } from "@/lib/api/operation";
import { asApiError } from "@/lib/api/errors";

export interface FieldDefinition {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "password"
    | "date"
    | "datetime-local"
    | "number"
    | "textarea"
    | "select"
    | "hidden";
  options?: readonly string[];
  optionLabels?: Record<string, string>;
  valueType?: "number" | "boolean" | "list" | "json" | "datetime";
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  hint?: string;
  sensitive?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}
export interface SchemaFormProps<T> {
  fields: readonly FieldDefinition[];
  schema: z.ZodType<T>;
  submit: (value: T, operation: MutationOperation) => Promise<unknown>;
  submitLabel: string;
  defaults?: Record<string, string>;
  onSuccess?: () => void;
  successMessage?: string;
  disabled?: boolean;
}
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  const last = parts.pop();
  if (!last) return;
  const current = parts.reduce<Record<string, unknown>>((parent, part) => {
    const existing = parent[part];
    if (typeof existing === "object" && existing !== null && !Array.isArray(existing))
      return existing as Record<string, unknown>;
    const child: Record<string, unknown> = {};
    parent[part] = child;
    return child;
  }, target);
  current[last] = value;
}
export function SchemaForm<T>({
  fields,
  schema,
  submit,
  submitLabel,
  defaults,
  onSuccess,
  successMessage = "Changes saved.",
  disabled = false,
}: SchemaFormProps<T>) {
  const isHydrated = useHydrated();
  const {
    register,
    handleSubmit,
    resetField,
    formState: { isSubmitting },
  } = useForm<Record<string, unknown>>({ defaultValues: defaults ?? {} });
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const operation = useRef<MutationOperation | null>(null);
  const flight = useRef(false);
  const onSubmit = async (values: Record<string, unknown>): Promise<void> => {
    setMessage(null);
    setFailure(null);
    try {
      const payload: Record<string, unknown> = {};
      if (defaults) {
        for (const [key, val] of Object.entries(defaults)) {
          if (val !== undefined && val !== "") {
            setPath(payload, key, val);
          }
        }
      }
      for (const field of fields) {
        const value = field.name
          .split(".")
          .reduce<unknown>(
            (parent, key) =>
              typeof parent === "object" && parent !== null && key in parent
                ? (parent as Record<string, unknown>)[key]
                : undefined,
            values,
          );
        const raw = typeof value === "string" ? value.trim() : "";
        if (!raw) continue;
        const parsed: unknown =
          field.valueType === "number"
            ? Number(raw)
            : field.valueType === "boolean"
              ? raw === "true"
              : field.valueType === "list"
                ? raw
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : field.valueType === "json"
                  ? (JSON.parse(raw) as unknown)
                  : field.valueType === "datetime"
                    ? new Date(raw).toISOString()
                    : raw;
        setPath(payload, field.name, parsed);
      }
      const result = schema.safeParse(payload);
      if (!result.success) {
        setFailure(
          result.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(" · "),
        );
        return;
      }
      operation.current = sameOperation(operation.current, result.data);
      await submit(result.data, operation.current);
      operation.current = null;
      for (const field of fields) if (field.sensitive) resetField(field.name, { defaultValue: "" });
      setMessage(successMessage);
      onSuccess?.();
    } catch (error: unknown) {
      setFailure(
        error instanceof SyntaxError
          ? "Enter valid JSON in the metrics or badges field."
          : asApiError(error).message,
      );
    }
  };
  return (
    <form
      data-hydrated={isHydrated ? "true" : "false"}
      aria-busy={!isHydrated || isSubmitting}
      onSubmit={(event) => {
        if (!isHydrated || flight.current) {
          event.preventDefault();
          return;
        }
        flight.current = true;
        void (async () => {
          try {
            await handleSubmit(onSubmit)(event);
          } catch (error: unknown) {
            setFailure(asApiError(error).message);
          } finally {
            flight.current = false;
          }
        })();
      }}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          if (field.type === "hidden") {
            return (
              <input key={field.name} type="hidden" id={field.name} {...register(field.name)} />
            );
          }
          return (
            <div
              className={`field ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
              key={field.name}
            >
              <label htmlFor={field.name}>{field.label}</label>
              {field.type === "select" ? (
                <select
                  id={field.name}
                  aria-label={field.ariaLabel}
                  aria-describedby={field.hint ? `${field.name}-hint` : undefined}
                  className="control"
                  {...register(field.name)}
                  disabled={disabled || !isHydrated || isSubmitting}
                  required={field.required}
                >
                  <option value="">Select…</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {field.optionLabels?.[option] ?? option.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  aria-label={field.ariaLabel}
                  placeholder={field.placeholder}
                  aria-describedby={field.hint ? `${field.name}-hint` : undefined}
                  rows={3}
                  className="control"
                  {...register(field.name)}
                  disabled={disabled || !isHydrated || isSubmitting}
                />
              ) : (
                <input
                  id={field.name}
                  aria-label={field.ariaLabel}
                  placeholder={field.placeholder}
                  aria-describedby={field.hint ? `${field.name}-hint` : undefined}
                  className="control"
                  {...register(field.name)}
                  type={field.type ?? "text"}
                  required={field.required}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? (field.type === "number" ? "any" : undefined)}
                  disabled={disabled || !isHydrated || isSubmitting}
                  autoComplete={field.sensitive ? "off" : undefined}
                />
              )}
              {field.hint && (
                <span
                  id={`${field.name}-hint`}
                  className="text-xs font-normal leading-5 text-muted-foreground"
                >
                  {field.hint}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {failure && <Alert danger>{failure}</Alert>}
      {message && <Alert>{message}</Alert>}
      <Button type="submit" disabled={disabled || !isHydrated || isSubmitting}>
        {isSubmitting ? "Submitting…" : submitLabel}
      </Button>
    </form>
  );
}
