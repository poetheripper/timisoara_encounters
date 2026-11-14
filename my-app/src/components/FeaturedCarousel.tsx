"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "lucide-react";
import { EVENTS, eventBackground } from "@/lib/events";
import { ACCENT_BORDER_CLASS, ACCENT_FILL_CLASS } from "@/lib/styles";

// The slides are the shared events from src/lib/events.ts — edit them there.
const SLIDES = EVENTS;

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;
// The cat lies on the top edge of the centered card and leaves as soon as the carousel moves.
// It never comes back on the very next card: it returns once you are at least
// CAT_MIN_CARDS_AWAY cards further (after that card has settled), or after a long idle.
const CAT_MIN_CARDS_AWAY = 2;
const CAT_SETTLE_MS = 1200;
const CAT_IDLE_RETURN_MS = 12000;

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
  // Total number of card changes so far, and where/when the cat last lay down.
  const [moves, setMoves] = useState(0);
  const [cat, setCat] = useState({ slide: 0, atMove: 0 });



  useEffect(() => {
    if (cat.atMove === moves) return;
    const delay = moves - cat.atMove >= CAT_MIN_CARDS_AWAY ? CAT_SETTLE_MS : CAT_IDLE_RETURN_MS;
    const id = setTimeout(() => setCat({ slide: active, atMove: moves }), delay);
    return () => clearTimeout(id);
  }, [moves, active, cat.atMove]);

  // Total number of card changes so far, and where/when the cat last lay down.
  // Any card change after the cat lay down makes it leave.
  // (Later: this is the moment to play the falling-cat animation instead of just fading out.)
  const catVisible = cat.atMove === moves;

  const count = SLIDES.length;
  const go = (index: number) => {
    const next = ((index % count) + count) % count;
    if (next === active) return;
    setActive(next);
    setMoves((m) => m + 1);
  };
  
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % count);
      setMoves((m) => m + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [playing, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"

      className="w-full overflow-hidden py-30 pb-14 [--gap:1.25rem] [--w:min(38rem,72vw)] sm:[--gap:4rem]"

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
          className="relative ml-[50%] flex gap-(--gap) transition-transform duration-500 ease-out motion-reduce:transition-none"
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
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={!isActive}
                onClick={isActive ? undefined : () => go(i)}
                className={`relative h-[clamp(13rem,30vw,23rem)] w-(--w) shrink-0 overflow-hidden rounded-3xl text-white transition-opacity duration-500 ${
                  isActive ? "" : "cursor-pointer opacity-60"
                }`}
                style={{ background: eventBackground(slide) }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-left sm:p-8">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${ACCENT_FILL_CLASS}`}>
                    {slide.category}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-3xl">
                    {slide.title}
                  </h2>
                  <p className="mt-2 text-sm text-white/85 sm:text-base">{slide.subtitle}</p>
                </div>
              </div>
            );
          })}

          {/* Cat lying on the top edge of its card: the body rests on the edge, legs and tail hang over the card. */}
          <Image
            src="/laying_cat_blinking.png"
            alt=""
            aria-hidden
            width={712}
            height={336}
            unoptimized
            className={`pointer-events-none absolute top-0 z-10 h-auto w-[calc(var(--w)*0.45)] max-w-none -translate-y-[48%] transition-opacity dark:invert ${
              catVisible ? "opacity-100 duration-500" : "opacity-0 duration-150"
            }`}
            style={{
              left: `calc(${cat.slide} * (var(--w) + var(--gap)) + var(--w) * 0.5)`,
            }}
          />

          {/* Cat lying on the top edge of its card: the body rests on the edge, legs and tail hang over the card. */}
          <Image
            src="/laying_cat_blinking.png"
            alt=""
            aria-hidden
            width={712}
            height={336}
            unoptimized
            className={`pointer-events-none absolute top-0 z-10 h-auto w-[calc(var(--w)*0.45)] max-w-none -translate-y-[48%] transition-opacity ${
              catVisible ? "opacity-100 duration-500" : "opacity-0 duration-150"
            }`}
            style={{
              left: `calc(${cat.slide} * (var(--w) + var(--gap)) + var(--w) * 0.5)`,
            }}
          />
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
          className={`flex size-11 items-center justify-center rounded-full border-2 bg-muted text-foreground transition hover:bg-border ${ACCENT_BORDER_CLASS}`}
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
