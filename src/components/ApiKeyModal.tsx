import { useState } from "react";
import { setApiKey, getApiKey } from "@/engine/ai-layer";

interface Props { onClose: () => void; }

export function ApiKeyModal({ onClose }: Props) {
  const [key, setKey] = useState(getApiKey() || "");
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!key.trim()) return;
    setApiKey(key.trim());
    setSaved(true);
    setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-sm p-6 w-[440px] shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <div className="text-[11px] uppercase tracking-widest text-primary">NVIDIA NIM API</div>
        </div>
        <h2 className="text-[16px] font-semibold text-foreground mb-4">مفتاح NVIDIA NIM</h2>

        <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
          المحرك المحلي يعمل بدون مفتاح.<br />
          أضف مفتاح NIM للحصول على شرح AI بـ Llama 3.3 70B.
        </p>

        <a
          href="https://build.nvidia.com/settings/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-primary underline underline-offset-2 block mb-4"
        >
          الحصول على مفتاح من NVIDIA Build →
        </a>

        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && save()}
          placeholder="nvapi-..."
          className="w-full bg-background border border-border rounded-sm px-3 py-2 text-[13px] font-mono focus:outline-none focus:border-primary/50 mb-3"
          dir="ltr"
        />

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={!key.trim()}
            className="flex-1 py-2 bg-primary text-primary-foreground text-[13px] rounded-sm hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {saved ? "✓ تم الحفظ" : "حفظ المفتاح"}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-border text-[13px] text-muted-foreground rounded-sm hover:text-foreground transition-colors">
            تخطي
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground/50 mt-3 text-center">
          المفتاح محفوظ محلياً في المتصفح — لا يُرسل إلى أي خادم
        </p>
      </div>
    </div>
  );
}
