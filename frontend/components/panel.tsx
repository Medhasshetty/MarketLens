import clsx from "clsx";

export function Panel({
  title,
  note,
  children,
  className,
  action,
}: {
  title?: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={clsx("rounded-2xl border border-line bg-surface p-4 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>}
            {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-2xl bg-raised", className)} />;
}
