import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateFutureGift } from "@workspace/api-client-react";
import { ArrowLeft, Calendar, Image as ImageIcon, Lock } from "lucide-react";
import { addDays, format } from "date-fns";

export default function CreateFutureGiftPage() {
  const [, setLocation] = useLocation();
  const createFutureGift = useCreateFutureGift();
  
  const [formData, setFormData] = useState({
    title: "",
    recipientName: "",
    unlockDate: format(addDays(new Date(), 30), "yyyy-MM-dd"), // default 30 days from now
    message: "",
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
      }
    }, {
      onSuccess: () => {
        setLocation("/future-gifts");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="px-6 pt-8 pb-4 flex items-center justify-between z-10 sticky top-0 bg-background/90 backdrop-blur-md">
        <Link href="/future-gifts">
          <button className="w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="font-serif font-bold text-xl">Seal a Gift</div>
        <div className="w-10 h-10"></div>
      </header>

      <div className="flex-1 px-6 pb-32 flex flex-col space-y-6 mt-4">
        <div className="bg-lavender/50 p-5 rounded-3xl flex items-start gap-4 mb-2">
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

        <button className="w-full bg-white border border-dashed border-border rounded-2xl py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted transition-colors active:scale-95">
          <div className="w-12 h-12 bg-background rounded-full shadow-sm flex items-center justify-center">
            <ImageIcon className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm">Add Photos or Video</span>
        </button>
        
        <button 
          onClick={handleSubmit}
          disabled={!formData.title || !formData.recipientName || createFutureGift.isPending}
          className="w-full bg-primary text-primary-foreground py-4 rounded-full text-lg font-bold shadow-lg shadow-primary/30 mt-auto disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {createFutureGift.isPending ? "Sealing..." : (
            <>Seal Gift <Lock className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
