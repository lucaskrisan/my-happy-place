import { useEffect, useState, type ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";

/**
 * Presentation-only primitives shared across the Funnel Studio screens (/studio/*).
 * No state logic, no mutations, no data fetching — every prop here is either static content or a
 * callback the caller already owns. This exists so the redesign reuses one visual language instead of
 * re-deriving buttons/badges/cards per screen.
 */

// ---- Buttons ----------------------------------------------------------------
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none";
export function PrimaryButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${buttonBase} bg-studio-primary text-white px-4 py-2.5 hover:bg-studio-primary-strong ${className}`} />;
}
export function SecondaryButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${buttonBase} bg-studio-surface-2 text-studio-text px-4 py-2.5 hover:bg-white/[.1] ${className}`} />;
}
export function GhostButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`${buttonBase} text-studio-text-secondary px-3 py-2 hover:text-studio-text hover:bg-white/[.05] ${className}`} />;
}

// ---- Text hierarchy -----------------------------------------------------------
export function PageTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`text-3xl font-semibold tracking-tight text-studio-text text-balance ${className}`}>{children}</h1>;
}
export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold text-studio-text text-balance ${className}`}>{children}</h2>;
}
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[.18em] text-studio-primary ${className}`}>{children}</p>;
}
export function HelpText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-studio-text-muted ${className}`}>{children}</p>;
}

// ---- Surfaces -----------------------------------------------------------------
export function Card({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`rounded-2xl border border-studio-border bg-studio-surface ${className}`}>
      {children}
    </div>
  );
}

// ---- Status ---------------------------------------------------------------------
export type Tone = "neutral" | "primary" | "success" | "warning" | "error";
const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-white/[.06] text-studio-text-secondary",
  primary: "bg-studio-primary-soft text-studio-primary-strong",
  success: "bg-studio-success-soft text-studio-success",
  warning: "bg-studio-warning-soft text-studio-warning",
  error: "bg-studio-error-soft text-studio-error",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${TONE_CLASS[tone]}`}>{children}</span>;
}
export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  const color = { neutral: "bg-white/30", primary: "bg-studio-primary", success: "bg-studio-success", warning: "bg-studio-warning", error: "bg-studio-error" }[tone];
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

// ---- Breadcrumb -----------------------------------------------------------------
export function Breadcrumb({ items }: { items: (string | { label: string; onClick?: (() => void) | undefined })[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-studio-text-muted">
      {items.map((item, index) => {
        const label = typeof item === "string" ? item : item.label;
        const onClick = typeof item === "string" ? undefined : item.onClick;
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-studio-text-muted/50">/</span>}
            {onClick ? (
              <button onClick={onClick} className="hover:text-studio-text transition-colors">{label}</button>
            ) : (
              <span className={isLast ? "text-studio-text font-medium" : ""}>{label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ---- Stepper -----------------------------------------------------------------
export type StepState = "done" | "active" | "pending" | "error";
export function Stepper({ steps, current, onSelect }: { steps: { id: string; label: string; state: StepState }[]; current: string; onSelect: (id: string) => void }) {
  return (
    <ol className="flex flex-col gap-0.5">
      {steps.map((step, index) => {
        const isCurrent = step.id === current;
        return (
          <li key={step.id}>
            <button
              onClick={() => onSelect(step.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${isCurrent ? "bg-studio-primary-soft text-studio-text" : "text-studio-text-secondary hover:bg-white/[.04] hover:text-studio-text"}`}
            >
              <StepMarker state={step.state} current={isCurrent} />
              <span className={isCurrent ? "font-medium" : ""}>{step.label}</span>
            </button>
            {index < steps.length - 1 && <div className="ml-[15px] h-2 w-px bg-studio-border-strong" />}
          </li>
        );
      })}
    </ol>
  );
}
function StepMarker({ state, current }: { state: StepState; current: boolean }) {
  if (state === "done") return <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-studio-success text-[11px] font-bold text-[#0b1410]">✓</span>;
  if (state === "error") return <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-studio-error text-[11px] font-bold text-white">!</span>;
  if (current) return <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 border-studio-primary"><span className="h-1.5 w-1.5 rounded-full bg-studio-primary" /></span>;
  return <span className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-studio-border-strong" />;
}

// ---- Empty state -----------------------------------------------------------------
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-studio-border-strong bg-white/[.015] px-6 py-10 text-center">
      <p className="text-sm font-medium text-studio-text-secondary">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-studio-text-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// ---- Toast feedback -----------------------------------------------------------------
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 1800);
    return () => window.clearTimeout(timer);
  }, [message]);
  return { message, show: setMessage };
}
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="rounded-full border border-studio-border-strong bg-studio-surface-2 px-4 py-2 text-sm font-medium text-studio-text shadow-lg">{message}</div>
    </div>
  );
}

// ---- Progress -----------------------------------------------------------------
export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/[.08]">
      <div className="h-full rounded-full bg-studio-primary transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

// ---- Select -----------------------------------------------------------------
// Native <select> dropdown popups are drawn by the OS/browser, not the page — on some platforms they
// ignore color-scheme entirely and render in the browser's light default no matter what CSS says
// (confirmed: a real user's Windows Chrome still showed a white popup after that fix). This renders the
// whole dropdown itself with Radix (already a project dependency, used elsewhere in the app), so there is
// no native popup left to mis-render. Same value/onChange contract as a native select, so every call site
// swaps in directly. Empty string means "nothing selected" everywhere in this codebase, but Radix Select
// reserves "" as invalid — NONE_VALUE is the sentinel used only inside this component to represent it.
const NONE_VALUE = "__studio_select_none__";
export function StudioSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar",
  className = "",
  // Set false only when the value can never legitimately be empty (an action type, a trigger kind, …) —
  // matches a native <select> that never had an empty <option> to begin with, so there's nothing to clear.
  clearable = true,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  clearable?: boolean;
}) {
  return (
    <SelectPrimitive.Root value={value ? value : NONE_VALUE} onValueChange={(next) => onChange(next === NONE_VALUE ? "" : next)}>
      <SelectPrimitive.Trigger
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-studio-border bg-white/[.04] p-3 text-left text-sm text-studio-text focus:border-studio-primary/50 focus:outline-none transition-colors data-[placeholder]:text-studio-text-muted ${className}`}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 shrink-0 text-studio-text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 overflow-hidden rounded-lg border border-studio-border-strong bg-studio-surface-2 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <SelectPrimitive.Viewport className="p-1" style={{ width: "var(--radix-select-trigger-width)" }}>
            {clearable && (
              <SelectPrimitive.Item value={NONE_VALUE} className="relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-studio-text-muted outline-none data-[highlighted]:bg-studio-primary-soft data-[highlighted]:text-studio-text">
                <SelectPrimitive.ItemText>{placeholder}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            )}
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-studio-text outline-none data-[highlighted]:bg-studio-primary-soft data-[state=checked]:text-studio-primary-strong"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
