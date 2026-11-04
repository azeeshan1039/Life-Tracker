import Link from "next/link";

export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-neutral-700">{description}</p>
      {href && action ? (
        <Link href={href} className="mt-3 inline-flex min-h-10 items-center rounded border border-neutral-300 px-3 py-2 text-sm">
          {action}
        </Link>
      ) : null}
    </div>
  );
}
