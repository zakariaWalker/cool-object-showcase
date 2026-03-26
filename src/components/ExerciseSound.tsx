import { useEffect, useRef, useState } from "react";
import { ParsedExercise } from "@/engine/exercise-parser";
import { Domain } from "@/engine/types";
import { Volume2, VolumeX, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExerciseSoundProps {
  exercise: ParsedExercise | null;
  isGap?: boolean;
}

// Fixed scales for domains
const SCALES = {
  algebra: [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00], // A Minor
  geometry: [196.00, 220, 246.94, 261.63, 293.66, 329.63, 369.99], // G Major/Lydian
  statistics: [110, 165, 220, 330, 440, 660], // Pentatonic/Deep
  functions: [130.81, 146.83, 164.81, 196.00, 220, 261.63], // C Major
  gap: [207.65, 233.08, 277.18, 311.13, 369.99, 415.30], // Dissonant / Locrian / Minor 2nds
};

export function ExerciseSound({ exercise, isGap }: ExerciseSoundProps) {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const synth = useRef<{
    osc: OscillatorNode;
    gain: GainNode;
    filter: BiquadFilterNode;
    analyser: AnalyserNode;
  } | null>(null);
  const sequencerRef = useRef<number | null>(null);
  const stepRef = useRef(0);

  // Initialize background synth
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtx.current = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    osc.type = "sine";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    osc.start();
    synth.current = { osc, gain, filter, analyser };

    // Dispatch event for visualizers
    window.dispatchEvent(new CustomEvent("math-aura-init", { detail: analyser }));

    return () => {
      osc.stop();
      ctx.close();
    };
  }, []);

  // Update Synth Parameters based on Exercise
  useEffect(() => {
    if (!synth.current || !audioCtx.current) return;
    const { gain, filter, osc } = synth.current;
    const ctx = audioCtx.current;
    const now = ctx.currentTime;

    if (isMuted || !exercise) {
      gain.gain.setTargetAtTime(0, now, 0.2);
      return;
    }

    // Unmute with fade-in
    gain.gain.setTargetAtTime(0.15, now, 0.5);

    // Domain specific timbre
    const { domain } = exercise.classification;
    if (domain === "geometry") {
        osc.type = "triangle";
        filter.Q.setTargetAtTime(12, now, 0.1);
        filter.frequency.setTargetAtTime(1200, now, 0.5);
    } else if (domain === "statistics") {
        osc.type = "sine"; // Deep sine
        filter.Q.setTargetAtTime(2, now, 0.1);
        filter.frequency.setTargetAtTime(400, now, 0.5);
    } else {
        osc.type = "sine";
        filter.Q.setTargetAtTime(5, now, 0.1);
        filter.frequency.setTargetAtTime(800, now, 0.5);
    }

  }, [exercise, isMuted]);

  // Melodic Stepper (Continuous Loop)
  useEffect(() => {
    if (!audioCtx.current || !synth.current || isMuted || !exercise) {
        if (sequencerRef.current) clearInterval(sequencerRef.current);
        return;
    }

    const ctx = audioCtx.current;
    const { osc } = synth.current;
    const domain = exercise.classification.domain;
    const scale = isGap ? SCALES.gap : (SCALES[domain] || SCALES.algebra);

    // Use exercise fingerprint to seed a "melody pattern"
    const pattern = exercise.id.split('').map(char => char.charCodeAt(0) % scale.length);

    const tick = () => {
        const now = ctx.currentTime;
        const noteIndex = pattern[stepRef.current % pattern.length];
        const freq = scale[noteIndex];
        
        // Glide to next note
        osc.frequency.exponentialRampToValueAtTime(freq, now + 0.1);
        
        stepRef.current++;
    };

    // Constant BPM (120)
    sequencerRef.current = window.setInterval(tick, 500);

    return () => {
        if (sequencerRef.current) clearInterval(sequencerRef.current);
    };
  }, [exercise, isMuted]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => {
            if (audioCtx.current?.state === 'suspended') audioCtx.current.resume();
            setIsMuted(!isMuted);
        }}
        className={`p-2.5 rounded-full transition-all border ${isMuted ? 'bg-white/5 border-white/10 text-muted-foreground' : 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]'}`}
        title={isMuted ? "Enable Melody" : "Mute Melody"}
      >
        <AnimatePresence mode="wait">
          {isMuted ? (
            <motion.div key="mute" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
              <VolumeX className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div key="unmute" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
              <Music className="w-4 h-4 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
      
      {!isMuted && exercise && (
        <div className="flex flex-col gap-1">
          <div className="text-[9px] uppercase tracking-tighter text-primary/60 font-bold">Sonic Stream</div>
          <div className="flex gap-1 items-end h-3">
            {[...Array(8)].map((_, i) => (
                <motion.div
                key={i}
                className="w-0.5 bg-primary/40 rounded-full"
                animate={{ height: [2, 12, 2] }}
                transition={{ 
                    duration: 0.4 + Math.random() * 0.4, 
                    repeat: Infinity, 
                    delay: i * 0.05 
                }}
                />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
