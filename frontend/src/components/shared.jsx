import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Inbox } from "lucide-react";

const TONES = {
  open: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  quoted: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  accepted: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  awaiting_payment: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  scheduled: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  in_progress: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  completed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  refunded: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  failed: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  declined: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  suspended: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  published: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  processed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  ai_handling: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  with_agent: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
};

export function StatusBadge({ status }) {
  const label = (status || "").replaceAll("_", " ");
  return (
    <Badge data-testid={`status-${status || "unknown"}`} className={`${TONES[status] || "bg-secondary text-secondary-foreground"} border-0 capitalize font-medium hover:opacity-90`}>
      {label || "—"}
    </Badge>
  );
}

export function StatCard({ icon: Icon, label, value, hint, testid }) {
  return (
    <Card data-testid={testid} className="border bg-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="p-5 flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-muted-foreground">{label}</p>
          <p className="text-2xl sm:text-3xl font-display font-bold mt-1.5">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        {Icon && (
          <div className="h-10 w-10 shrink-0 rounded-none bg-primary text-primary-foreground flex items-center justify-center">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title = "Nothing here yet", hint, action, testid = "empty-state" }) {
  return (
    <div data-testid={testid} className="border border-dashed p-10 sm:p-14 flex flex-col items-start gap-3 bg-card">
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="font-display font-bold text-lg">{title}</p>
      {hint && <p className="text-sm text-muted-foreground max-w-md">{hint}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="text-sm sm:text-base text-muted-foreground mt-1">{sub}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
