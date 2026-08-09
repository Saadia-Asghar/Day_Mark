import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateMemory, useListPeople } from "@workspace/api-client-react";
import { 
  Camera, Video, Mic, Edit3, MapPin, Heart, 
  ArrowLeft, Gift, Calendar as CalendarIcon, Users, Check
} from "lucide-react";
import markyCelebrating from "@assets/generated_images/marky_celebrating.png";
import { DmPersonAvatar } from "@/components/daymark";

const TYPES = [
  { id: "photo", label: "Photo", icon: Camera, emoji: "📷", color: "bg-sky-100 text-sky-700" },
  { id: "story", label: "Story", icon: Edit3, emoji: "✏️", color: "bg-amber-100 text-amber-700" },
  { id: "voice", label: "Voice", icon: Mic, emoji: "🎙", color: "bg-emerald-100 text-emerald-700" },
  { id: "video", label: "Video", icon: Video, emoji: "🎬", color: "bg-purple-100 text-purple-700" },
  { id: "place", label: "Place", icon: MapPin, emoji: "📍", color: "bg-rose-100 text-rose-700" },
];

const MOODS = [
  { id: "happy", emoji: "☀️", label: "Happy", color: "bg-amber-100 text-amber-700" },
  { id: "emotional", emoji: "🥹", label: "Emotional", color: "bg-rose-100 text-rose-700" },
  { id: "peaceful", emoji: "🌿", label: "Peaceful", color: "bg-emerald-100 text-emerald-700" },
  { id: "chaotic", emoji: "😂", label: "Chaotic", color: "bg-orange-100 text-orange-700" },
  { id: "proud", emoji: "✨", label: "Proud", color: "bg-violet-100 text-violet-700" },
  { id: "grateful", emoji: "💜", label: "Grateful", color: "bg-purple-100 text-purple-700" },
  { id: "nostalgic", emoji: "🌙", label: "Nostalgic", color: "bg-indigo-100 text-indigo-700" },
];

const COLORS = [
  { id: "purple", hex: "#6847F5", cat: "achievements" },
  { id: "pink", hex: "#FF719D", cat: "friends" },
  { id: "yellow", hex: "#FFC857", cat: "family" },
  { id: "blue", hex: "#75C8FF", cat: "travel" },
  { id: "mint", hex: "#9CE2B1", cat: "everyday" },
];

const CATEGORIES = ["Friends", "Family", "Travel", "College", "Achievements", "Everyday"];

const CONFETTI = [
  { x: "10%", y: "20%", color: "#6847F5" },
  { x: "25%", y: "45%", color: "#FF719D" },
  { x: "50%", y: "15%", color: "#FFC857" },
  { x: "75%", y: "35%", color: "#75C8FF" },
  { x: "90%", y: "25%", color: "#9CE2B1" },
  { x: "15%", y: "70%", color: "#FFB58A" },
  { x: "60%", y: "60%", color: "#6847F5" },
  { x: "80%", y: "75%", color: "#FF719D" },
];

function GiftPreview({ color, ribbon }: { color: string; ribbon: string }) {
  const ribbonColors: Record<string, string> = {
    Classic: "#FFFFFF",
    Heart: "#FF719D", 
    Stars: "#FFC857",
    Minimal: "rgba(255,255,255,0.4)",
  };
  const rbColor = ribbonColors[ribbon] || "#FFFFFF";
  
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-44 h-44 mx-auto"
    >
      <motion.div 
        key={color+ribbon}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
      >
        <div className="absolute bottom-0 left-0 right-0 h-36 rounded-2xl" style={{ backgroundColor: color, boxShadow: `0 8px 32px ${color}60` }}>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-5" style={{ backgroundColor: rbColor, opacity: 0.7 }} />
        </div>
        <div className="absolute top-0 left-[-4px] right-[-4px] h-12 rounded-2xl" style={{ backgroundColor: color, filter: "brightness(0.85)", boxShadow: `0 4px 12px ${color}40` }}>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-5" style={{ backgroundColor: rbColor, opacity: 0.7 }} />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: rbColor, opacity: 0.9 }} />
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: rbColor, opacity: 0.9 }} />
          </div>
        </div>
        {ribbon === "Heart" && <div className="absolute top-9 left-1/2 -translate-x-1/2 text-xs">❤️</div>}
        {ribbon === "Stars" && <div className="absolute top-9 left-1/2 -translate-x-1/2 text-xs">⭐</div>}
      </motion.div>
    </motion.div>
  );
}

