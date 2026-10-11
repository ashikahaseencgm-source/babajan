import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "block w-full min-h-11 rounded-sm border border-mist bg-white px-3.5 py-2.5 text-[0.9375rem] text-charcoal " +
  "placeholder:text-slate/70 transition-colors duration-150 hover:border-slate-muted " +
  "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-blue focus-visible:border-blue " +
  "aria-[invalid=true]:border-error disabled:bg-ivory disabled:text-slate";

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%230F2D4F' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")";

type FieldShellProps = {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Persistent label, hint and error, associated via aria-describedby. */
export function FieldShell({ id, label, error, hint, required, optional, className, children }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[0.8125rem] font-semibold text-navy">
        {label}
        {required ? (
          <span className="text-error" aria-hidden="true">
            {" "}*
          </span>
        ) : null}
        {optional ? <span className="font-normal text-slate"> (optional)</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[0.8125rem] text-slate">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[0.8125rem] font-medium text-error">
          <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4.5M8 11v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>
            <span className="sr-only">Error: </span>
            {error}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: ReactNode) {
  return [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
}

type Common = { id: string; label: ReactNode; error?: string; hint?: ReactNode; optional?: boolean; wrapperClassName?: string };

export function InputField({ id, label, error, hint, required, optional, wrapperClassName, className, ...rest }: Omit<ComponentProps<"input">, "id"> & Common) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} optional={optional} className={wrapperClassName}>
      <input
        id={id}
        name={rest.name ?? id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(inputClass, className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextareaField({ id, label, error, hint, required, optional, wrapperClassName, className, ...rest }: Omit<ComponentProps<"textarea">, "id"> & Common) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} optional={optional} className={wrapperClassName}>
      <textarea
        id={id}
        name={rest.name ?? id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(inputClass, "min-h-32 py-3 leading-relaxed", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  error,
  hint,
  required,
  optional,
  wrapperClassName,
  className,
  children,
  ...rest
}: Omit<ComponentProps<"select">, "id"> & Common & { children: ReactNode }) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} optional={optional} className={wrapperClassName}>
      <select
        id={id}
        name={rest.name ?? id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(inputClass, "appearance-none bg-[length:12px] bg-[right_0.9rem_center] bg-no-repeat pr-9", className)}
        style={{ backgroundImage: chevron }}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({ id, label, hint, className, ...rest }: Omit<ComponentProps<"input">, "id" | "type"> & { id: string; label: ReactNode; hint?: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        name={rest.name ?? id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-navy"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...rest}
      />
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm text-charcoal">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-[0.8125rem] text-slate">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
