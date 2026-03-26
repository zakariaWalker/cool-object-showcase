import { useState } from "react";

interface ObjectCardProps {
  image: string;
  title: string;
  subtitle: string;
  index: number;
}

const ObjectCard = ({ image, title, subtitle, index }: ObjectCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative flex flex-col items-center animate-fade-up"
      style={{ animationDelay: `${index * 200}ms`, animationFillMode: "backwards" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-lg border border-border bg-card transition-all duration-500 hover:border-primary/40">
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ boxShadow: "inset 0 0 60px hsl(45 90% 55% / 0.08)" }}
        />
        <img
          src={image}
          alt={title}
          width={800}
          height={800}
          loading={index === 0 ? undefined : "lazy"}
          className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-105"
          style={{
            animation: `float ${6 + index * 0.5}s ease-in-out infinite`,
            animationDelay: `${index * 0.8}s`,
          }}
        />
      </div>
      <div className="mt-6 text-center">
        <h3 className="font-display text-xl font-semibold tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
};

export default ObjectCard;
