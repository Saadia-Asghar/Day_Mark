import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateMemory, useListPeople } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { 
  Camera, Video, Mic, Edit3, MapPin, Heart, 
  ArrowLeft, Gift, Calendar as CalendarIcon, Users, Check, Upload, X, AlertCircle, Loader2
} from "lucide-react";
import { DmPersonAvatar } from "@/components/daymark";
import { PhysicalGiftAnimation } from "@/components/scrapbook";

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

function GiftPreview({ color, ribbon, photoUrl, mood }: { color: string; ribbon: string; photoUrl?: string | null; mood?: string }) {
  const ribbonColors: Record<string, string> = {
    Classic: "#FFFFFF",
    Heart: "#FF719D", 
    Stars: "#FFC857",
    Minimal: "rgba(255,255,255,0.4)",
  };
  const rbColor = ribbonColors[ribbon] || "#FFFFFF";
  const moodEmojis: Record<string, string> = {
    Happy: "☀️", Emotional: "🥹", Peaceful: "🌿",
    Chaotic: "😂", Proud: "✨", Grateful: "💜", Nostalgic: "🌙",
  };
  const moodEmoji = mood ? moodEmojis[mood] : null;
  
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-44 h-52 mx-auto"
    >
      <motion.div 
        key={color+ribbon}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
      >
        {/* Box body */}
        <div className="absolute bottom-0 left-0 right-0 h-36 rounded-2xl overflow-hidden" style={{ backgroundColor: color, boxShadow: `0 8px 32px ${color}60` }}>
          {/* Photo peek inside box */}
          {photoUrl && (
            <div className="absolute inset-0 opacity-40">
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-5" style={{ backgroundColor: rbColor, opacity: 0.7 }} />
        </div>
        {/* Lid */}
        <div className="absolute top-8 left-[-4px] right-[-4px] h-12 rounded-2xl" style={{ backgroundColor: color, filter: "brightness(0.85)", boxShadow: `0 4px 12px ${color}40` }}>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-5" style={{ backgroundColor: rbColor, opacity: 0.7 }} />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: rbColor, opacity: 0.9 }} />
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: rbColor, opacity: 0.9 }} />
          </div>
        </div>
        {/* Photo peeking out of the top of the box */}
        {photoUrl && (
          <div className="absolute top-0 left-4 right-4 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md">
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {ribbon === "Heart" && <div className="absolute top-17 left-1/2 -translate-x-1/2 text-xs">❤️</div>}
        {ribbon === "Stars" && <div className="absolute top-17 left-1/2 -translate-x-1/2 text-xs">⭐</div>}
        {/* Mood sticker */}
        {moodEmoji && (
          <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-white shadow-md border-2 border-white flex items-center justify-center text-lg">
            {moodEmoji}
          </div>
        )}
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
    photoPreview: null as string | null,   // local blob URL for display only
    photoObjectPath: null as string | null, // persisted GCS path
  });

  const { uploadFile, isUploading, progress, error: uploadError } = useUpload({
    onSuccess: (response) => {
      setFormData(prev => ({
        ...prev,
        photoObjectPath: response.objectPath,
      }));
    },
  });

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      alert("Please select an image or video file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("File must be under 20 MB.");
      return;
    }
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, photoPreview: localUrl, photoObjectPath: null }));
    // Upload to GCS
    await uploadFile(file);
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photoPreview: null, photoObjectPath: null }));
  };

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
    const photoUrls = formData.photoObjectPath
      ? [`/api/storage${formData.photoObjectPath}`]
      : [];

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
        photoUrls,
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
    <div className="min-h-[100dvh] bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      {step < 7 && renderHeader()}

      <div className="flex-1 flex flex-col relative px-5 pb-safe overflow-y-auto hide-scrollbar">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Type – illustrated object picker */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col mt-2">
              <h2 className="text-2xl font-bold mb-2">What are we<br />keeping?</h2>
              <p className="text-sm text-muted-foreground font-medium mb-7">Choose how you want to capture this moment.</p>

              {/* Illustrated type objects */}
              <div className="grid grid-cols-2 gap-4">
                {/* Photo — Polaroid frame */}
                <motion.button
                  whileTap={{ scale: 0.94, y: -2 }}
                  onClick={() => { updateForm('type', 'photo'); setStep(2); }}
                  className="relative bg-white border border-sky-100 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm hover:border-sky-300 transition-colors"
                  style={{ transform: 'rotate(-1deg)' }}
                >
                  {/* Polaroid illustration */}
                  <div className="w-16 h-16 bg-sky-50 border-2 border-sky-200 rounded-lg flex items-center justify-center relative">
                    <Camera className="w-7 h-7 text-sky-500" />
                    {/* Polaroid bottom white strip */}
                    <div className="absolute -bottom-2 -left-1 -right-1 h-3 bg-white border border-sky-100 rounded-b-sm" />
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-sm text-foreground">Photo</p>
                    <p className="text-[11px] text-muted-foreground">An image says it all</p>
                  </div>
                  <div className="absolute top-2 right-2 text-lg">📷</div>
                </motion.button>

                {/* Story — folded notebook */}
                <motion.button
                  whileTap={{ scale: 0.94, y: -2 }}
                  onClick={() => { updateForm('type', 'story'); setStep(2); }}
                  className="relative bg-amber-50 border border-amber-100 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm hover:border-amber-300 transition-colors overflow-hidden"
                  style={{ transform: 'rotate(0.8deg)' }}
                >
                  {/* Folded corner */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-amber-200 rounded-bl-2xl" />
                  <div className="w-16 h-16 flex items-center justify-center relative">
                    <div className="w-12 h-14 bg-white border border-amber-200 rounded-sm shadow-sm flex items-center justify-center">
                      {/* Lines */}
                      <div className="space-y-1.5 px-1.5 w-full">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-0.5 bg-amber-200 rounded-full" />
                        ))}
                      </div>
                    </div>
                    <Edit3 className="absolute w-5 h-5 text-amber-600 -bottom-1 -right-1" />
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-sm text-foreground">Story</p>
                    <p className="text-[11px] text-muted-foreground">Write it in your words</p>
                  </div>
                </motion.button>

                {/* Voice — cassette / waveform */}
                <motion.button
                  whileTap={{ scale: 0.94, y: -2 }}
                  onClick={() => { updateForm('type', 'voice'); setStep(2); }}
                  className="relative bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm hover:border-emerald-300 transition-colors"
                  style={{ transform: 'rotate(-0.5deg)' }}
                >
                  <div className="w-16 h-16 flex items-center justify-center">
                    <div className="w-14 h-9 bg-white border-2 border-emerald-200 rounded-lg flex items-center justify-center px-1.5 gap-0.5 shadow-sm">
                      {[3, 5, 7, 4, 8, 5, 6, 3, 7, 4].map((h, i) => (
                        <div key={i} className="w-0.5 rounded-full bg-emerald-400" style={{ height: `${h * 3}px` }} />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-sm text-foreground">Voice</p>
                    <p className="text-[11px] text-muted-foreground">Say it out loud</p>
                  </div>
                  <div className="absolute top-2 right-2 text-lg">🎙</div>
                </motion.button>

                {/* Place — postcard */}
                <motion.button
                  whileTap={{ scale: 0.94, y: -2 }}
                  onClick={() => { updateForm('type', 'place'); setStep(2); }}
                  className="relative bg-rose-50 border border-rose-100 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm hover:border-rose-300 transition-colors"
                  style={{ transform: 'rotate(1deg)' }}
                >
                  <div className="w-16 h-16 flex items-center justify-center">
                    <div className="relative w-14 h-10 bg-white border-2 border-rose-200 rounded-sm shadow-sm flex items-center justify-center">
                      {/* Stamp corner */}
                      <div className="absolute top-1 right-1.5 w-3.5 h-4 border border-rose-300 rounded-[2px]" />
                      <MapPin className="w-5 h-5 text-rose-500" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-sm text-foreground">Place</p>
                    <p className="text-[11px] text-muted-foreground">Mark where you were</p>
                  </div>
                </motion.button>
              </div>

              {/* Video — bottom full-width */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { updateForm('type', 'video'); setStep(2); }}
                className="mt-4 w-full bg-purple-50 border border-purple-100 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm hover:border-purple-300 transition-colors"
              >
                <div className="w-12 h-12 bg-white border-2 border-purple-200 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                  <Video className="w-6 h-6 text-purple-500" />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-sm text-foreground">Video</p>
                  <p className="text-[11px] text-muted-foreground">Capture the moment in motion</p>
                </div>
                <span className="ml-auto text-xl">🎬</span>
              </motion.button>
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
                <div className="mb-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />

                  {formData.photoPreview ? (
                    <div className="relative rounded-[16px] overflow-hidden bg-muted">
                      <img
                        src={formData.photoPreview}
                        alt="Preview"
                        className="w-full h-52 object-cover"
                      />
                      {/* Upload progress overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                          <div className="w-32 h-1.5 bg-white/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-white text-xs font-bold">Uploading {progress}%</span>
                        </div>
                      )}
                      {/* Success badge */}
                      {formData.photoObjectPath && !isUploading && (
                        <div className="absolute top-2 left-2 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow">
                          <Check className="w-3 h-3" strokeWidth={3} /> Saved
                        </div>
                      )}
                      {/* Error badge */}
                      {uploadError && !isUploading && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow">
                          <AlertCircle className="w-3 h-3" /> Upload failed
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                        {/* Replace */}
                        <button
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                          title="Replace photo"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                        {/* Remove */}
                        <button
                          onClick={(e) => { e.stopPropagation(); removePhoto(); }}
                          className="w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                          title="Remove photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Retry button on error */}
                      {uploadError && !isUploading && (
                        <button
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-foreground px-4 py-1.5 rounded-full text-xs font-bold shadow flex items-center gap-1.5 hover:bg-muted"
                        >
                          <AlertCircle className="w-3 h-3 text-red-500" /> Retry upload
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-[16px] p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors bg-white active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="font-semibold text-sm text-foreground">Add a photo</p>
                      <p className="text-xs text-muted-foreground">Tap to select · JPEG, PNG, WebP · max 20 MB</p>
                    </div>
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
              {isUploading && (
                <p className="text-xs text-muted-foreground font-semibold text-center mb-2 flex items-center justify-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Upload in progress — please wait before continuing
                </p>
              )}
              <button 
                onClick={() => setStep(3)}
                disabled={!formData.title || isUploading}
                className="mt-auto w-full bg-primary text-white py-4 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(104,71,245,0.3)] disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all mb-4"
              >
                {isUploading ? "Uploading photo…" : "Next"}
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

          {/* STEP 6: Wrapping Customization */}
          {step === 6 && (
            <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col mt-0 pb-6">
              <h2 className="text-2xl font-bold mb-1 text-center">How should we<br />wrap this?</h2>
              <p className="text-sm text-muted-foreground text-center mb-5">Choose your gift's look and feel.</p>

              {/* Large gift preview */}
              <div className="flex justify-center mb-6 h-64 items-center relative">
                {/* Subtle glow behind gift */}
                <div
                  className="absolute inset-0 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ backgroundColor: formData.giftColor }}
                />
                <GiftPreview
                  color={formData.giftColor}
                  ribbon={formData.ribbon}
                  photoUrl={formData.photoPreview}
                  mood={formData.mood}
                />
              </div>

              <div className="space-y-5 bg-white/70 backdrop-blur-sm rounded-3xl p-5 border border-border/60 shadow-sm">
                {/* Box Color */}
                <div>
                  <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-3 block flex items-center gap-1.5">
                    🎁 Box Color
                  </span>
                  <div className="flex gap-3 items-center">
                    {COLORS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => updateForm('giftColor', c.hex)}
                        className="relative transition-transform active:scale-90"
                        aria-label={`Color ${c.id}`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full shadow-md transition-all ${formData.giftColor === c.hex ? 'scale-125' : 'scale-100 opacity-70 hover:opacity-100'}`}
                          style={{ backgroundColor: c.hex }}
                        />
                        {formData.giftColor === c.hex && (
                          <div className="absolute inset-0 rounded-full border-2 border-foreground/60 scale-125" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ribbon */}
                <div>
                  <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-3 block">
                    🎀 Ribbon
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: "Classic", emoji: "🤍" },
                      { id: "Heart",   emoji: "❤️" },
                      { id: "Stars",   emoji: "⭐" },
                      { id: "Minimal", emoji: "🕊️" },
                    ].map(r => (
                      <button
                        key={r.id}
                        onClick={() => updateForm('ribbon', r.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                          formData.ribbon === r.id
                            ? 'bg-foreground text-background border-foreground shadow-sm'
                            : 'bg-white text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        <span>{r.emoji}</span> {r.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag / Category */}
                <div>
                  <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-3 block">
                    🏷 Gift Tag
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => updateForm('category', cat.toLowerCase())}
                        className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                          formData.category === cat.toLowerCase()
                            ? 'bg-foreground text-background border-foreground shadow-sm'
                            : 'bg-white/80 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Wrap CTA */}
              <div className="mt-6">
                {createMemory.isError && (
                  <p className="text-xs text-red-500 font-semibold text-center mb-3">
                    Something went wrong. Please try again.
                  </p>
                )}
                <motion.button
                  onClick={handleWrap}
                  disabled={createMemory.isPending || isUploading}
                  whileTap={{ scale: 0.96 }}
                  className="w-full bg-primary text-white py-4 rounded-full text-lg font-bold shadow-[0_0_28px_rgba(104,71,245,0.35)] disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {createMemory.isPending
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Wrapping…</>
                    : isUploading
                    ? "Upload in progress…"
                    : "🎁 Wrap My Memory"}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 7: Success — physical gift animation */}
          {step === 7 && (
            <motion.div key="step7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
              <PhysicalGiftAnimation
                giftColor={formData.giftColor}
                ribbon={formData.ribbon}
                photoUrl={formData.photoPreview}
                successTitle="It's safe with us. 💜"
                successMessage="Another little piece of your life, beautifully kept."
                primaryHref="/gifts"
                primaryLabel="View Gifts"
                secondaryHref="/home"
                secondaryLabel="Back Home"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
