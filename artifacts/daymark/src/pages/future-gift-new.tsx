import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useCreateFutureGift } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import {
  ArrowLeft, Calendar, Lock, Camera, Upload, X,
  AlertCircle, Check, Loader2, Gift,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { PhysicalGiftAnimation } from "@/components/scrapbook";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = [
  { id: "purple", hex: "#6847F5" },
  { id: "pink",   hex: "#FF719D" },
  { id: "yellow", hex: "#FFC857" },
  { id: "blue",   hex: "#75C8FF" },
  { id: "mint",   hex: "#9CE2B1" },
];

const RIBBONS = [
  { id: "Classic" },
  { id: "Heart" },
  { id: "Stars" },
  { id: "Minimal" },
];

export default function CreateFutureGiftPage() {
  const [, setLocation] = useLocation();
  const createFutureGift = useCreateFutureGift();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    recipientName: "",
    unlockDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    message: "",
    giftColor: COLORS[0].hex,
    ribbon: "Classic",
    photoPreview: null as string | null,
    photoObjectPath: null as string | null,
    isPrivate: true,
  });

  const { uploadFile, isUploading, progress, error: uploadError } = useUpload({
    onSuccess: (response) => {
      setForm((prev) => ({ ...prev, photoObjectPath: response.objectPath }));
    },
  });

  const update = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
    if (file.size > 20 * 1024 * 1024) return;
    const localUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, photoPreview: localUrl, photoObjectPath: null }));
    await uploadFile(file);
  };

  const handleSubmit = () => {
    createFutureGift.mutate(
      {
        data: {
          title: form.title || "A Future Gift",
          recipientName: form.recipientName || "Myself",
          unlockDate: new Date(form.unlockDate).toISOString(),
          message: form.message,
        },
      },
      {
        onSuccess: () => setSuccess(true),
      }
    );
  };

  const recipient = form.recipientName || "them";
  const unlockLabel = format(new Date(form.unlockDate), "MMMM d, yyyy");

  // ── Success animation ─────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] relative overflow-hidden">
        <PhysicalGiftAnimation
          giftColor={form.giftColor}
          ribbon={form.ribbon}
          photoUrl={form.photoPreview}
          successTitle="Sealed with care."
          successMessage={`It will be ready for ${recipient} on ${unlockLabel}.`}
          primaryHref="/future-gifts"
          primaryLabel="View Future Gifts"
          secondaryHref="/home"
          secondaryLabel="Back Home"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFF9F5] text-foreground font-sans flex flex-col">

      {/* Header */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-[#FFF9F5]/90 backdrop-blur-md z-10 border-b border-border/30">
        <Link href="/future-gifts">
          <button className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center active:scale-95">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        </Link>
        <div className="font-bold text-lg">Seal a Gift</div>
        <div className="w-10 h-10" />
      </header>

      <div className="flex-1 px-5 pb-32 space-y-5 mt-5">

        {/* Info banner */}
        <div className="bg-[#EAE3FF]/60 p-4 rounded-2xl flex items-start gap-3">
          <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-primary">
            This gift will stay sealed until the date you choose.
          </p>
        </div>

        {/* Who is this for? */}
        <div>
          <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
            Who is this for?
          </label>
          <input
            type="text"
            value={form.recipientName}
            onChange={(e) => update("recipientName", e.target.value)}
            placeholder="Myself, Sarah, Mum…"
            className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* What is the gift? */}
        <div>
          <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
            What is this gift?
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Graduation Advice, A Letter to Future Me…"
            className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* The Message */}
        <div>
          <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
            The Message
          </label>
          <textarea
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
            placeholder="Write a letter to be opened later…"
            className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-base font-medium shadow-sm h-36 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Choose when it opens — calendar card */}
        <div>
          <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
            When should it open?
          </label>
          <div className="bg-white border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm text-foreground">{unlockLabel}</span>
            </div>
            <input
              type="date"
              value={form.unlockDate}
              onChange={(e) => update("unlockDate", e.target.value)}
              min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
              className="w-full bg-[#FFF9F5] border border-border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
            Photo (optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          {form.photoPreview ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={form.photoPreview} alt="Preview" className="w-full h-44 object-cover" />
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                  <div className="w-28 h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-white text-xs font-bold">Uploading {progress}%</span>
                </div>
              )}
              {form.photoObjectPath && !isUploading && (
                <div className="absolute top-2 left-2 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-3 h-3" strokeWidth={3} /> Saved
                </div>
              )}
              {uploadError && !isUploading && (
                <div className="absolute top-2 left-2 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Upload failed
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setForm((p) => ({ ...p, photoPreview: null, photoObjectPath: null }))}
                  className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors bg-white active:scale-[0.98]"
            >
              <Camera className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-muted-foreground">Add a photo</p>
            </div>
          )}
        </div>

        {/* Seal the gift — customisation */}
        <div>
          <label className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-3 ml-1">
            Seal the Gift
          </label>
          <div className="bg-white border border-border rounded-3xl p-5 shadow-sm space-y-5">
            {/* Box color */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">Box Color</p>
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => update("giftColor", c.hex)}
                    className="relative transition-transform active:scale-90"
                    aria-label={c.id}
                  >
                    <div
                      className={`w-10 h-10 rounded-full shadow-md transition-all ${form.giftColor === c.hex ? "scale-125" : "scale-100 opacity-70"}`}
                      style={{ backgroundColor: c.hex }}
                    />
                    {form.giftColor === c.hex && (
                      <div className="absolute inset-0 rounded-full border-2 border-foreground/50 scale-125" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Ribbon */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">Ribbon</p>
              <div className="flex gap-2 flex-wrap">
                {RIBBONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => update("ribbon", r.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
                      form.ribbon === r.id
                        ? "bg-foreground text-background border-foreground"
                        : "bg-white text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {r.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Private Gift</p>
                <p className="text-xs text-muted-foreground">Only you can open this</p>
              </div>
              <button
                onClick={() => update("isPrivate", !form.isPrivate)}
                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${form.isPrivate ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.isPrivate ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        {createFutureGift.isError && (
          <p className="text-xs text-red-500 font-semibold text-center">Something went wrong. Please try again.</p>
        )}
        <motion.button
          onClick={handleSubmit}
          disabled={!form.title || !form.recipientName || createFutureGift.isPending || isUploading}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-primary text-white py-4 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {createFutureGift.isPending ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sealing…</>
          ) : isUploading ? (
            "Uploading…"
          ) : (
            <><Lock className="w-5 h-5" /> Seal This Gift</>
          )}
        </motion.button>
      </div>
    </div>
  );
}
