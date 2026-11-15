import { ExternalLinkIcon } from "lucide-react";

/** The tickets / reference link of an event or open call, as a small button. */
export default function PostLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium transition hover:bg-muted"
    >
      {label}
      <ExternalLinkIcon className="size-3.5" aria-hidden />
    </a>
  );
}