export default function WrapMemoryPage() {
  const [, setLocation] = useLocation();
  const createMemory = useCreateMemory();
  const { data: people } = useListPeople();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: "photo",
    title: "",
    story: "",
    date: new Date().toISOString().split('T')[0],
    location: "",
    personIds: [] as number[],
    mood: "",
    giftColor: COLORS[0].hex,
    category: "everyday",
    ribbon: "Classic",
    photoPreview: null as string | null,
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const togglePerson = (id: number) => {
    setFormData(prev => {
      const isSelected = prev.personIds.includes(id);
      if (isSelected) {
        return { ...prev, personIds: prev.personIds.filter(pid => pid !== id) };
      }
      return { ...prev, personIds: [...prev.personIds, id] };
    });
  };

  const handleWrap = () => {
    createMemory.mutate({
      data: {
        title: formData.title || "A Little Gift",
        story: formData.story,
        date: new Date(formData.date).toISOString(),
        location: formData.location,
        category: formData.category as any,
        mood: formData.mood,
        giftColor: formData.giftColor,
        ribbon: formData.ribbon,
        personIds: formData.personIds.length > 0 ? formData.personIds : undefined,
      }
    }, {
      onSuccess: () => setStep(7)
    });
  };

  // Header Dots
  const renderDots = () => {
    return (
      <div className="flex flex-col items-center gap-1 mt-2">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-medium">Step {step} of 6</span>
      </div>
    );
  };

  const renderHeader = () => (
    <header className="px-5 pt-8 pb-4 relative z-10 flex flex-col">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : setLocation("/home")}
          className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-bold text-lg leading-tight">Wrap a Memory ✨</h1>
          <span className="text-xs text-muted-foreground font-medium">Let's keep this one.</span>
        </div>
        <div className="w-10 h-10" />
      </div>
      {renderDots()}
    </header>
  );

  return (
    <div className="min-h-[100dvh] max-w-[500px] mx-auto bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      {step < 7 && renderHeader()}

      <div className="flex-1 flex flex-col relative px-5 pb-safe overflow-y-auto hide-scrollbar">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Type */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col mt-4">
              <h2 className="text-2xl font-bold mb-6">What are we wrapping?</h2>
              <div className="flex flex-wrap gap-3">
                {TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => { updateForm('type', type.id); setStep(2); }}
                    className="flex items-center gap-2 px-5 py-3 rounded-full border bg-white shadow-sm transition-transform active:scale-95 hover:border-primary"
                  >
                    <span className="text-xl">{type.emoji}</span>
                    <span className="font-bold text-sm">{type.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Details */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col mt-4">
              <input 
                autoFocus
                type="text" 
                placeholder="Give it a title..."
                value={formData.title}
                onChange={e => updateForm('title', e.target.value)}
                className="w-full bg-white border border-border rounded-[16px] px-5 py-4 text-xl font-bold shadow-sm outline-none focus:border-primary mb-4"
              />
              <textarea 
                placeholder="Write a few lines..."
                value={formData.story}
                onChange={e => updateForm('story', e.target.value)}
                className="w-full bg-white border border-border rounded-[16px] px-5 py-4 text-base shadow-sm outline-none focus:border-primary mb-4 min-h-[100px] resize-none"
              />
              
              {(formData.type === "photo" || formData.type === "video") && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-[16px] p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors bg-white active:scale-[0.98] mb-4"
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
              )}

              <div className="relative mb-6">
                <CalendarIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={e => updateForm('date', e.target.value)}
                  className="w-full bg-white border border-border rounded-[16px] pl-12 pr-4 py-4 text-base font-bold shadow-sm outline-none focus:border-primary"
                />
              </div>
              <button 
                onClick={() => setStep(3)}
                disabled={!formData.title}
                className="mt-auto w-full bg-primary text-white py-4 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all mb-4"
              >
                Next
              </button>
            </motion.div>
          )}

          {/* STEP 3: People */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col mt-4">
              <h2 className="text-2xl font-bold mb-6">Who was there?</h2>
              <div className="flex flex-wrap gap-4">
                {people?.map(person => {
                  const isSelected = formData.personIds.includes(person.id);
                  return (
                    <button 
                      key={person.id}
                      onClick={() => togglePerson(person.id)}
                      className="relative focus:outline-none"
                    >
                      <DmPersonAvatar name={person.name} avatarUrl={person.avatarUrl} size={64} />
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-6 h-6 bg-primary rounded-full border-2 border-white flex items-center justify-center z-10 text-white">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                      )}
                      <div className={`absolute inset-0 rounded-full border-2 transition-colors z-0 top-0 left-1/2 -translate-x-1/2 w-[64px] h-[64px] ${isSelected ? 'border-primary' : 'border-transparent'}`} />
                    </button>
                  );
                })}
                <button 
                  onClick={() => alert("Coming soon — add people when wrapping a memory!")}
                  className="flex flex-col items-center gap-1.5 w-[72px]"
                >
                  <div className="w-[64px] h-[64px] rounded-full border-2 border-dashed border-border bg-white flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                    <span className="text-2xl">+</span>
                  </div>
                  <span className="text-xs font-bold text-center text-muted-foreground">New</span>
                </button>
              </div>
              <div className="mt-auto flex gap-3 mb-4">
                <button onClick={() => setStep(4)} className="flex-1 bg-white border border-border text-foreground py-4 rounded-full font-bold active:scale-95 transition-all">Skip</button>
                <button onClick={() => setStep(4)} className="flex-1 bg-primary text-white py-4 rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] active:scale-95 transition-all">Next</button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Location */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col mt-4">
              <h2 className="text-2xl font-bold mb-6">Where did this happen?</h2>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  autoFocus
                  type="text" 
                  value={formData.location}
                  onChange={e => updateForm('location', e.target.value)}
                  placeholder="Search a place..."
                  className="w-full bg-white border border-border rounded-[16px] pl-12 pr-4 py-4 text-base font-bold shadow-sm outline-none focus:border-primary"
                />
              </div>
              <div className="mt-auto flex gap-3 mb-4">
                <button onClick={() => setStep(5)} className="flex-1 bg-white border border-border text-foreground py-4 rounded-full font-bold active:scale-95 transition-all">Skip</button>
                <button onClick={() => setStep(5)} className="flex-1 bg-primary text-white py-4 rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] active:scale-95 transition-all">Next</button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Mood */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col mt-4">
              <h2 className="text-2xl font-bold mb-6">How did it feel?</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {MOODS.map(mood => {
                  const isSelected = formData.mood === mood.label;
                  return (
                    <button
                      key={mood.id}
                      onClick={() => updateForm('mood', mood.label)}
                      className={`flex flex-col items-center justify-center rounded-2xl px-5 py-4 min-w-[100px] border-2 transition-all active:scale-95 ${mood.color} ${isSelected ? 'border-foreground scale-105 shadow-md' : 'border-transparent shadow-sm'}`}
                    >
                      <span className="text-[32px] mb-2">{mood.emoji}</span>
                      <span className="text-sm font-bold">{mood.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto flex gap-3 mb-4">
                <button onClick={() => setStep(6)} className="flex-1 bg-white border border-border text-foreground py-4 rounded-full font-bold active:scale-95 transition-all">Skip</button>
                <button onClick={() => setStep(6)} className="flex-1 bg-primary text-white py-4 rounded-full font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] active:scale-95 transition-all">Next</button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Customization */}
          {step === 6 && (
            <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col mt-2 pb-6">
              <h2 className="text-2xl font-bold mb-4 text-center">How should we wrap this?</h2>
              
              <div className="flex justify-center mb-8 h-48 items-center">
                <GiftPreview color={formData.giftColor} ribbon={formData.ribbon} />
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1 mb-2 block">Box Color</span>
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

                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1 mb-2 block">Ribbon</span>
                  <div className="flex gap-2">
                    {["Classic", "Heart", "Stars", "Minimal"].map(r => (
                      <button
                        key={r}
                        onClick={() => updateForm('ribbon', r)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-colors border ${formData.ribbon === r ? 'bg-foreground text-background border-foreground' : 'bg-white text-muted-foreground border-border'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1 mb-2 block">Tag</span>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => updateForm('category', cat.toLowerCase())}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${formData.category === cat.toLowerCase() ? 'bg-foreground text-background border-foreground' : 'bg-white text-muted-foreground border-border'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={handleWrap}
                  disabled={createMemory.isPending}
                  className="w-full bg-primary text-white py-4 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {createMemory.isPending ? "Wrapping..." : "🎁 Wrap My Memory"}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 7: Success */}
          {step === 7 && (
            <motion.div key="step7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background z-50 flex flex-col items-center justify-center text-center px-5">
              
              {/* Confetti effect elements */}
              {CONFETTI.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ y: "-10vh", x: c.x, opacity: 1, scale: 0.5 }}
                  animate={{ 
                    y: "110vh", 
                    rotate: 360,
                  }}
                  transition={{ 
                    duration: 3, 
                    delay: i * 0.1,
                    ease: "easeOut" 
                  }}
                  className="absolute top-0 w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: c.color,
                    left: c.x
                  }}
                />
              ))}

              {/* Animated Gift Reveal */}
              <motion.div
                initial={{ scale: 0.5, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                className="mb-8"
              >
                <motion.div
                  animate={{ rotate: [-2, 2, -2] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <GiftPreview color={formData.giftColor} ribbon={formData.ribbon} />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <h2 className="text-3xl font-bold mb-2">It's safe with us. 💜</h2>
                <p className="text-muted-foreground font-medium mb-10 px-4">
                  Another little piece of your life, beautifully kept.
                </p>
                
                <div className="w-full space-y-3">
                  <Link href="/gifts" className="flex items-center justify-center w-full bg-primary text-white py-4 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] active:scale-95 transition-all">
                    View Gifts
                  </Link>
                  <Link href="/home" className="flex items-center justify-center w-full bg-white border border-border text-foreground py-4 rounded-full text-lg font-bold active:scale-95 transition-all">
                    Back Home
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
