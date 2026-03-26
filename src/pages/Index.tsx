import objectCrystal from "@/assets/object-crystal.jpg";
import objectSphere from "@/assets/object-sphere.jpg";
import objectTorus from "@/assets/object-torus.jpg";
import objectCube from "@/assets/object-cube.jpg";
import ObjectCard from "@/components/ObjectCard";

const objects = [
  { image: objectCrystal, title: "Prismatic Crystal", subtitle: "Light refracted into infinity" },
  { image: objectSphere, title: "Liquid Chrome", subtitle: "Mercury captured in stillness" },
  { image: objectTorus, title: "Eternal Knot", subtitle: "Gold & obsidian intertwined" },
  { image: objectCube, title: "Neon Core", subtitle: "Energy contained in geometry" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="flex flex-col items-center justify-center px-6 pt-32 pb-20">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary animate-fade-up">
          Digital Gallery
        </p>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl lg:text-8xl text-center animate-fade-up text-glow-gold"
            style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
          Cool Objects
        </h1>
        <p className="mt-6 max-w-md text-center text-muted-foreground animate-fade-up"
           style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
          A curated collection of impossible forms, rendered in light and shadow.
        </p>
        <div className="mt-8 h-px w-24 bg-primary/30 animate-fade-up" style={{ animationDelay: "300ms", animationFillMode: "backwards" }} />
      </header>

      {/* Objects Grid */}
      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {objects.map((obj, i) => (
            <ObjectCard key={obj.title} {...obj} index={i} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center">
        <p className="text-xs text-muted-foreground tracking-widest uppercase">
          Rendered with precision
        </p>
      </footer>
    </div>
  );
};

export default Index;
