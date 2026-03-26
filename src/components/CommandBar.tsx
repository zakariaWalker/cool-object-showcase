import { useState, useRef, useEffect } from "react";

interface CommandBarProps {
  onSubmit: (input: string, operation: "expand" | "simplify") => void;
  error: string | null;
}

export function CommandBar({ onSubmit, error }: CommandBarProps) {
  const [input, setInput] = useState("");
  const [operation, setOperation] = useState<"expand" | "simplify">("expand");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input.trim(), operation);
    }
  };

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-card">
      <div className="flex items-center min-h-[64px] px-4 gap-3">
        {/* Operation selector */}
        <div className="flex items-center gap-1 border border-border rounded-sm">
          {(["expand", "simplify"] as const).map((op) => (
            <button
              key={op}
              onClick={() => setOperation(op)}
              className={`px-3 py-1.5 text-[13px] font-mono transition-colors btn-press rounded-sm ${
                operation === op
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {op}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="3(x+2) + 5(3x-4)"
            className="w-full bg-background border border-border rounded-sm px-4 py-2 text-[18px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Execute */}
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-primary text-primary-foreground text-[13px] font-mono rounded-sm border border-primary hover:brightness-110 transition-all btn-press shadow-hard"
        >
          Execute ⏎
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 text-[13px] text-destructive bg-destructive/5 border-t border-destructive/20 font-mono">
          Error: {error}
        </div>
      )}
    </div>
  );
}
