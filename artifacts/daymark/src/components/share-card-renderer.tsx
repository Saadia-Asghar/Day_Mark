/**
 * Instagram / social share card renderer.
 *
 * Renders a beautiful Daymark-branded card to an offscreen canvas
 * and provides download + Web Share API fallback.
 *
 * Templates: LITTLE_GIFT | POLAROID | ON_THIS_DAY
 * Formats:   STORY (9:16) | PORTRAIT (4:5) | SQUARE (1:1)
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Loader2 } from "lucide-react";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

export type CardTemplate = "gift" | "polaroid" | "on_this_day";
export type CardFormat = "story" | "portrait" | "square";

interface MemoryData {
  title: string;
  date: string;
  story?: string | null;
  category?: string;
  giftColor?: string;
  photoUrls?: string[];
}

interface ShareCardRendererProps {
  memory: MemoryData;
  onClose: () => void;
}

// ── Dimensions ────────────────────────────────────────────────────────────

const DIMS: Record<CardFormat, { w: number; h: number; label: string }> = {
  story:    { w: 1080, h: 1920, label: "Story 9:16" },
  portrait: { w: 1080, h: 1350, label: "Portrait 4:5" },
  square:   { w: 1080, h: 1080, label: "Square 1:1" },
};

// ── Canvas renderer ───────────────────────────────────────────────────────

async function renderCard(
  memory: MemoryData,
  template: CardTemplate,
  cardFmt: CardFormat,
  canvas: HTMLCanvasElement,
): Promise<void> {
  const { w, h } = DIMS[cardFmt];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // ── Background ──────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#FFF9F5");
  bg.addColorStop(1, "#EAE3FF");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle dot pattern
  ctx.fillStyle = "rgba(104,71,245,0.04)";
  for (let x = 40; x < w; x += 80) {
    for (let y = 40; y < h; y += 80) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const pad = w * 0.08;

  // ── Photo (if available) ────────────────────────────────────────────────
  const photoUrl = memory.photoUrls?.[0];
  let photoH = 0;

  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      const photoW = w - pad * 2;
      photoH = cardFmt === "story" ? h * 0.42 : h * 0.45;
      const photoY = template === "polaroid" ? pad * 1.8 : pad;

      // White polaroid frame
      if (template === "polaroid") {
        const frameW = photoW + pad * 0.8;
        const frameH = photoH + pad * 1.6;
        const frameX = (w - frameW) / 2;
        const frameY = photoY - pad * 0.4;
        roundRect(ctx, frameX, frameY, frameW, frameH, 8);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.shadowColor = "rgba(0,0,0,0.12)";
        ctx.shadowBlur = 40;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.save();
      const imgX = (w - photoW) / 2;
      if (template !== "polaroid") {
        roundRect(ctx, imgX, photoY, photoW, photoH, 20);
        ctx.clip();
      }
      // Cover-fit
      const scale = Math.max(photoW / img.width, photoH / img.height);
      const dx = imgX + (photoW - img.width * scale) / 2;
      const dy = photoY + (photoH - img.height * scale) / 2;
      ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);
      ctx.restore();

      photoH = photoH + (template === "polaroid" ? pad * 2.4 : 0);
    } catch {
      photoH = 0;
    }
  }

  // ── Tape strip (decorative) ─────────────────────────────────────────────
  if (template === "polaroid" && photoH > 0) {
    ctx.save();
    ctx.translate(w / 2, pad * 0.8);
    ctx.rotate(-0.03);
    ctx.fillStyle = "rgba(234,227,255,0.7)";
    roundRect(ctx, -60, -14, 120, 28, 4);
    ctx.fill();
    ctx.restore();
  }

  // ── Content area ────────────────────────────────────────────────────────
  const contentY = (photoH > 0 ? photoH + pad : pad * 1.5) + pad;

  // Category pill
  if (memory.category) {
    ctx.font = `bold ${w * 0.028}px -apple-system, sans-serif`;
    ctx.fillStyle = "#6847F5";
    ctx.textAlign = "left";
    ctx.fillText(memory.category.toUpperCase(), pad, contentY);
  }

  // Title
  ctx.font = `900 ${w * 0.072}px -apple-system, sans-serif`;
  ctx.fillStyle = "#1A0D2B";
  ctx.textAlign = "left";
  wrapText(ctx, memory.title, pad, contentY + w * 0.09, w - pad * 2, w * 0.082);

  // Date
  const dateStr = format(new Date(memory.date), "MMMM d, yyyy");
  ctx.font = `600 ${w * 0.032}px -apple-system, sans-serif`;
  ctx.fillStyle = "#8B7BA0";
  const titleLines = Math.ceil(memory.title.length / 22);
  const afterTitle = contentY + w * 0.09 + titleLines * w * 0.085 + w * 0.04;
  ctx.fillText(dateStr, pad, afterTitle);

  // Story quote (if space allows)
  if (memory.story && template !== "gift") {
    const maxChars = cardFmt === "story" ? 140 : 90;
    const excerpt = memory.story.length > maxChars ? memory.story.slice(0, maxChars) + "…" : memory.story;
    ctx.font = `500 italic ${w * 0.034}px Georgia, serif`;
    ctx.fillStyle = "#5A4870";

    // Dashed line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "rgba(104,71,245,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, afterTitle + w * 0.06);
    ctx.lineTo(w - pad, afterTitle + w * 0.06);
    ctx.stroke();
    ctx.setLineDash([]);

    wrapText(ctx, `"${excerpt}"`, pad, afterTitle + w * 0.1, w - pad * 2, w * 0.042);
  }

  // ── Daymark branding (bottom) ────────────────────────────────────────────
  const brandY = h - pad * 1.4;
  // Logo circle
  ctx.beginPath();
  ctx.arc(pad + 24, brandY, 24, 0, Math.PI * 2);
  ctx.fillStyle = "#6847F5";
  ctx.fill();
  ctx.font = `900 ${w * 0.038}px -apple-system, sans-serif`;
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("D", pad + 24, brandY + 10);

  ctx.font = `800 ${w * 0.036}px -apple-system, sans-serif`;
  ctx.fillStyle = "#1A0D2B";
  ctx.textAlign = "left";
  ctx.fillText("Daymark", pad + 58, brandY + 10);

  ctx.font = `500 ${w * 0.026}px -apple-system, sans-serif`;
  ctx.fillStyle = "#8B7BA0";
  ctx.fillText("Keep the little gifts life gives you.", pad + 58, brandY + 10 + w * 0.038);

  // Privacy note
  ctx.font = `500 ${w * 0.022}px -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(139,123,160,0.6)";
  ctx.textAlign = "right";
  ctx.fillText("Memory shared privately", w - pad, brandY + 10);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
    setTimeout(() => reject(new Error("Image load timeout")), 8000);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}

// ── Component ────────────────────────────────────────────────────────────

const TEMPLATES: { id: CardTemplate; color: string; label: string; desc: string }[] = [
  { id: "gift",       color: "#6847F5", label: "Little Gift",    desc: "Clean and warm" },
  { id: "polaroid",   color: "#1A0D2B", label: "Polaroid",       desc: "Film photo feel" },
  { id: "on_this_day",color: "#F59E0B", label: "On This Day",    desc: "Anniversary style" },
];

const FORMATS: { id: CardFormat; label: string }[] = [
  { id: "story", label: "Story" },
  { id: "portrait", label: "Portrait" },
  { id: "square", label: "Square" },
];

export function ShareCardRenderer({ memory, onClose }: ShareCardRendererProps) {
  const [template, setTemplate] = useState<CardTemplate>("polaroid");
  const [cardFormat, setCardFormat] = useState<CardFormat>("square");
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleRender = useCallback(async () => {
    if (!canvasRef.current) return;
    setRendering(true);
    try {
      await renderCard(memory, template, cardFormat, canvasRef.current);
      // Download
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "daymark-memory.png", { type: "image/png" });
        // Try Web Share API
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: memory.title,
              text: `${memory.title} — shared from Daymark`,
            });
          } catch { /* cancelled */ }
        } else {
          // Download fallback
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "daymark-memory.png";
          a.click();
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch (e) {
      console.error("Card render failed", e);
    }
    setRendering(false);
  }, [memory, template, cardFormat]);

  return (
    <>
      <motion.div
        key="card-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="card-sheet"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#FFF9F5] rounded-t-[28px] shadow-2xl z-50 max-h-[90dvh] flex flex-col"
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
          <div>
            <h2 className="font-extrabold text-base">Create Share Card</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Instagram, WhatsApp, anywhere</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
          {/* Template */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Template</p>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-2xl p-3 border text-center transition-all ${template === t.id ? "bg-[#EAE3FF] border-primary/40" : "bg-white border-border"}`}
                >
                  <div className="w-6 h-6 rounded-full mb-1.5 mx-auto" style={{ backgroundColor: t.color }} />
                  <p className="text-xs font-bold leading-tight">{t.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Format</p>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCardFormat(f.id)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${cardFormat === f.id ? "bg-primary text-white border-primary" : "bg-white border-border"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy note */}
          <div className="bg-[#EAE3FF]/50 rounded-2xl p-3 text-xs font-medium text-primary leading-relaxed">
            People OFF · Location OFF · Full story OFF by default
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRender}
              disabled={rendering}
              className="flex-1 h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(104,71,245,0.25)] disabled:opacity-50 transition-all"
            >
              {rendering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Share2 className="w-4 h-4" /> Share</>
              )}
            </button>
            <button
              onClick={async () => {
                if (!canvasRef.current) { await handleRender(); return; }
                canvasRef.current.toBlob((blob) => {
                  if (!blob) return;
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "daymark-memory.png";
                  a.click();
                  URL.revokeObjectURL(url);
                }, "image/png");
              }}
              disabled={rendering}
              className="h-12 w-12 bg-white border border-border rounded-xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </>
  );
}
