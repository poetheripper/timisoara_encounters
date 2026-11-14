import FeaturedCarousel from "@/components/FeaturedCarousel";
import TextType from "@/components/TextType/TextType";

export default function HomePage() {
  return (
    <main>
      <section className="flex min-h-[45dvh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          <TextType
            text={["Find your next encounter.", "Discover local artists, venues, and experiences."]}
            typingSpeed={50}
            pauseDuration={3000}
            deletingSpeed={75}
            deleteMode="backspace"
            typeEffect="none"
            mistakes={0.35}
            cursorStyle="underscore"
            cursorGlide={false}
            showCursor
            cursorColor="currentColor"
            prefixColor="currentColor"
            cursorBlinkDuration={0.5}
            cursorCharacter="_"
            prefix=""
            variableSpeed={{"min":55,"max":120}}
          />
        </h1>
      </div>
      </section>
      <FeaturedCarousel />
    </main>
  );
}
