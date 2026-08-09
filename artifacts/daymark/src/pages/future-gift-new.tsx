import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useCreateFutureGift } from "@workspace/api-client-react";
import { ArrowLeft, Calendar, Image as ImageIcon, Lock, Camera } from "lucide-react";
import { addDays, format } from "date-fns";

const COLORS = [
  { id: "purple", hex: "#6847F5" },
  { id: "pink", hex: "#FF719D" },
  { id: "yellow", hex: "#FFC857" },
  { id: "blue", hex: "#75C8FF" },
  { id: "mint", hex: "#9CE2B1" },
];

export default function CreateFutureGiftPage() {
  const [, setLocation] = useLocation();
  const createFutureGift = useCreateFutureGift();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    recipientName: "",
    unlockDate: format(addDays(new Date(), 30), "yyyy-MM-dd"), // default 30 days from now
    message: "",
    giftColor: COLORS[0].hex,
    photoPreview: null as string | null,
    isPrivate: true,
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    createFutureGift.mutate({
      data: {
        title: formData.title || "A Future Gift",
        recipientName: formData.recipientName || "Myself",
        unlockDate: new Date(formData.unlockDate).toISOString(),
        message: formData.message,
        // (Assuming backend will eventually support color and private flags)
      }
    }, {
      onSuccess: () => {
        setLocation("/future-gifts");
      }
    });
  };

  return (
    <div className="min-h-[100dvh] max-w-[500px] mx-auto bg-background text-foreground font-sans flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between z-10 sticky top-0 bg-background/90 backdrop-blur-md">
        <Link href="/future-gifts">
          <button className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        </Link>
        <div className="font-bold text-xl">Seal a Gift</div>
        <div className="w-10 h-10"></div>
      </header>

      <div className="flex-1 px-5 pb-32 flex flex-col space-y-6 mt-4">
        <div className="bg-[#EAE3FF]/50 p-5 rounded-3xl flex items-start gap-4 mb-2">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex flex-shrink-0 items-center justify-center text-primary">
            <Lock className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-primary">
            This memory will be locked until the date you choose. Not even you will be able to open it early.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground ml-2">What is this gift?</label>
          <input 
            type="text" 
            value={formData.title}
            onChange={e => updateForm('title', e.target.value)}
            placeholder="E.g., Graduation Advice"
            className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-lg font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground ml-2">Who is it for?</label>
            <input 
              type="text" 
              value={formData.recipientName}
              onChange={e => updateForm('recipientName', e.target.value)}
              placeholder="Myself, Sarah..."
              className="w-full bg-white border border-border rounded-2xl px-4 py-3 text-base font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground ml-2">Unlock Date</label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="date" 
                value={formData.unlockDate}
                onChange={e => updateForm('unlockDate', e.target.value)}
                min={format(addDays(new Date(), 1), "yyyy-MM-dd")} // Must be at least tomorrow
                className="w-full bg-white border border-border rounded-2xl pl-11 pr-4 py-3 text-base font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground ml-2">The Message</label>
          <textarea 
            value={formData.message}
            onChange={e => updateForm('message', e.target.value)}
            placeholder="Write a letter to be read later..."
            className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-base font-medium shadow-sm h-40 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors bg-white active:scale-[0.98]"
        >
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*,video/*" 
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
                alert("Please select an image or video file.");
                return;
              }
              const url = URL.createObjectURL(file);
              updateForm("photoPreview", url);
            }}
          />
          {formData.photoPreview ? (
            <div className="w-full relative">
              <img src={formData.photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              <button 
                onClick={(e) => { e.stopPropagation(); updateForm("photoPreview", null); }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-xs font-bold"
              >✕</button>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center">
                <Camera className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-sm text-foreground">Add a photo</p>
              <p className="text-xs text-muted-foreground">Tap to select from your device</p>
            </>
          )}
        </div>
        
        <div>
          <span className="text-sm font-bold text-muted-foreground ml-2 mb-2 block">Gift Color</span>
          <div className="flex gap-3">
            {COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => updateForm('giftColor', c.hex)}
                className={`w-11 h-11 rounded-full shadow-sm border-2 transition-transform ${formData.giftColor === c.hex ? 'scale-110 border-foreground' : 'border-transparent'}`}
                style={{ backgroundColor: c.hex }}
                aria-label={`Color ${c.id}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white border border-border rounded-2xl shadow-sm">
          <div className="flex flex-col">
            <span className="font-bold text-sm">Private Gift</span>
            <span className="text-xs text-muted-foreground">Only you can open this memory</span>
          </div>
          <button 
            onClick={() => updateForm('isPrivate', !formData.isPrivate)}
            className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${formData.isPrivate ? 'bg-primary' : 'bg-muted'}`}
          >
             <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={!formData.title || !formData.recipientName || createFutureGift.isPending}
          className="w-full bg-primary text-primary-foreground py-4 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] mt-auto disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {createFutureGift.isPending ? "Sealing..." : (
            <>Seal Gift <Lock className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
