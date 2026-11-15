import type { ReactNode } from "react";
import { ACCENT_FILL_CLASS } from "@/lib/styles";

// Placeholder for a missing picture, in the style of the homepage carousel:
// a gradient whose hue is derived from `seed`, so the same post always gets the same color.
export function placeholderBackground(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 75% 30%))`;
}

/**
 * A banner that looks like a card of the homepage carousel: the picture (or a generated color),
 * darkened towards the bottom, with a tag and the title on top of it.
 */
export default function EventBanner({
  title,
  tag,
  imageUrl,
  seed,
  className = "h-[clamp(11rem,26vw,17rem)]",
  children,
}: {
  title: string;
  /** Short label in the pill above the title, e.g. the date. */
  tag?: string;
  imageUrl?: string | null;
  /** Picks the placeholder color when there is no picture. */
  seed: string;
  /** Sets the height. */
  className?: string;
  /** Extra controls placed on top of the banner (e.g. the buttons of an editor). */
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl text-white ${className}`}
      style={{ background: placeholderBackground(seed) }}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- user upload, already resized
        <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-left sm:p-8">
        {tag && (
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${ACCENT_FILL_CLASS}`}>
            {tag}
          </span>
        )}
        <h3 className="mt-3 text-xl font-semibold tracking-tight break-words sm:text-2xl">{title}</h3>
      </div>
      {children}
    </div>
  );
}
