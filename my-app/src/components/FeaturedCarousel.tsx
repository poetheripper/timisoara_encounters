"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "lucide-react";

type Slide = {
  tag: string;
  title: string;
  subtitle: string;
  /** Optional CSS color. When missing, a color is generated from the slide's position. */
  color?: string;
};

// ✏️ Edit the titles / subtitles / tags here. Add or remove entries freely.
const SLIDES: Slide[] = [
  { tag: "Featured", title: "Your title here", subtitle: "A short description of this encounter" },
  { tag: "Concert", title: "Second title", subtitle: "A short description of this encounter" },
  { tag: "Exhibition", title: "Third title", subtitle: "A short description of this encounter" },
  { tag: "Venue", title: "Fourth title", subtitle: "A short description of this encounter" },
  { tag: "Artist", title: "Fifth title", subtitle: "A short description of this encounter" },
  { tag: "Workshop", title: "Sixth title", subtitle: "A short description of this encounter" },
];

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

// Placeholder for real images: hues spread by the golden angle so neighbours never look alike.
// Derived from the index (not Math.random) so server and client render the same color.
function placeholderColor(index: number) {
  const hue = Math.round((index * 137.508 + 20) % 360);
  return `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 75% 30%))`;
}

export default function FeaturedCarousel() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = SLIDES.length;
  const go = (index: number) => setActive(((index % count) + count) % count);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setActive((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [playing, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="w-full overflow-hidden py-14 [--gap:1.25rem] [--w:min(38rem,72vw)] sm:[--gap:4rem]"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(active - 1);
        if (e.key === "ArrowRight") go(active + 1);
      }}
    >
      <div
        className="relative"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(active + (dx < 0 ? 1 : -1));
        }}
      >
        {/* The track starts at the horizontal center, then shifts left so the active card is centered. */}
        <div
          className="ml-[50%] flex gap-(--gap) transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={
            {
              transform: `translateX(calc(-1 * (var(--w) / 2 + ${active} * (var(--w) + var(--gap)))))`,
            } as CSSProperties
          }
        >
          {SLIDES.map((slide, i) => {
            const isActive = i === active;
            return (
              <div
                key={i}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={!isActive}
                onClick={isActive ? undefined : () => go(i)}
                className={`relative h-[clamp(13rem,30vw,23rem)] w-(--w) shrink-0 overflow-hidden rounded-3xl text-white transition-opacity duration-500 ${
                  isActive ? "" : "cursor-pointer opacity-60"
                }`}
                style={{ background: slide.color ?? placeholderColor(i) }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-left sm:p-8">
                  <span className="inline-block rounded-full bg-yellow-300 px-3 py-1 text-xs font-medium text-black">
                    {slide.tag}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-3xl">
                    {slide.title}
                  </h2>
                  <p className="mt-2 text-sm text-white/85 sm:text-base">{slide.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => go(active - 1)}
          className="absolute top-1/2 left-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black shadow backdrop-blur transition hover:bg-white sm:left-[8%]"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => go(active + 1)}
          className="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black shadow backdrop-blur transition hover:bg-white sm:right-[8%]"
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>

      <div className="mt-10 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          onClick={() => setPlaying((p) => !p)}
          className="flex size-11 items-center justify-center rounded-full border-2 border-yellow-400 bg-muted text-foreground transition hover:bg-border"
        >
          {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
        </button>

        <div className="flex h-10 items-center gap-1 rounded-full bg-muted px-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === active}
              onClick={() => go(i)}
              className="flex h-6 items-center px-1"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${
                  i === active ? "w-8 bg-foreground" : "w-2 bg-muted-foreground/50"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
