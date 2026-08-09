import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateMemory } from "@workspace/api-client-react";
import { 
  Camera, Video, Mic, Edit3, MapPin, Heart, 
  ArrowLeft, Gift, Check, Palette, Calendar as CalendarIcon, Users
} from "lucide-react";
import markyCelebrating from "@assets/generated_images/marky_celebrating.png";

const TYPES = [
  { id: "photo", label: "Photo", icon: Camera, color: "bg-blue-100 text-blue-600" },
  { id: "video", label: "Video", icon: Video, color: "bg-purple-100 text-purple-600" },
  { id: "voice", label: "Voice", icon: Mic, color: "bg-green-100 text-green-600" },
  { id: "story", label: "Story", icon: Edit3, color: "bg-yellow-100 text-yellow-600" },
  { id: "place", label: "Place", icon: MapPin, color: "bg-orange-100 text-orange-600" },
  { id: "person", label: "Person", icon: Heart, color: "bg-pink-100 text-pink-600" },
];

const COLORS = [
  { id: "everyday", name: "Mint", hex: "#9CE2B1", cat: "everyday" },
  { id: "travel", name: "Blue", hex: "#75C8FF", cat: "travel" },
  { id: "friends", name: "Pink", hex: "#FF6F9F", cat: "friends" },
  { id: "family", name: "Yellow", hex: "#FFC857", cat: "family" },
  { id: "achievements", name: "Purple", hex: "#6D4AFF", cat: "achievements" },
];

export default function WrapMemoryPage() {
  const [, setLocation] = useLocation();
  const createMemory = useCreateMemory();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    story: "",
    date: new Date().toISOString().split('T')[0],
    location: "",
    type: "photo",
    giftColor: COLORS[0].hex,
    category: COLORS[0].cat,
    ribbon: "standard",
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleWrap = () => {
    createMemory.mutate({
      data: {
        title: formData.title || "A Little Gift",
        story: formData.story,
        date: new Date(formData.date).toISOString(),
        location: formData.location,
        category: formData.category as any,
        giftColor: formData.giftColor,
        ribbon: formData.ribbon,
      }
    }, {
      onSuccess: () => {
        setStep(4);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {step < 4 && (
        <header className="px-6 pt-8 pb-4 flex items-center justify-between z-10">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : setLocation("/home")}
            className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-serif font-bold text-xl">Wrap a Memory ✨</div>
          <div className="w-10 h-10"></div> {/* Spacer for centering */}
        </header>
      )}

      <div className="flex-1 px-6 pb-32 flex flex-col relative">
        <AnimatePresence mode="wait">
          {/* STEP 1: TYPE */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-3xl font-bold font-serif mt-4 mb-8">What happened today?</h2>
              
              <div className="grid grid-cols-2 gap-4">
                {TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => { updateForm('type', type.id); setStep(2); }}
                    className="bg-white p-6 rounded-3xl border border-border shadow-sm flex flex-col items-center gap-4 hover:border-primary hover:shadow-md transition-all active:scale-95 group"
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${type.color} group-hover:scale-110 transition-transform`}>
                      <type.icon className="w-8 h-8" />
                    </div>
                    <span className="font-bold text-lg">{type.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-3xl font-bold font-serif mt-4 mb-6">The Details</h2>
              
              <div className="space-y-6 flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-2">Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={e => updateForm('title', e.target.value)}
                    placeholder="E.g., Coffee with Sarah"
                    className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-lg font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-2">Story (Optional)</label>
                  <textarea 
                    value={formData.story}
                    onChange={e => updateForm('story', e.target.value)}
                    placeholder="Write a few lines about this moment..."
                    className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-base font-medium shadow-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground ml-2">Date</label>
                    <div className="relative">
                      <CalendarIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="date" 
                        value={formData.date}
                        onChange={e => updateForm('date', e.target.value)}
                        className="w-full bg-white border border-border rounded-2xl pl-12 pr-4 py-3 text-base font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground ml-2">Location</label>
                    <div className="relative">
                      <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="text" 
                        value={formData.location}
                        onChange={e => updateForm('location', e.target.value)}
                        placeholder="Where?"
                        className="w-full bg-white border border-border rounded-2xl pl-12 pr-4 py-3 text-base font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setStep(3)}
                disabled={!formData.title}
                className="w-full bg-primary text-primary-foreground py-4 rounded-full text-lg font-bold shadow-lg shadow-primary/30 mt-6 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-95 transition-all"
              >
                Next Step
              </button>
            </motion.div>
          )}

          {/* STEP 3: WRAPPING */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col items-center"
            >
              <h2 className="text-3xl font-bold font-serif mt-4 text-center">How should we wrap this?</h2>
              <p className="text-muted-foreground font-medium text-center mt-2 mb-8">Choose a box color</p>
              
              <div 
                className="w-48 h-48 rounded-3xl shadow-xl border-4 border-white/50 mb-10 transition-colors duration-500 relative flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: formData.giftColor }}
              >
                {/* Ribbon graphic */}
                <div className="absolute w-full h-8 bg-white/40 top-1/2 -translate-y-1/2"></div>
                <div className="absolute w-8 h-full bg-white/40 left-1/2 -translate-x-1/2"></div>
                <Gift className="w-16 h-16 text-white absolute z-10" strokeWidth={1.5} />
              </div>
              
              <div className="flex gap-4 justify-center flex-wrap max-w-xs">
                {COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { updateForm('giftColor', c.hex); updateForm('category', c.cat); }}
                    className={`w-12 h-12 rounded-full border-4 transition-transform ${formData.giftColor === c.hex ? "scale-110 border-foreground shadow-md" : "border-transparent shadow-sm hover:scale-105"}`}
                    style={{ backgroundColor: c.hex }}
                    aria-label={`Select ${c.name}`}
                  />
                ))}
              </div>
              
              <div className="mt-auto pt-10 w-full">
                <button 
                  onClick={handleWrap}
                  disabled={createMemory.isPending}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-full text-lg font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {createMemory.isPending ? "Wrapping..." : (
                    <>Wrap It <Gift className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center -mt-10"
            >
              <div className="relative w-64 h-64 mb-8">
                <img src={markyCelebrating} alt="Marky celebrating" className="w-full h-full object-contain" />
              </div>
              
              <h2 className="text-4xl font-bold font-serif mb-3">Wrapped!</h2>
              <p className="text-lg text-muted-foreground font-medium mb-10 max-w-xs">
                Another little piece of life, safely kept.
              </p>
              
              <div className="space-y-4 w-full">
                <Link href="/gifts" className="w-full block bg-primary text-primary-foreground py-4 rounded-full text-lg font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
                  See My Gifts
                </Link>
                <button onClick={() => { setStep(1); setFormData({...formData, title: "", story: ""}); }} className="w-full bg-white border-2 border-border text-foreground py-4 rounded-full text-lg font-bold shadow-sm hover:bg-muted active:scale-95 transition-all">
                  Wrap Another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
