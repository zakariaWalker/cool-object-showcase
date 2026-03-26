import { useEffect, useRef } from "react";
import { Domain } from "@/engine/types";

interface SoundAuraProps {
  domain: Domain;
}

const DOMAIN_COLORS: Record<Domain, string> = {
  algebra: "#8B5CF6",
  geometry: "#10B981",
  statistics: "#F59E0B",
  probability: "#A855F7",
  functions: "#3B82F6",
};

export function SoundAura({ domain }: SoundAuraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const handleInit = (e: any) => {
      analyserRef.current = e.detail;
    };
    window.addEventListener("math-aura-init", handleInit);
    return () => window.removeEventListener("math-aura-init", handleInit);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame: number;
    const dataArray = new Uint8Array(128);

    const render = () => {
      const width = canvas.width = window.innerWidth;
      const height = canvas.height = window.innerHeight;

      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
      } else {
        dataArray.fill(0);
      }

      ctx.clearRect(0, 0, width, height);

      const color = DOMAIN_COLORS[domain] || DOMAIN_COLORS.algebra;

      // Draw Aura Glow
      const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
      const intensity = 0.1 + (avg / 255) * 0.4;

      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.8
      );
      gradient.addColorStop(0, `${color}${Math.floor(intensity * 100).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Render Domain-Specific Background
      if (domain === "geometry") {
        // Geometry: Angular pulses / geometric shadows
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.1;
        const sides = 3 + (avg % 5); // 3 to 7 sides based on audio intensity
        const radius = Math.min(width, height) * 0.3 * (1 + avg / 255);
        for (let i = 0; i <= sides; i++) {
          const angle = (i / sides) * Math.PI * 2;
          const x = width / 2 + Math.cos(angle) * radius;
          const y = height / 2 + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (domain === "statistics") {
        // Statistics: Data-point scatter
        ctx.fillStyle = color;
        for (let i = 0; i < 20; i++) {
            const freqVal = dataArray[i * 4] || 0;
            ctx.globalAlpha = freqVal / 255 * 0.3;
            const size = freqVal / 10;
            ctx.fillRect(
                (i / 20) * width, 
                height - (freqVal / 255) * height, 
                size, 
                size
            );
        }
      } else {
        // Algebra/Default: Coordinate grid behavior
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.05;
        const step = 40 + (avg / 10);
        for (let x = 0; x < width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Draw Waveform Ribbons
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2;

      const sliceWidth = width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 4 + height / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }
      ctx.stroke();

      // Mirror reflection
      ctx.beginPath();
      x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = height / 2 - (v * height) / 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [domain]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-10 opacity-40 blur-3xl"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
