import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useGetPerson } from "@workspace/api-client-react";
import { ArrowLeft, Calendar, Gift, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { DmErrorState } from "@/components/daymark";

export default function PersonDetailPage() {
  const [, params] = useRoute("/people/:id");
  const id = Number(params?.id);
  
  const { data: person, isLoading, isError, refetch } = useGetPerson(id || 0);

  if (isError) {
    return (
      <div className="min-h-[100dvh] bg-background p-5 pt-20 flex flex-col">
        <Link href="/people" className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center hover:bg-white transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <DmErrorState message="Couldn't load this person." onRetry={refetch} />
      </div>
    );
  }

  if (isLoading || !person) {
    return <div className="min-h-[100dvh] bg-background p-5 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
    </div>;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans relative overflow-x-hidden">
      {/* Header Back Button */}
      <Link href="/people" className="absolute top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center hover:bg-white transition-colors">
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </Link>

      {/* Hero Profile */}
      <div className="pt-24 px-5 pb-8 bg-white border-b border-border text-center flex flex-col items-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-bl-full -mr-20 -mt-20 z-0"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-tr-full -ml-10 -mb-10 z-0"></div>
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-[#EAE3FF] flex items-center justify-center overflow-hidden mb-4 relative z-10"
        >
          {person.avatarUrl ? (
            <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-primary">{person.name.charAt(0)}</span>
          )}
        </motion.div>
        
        <motion.h1 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold relative z-10"
        >
          {person.name}
        </motion.h1>
        
        {person.relationship && (
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-2 bg-[#EAE3FF] text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider relative z-10"
          >
            {person.relationship}
          </motion.div>
        )}
        
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-6 mt-6 relative z-10"
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">{person.memoriesCount || 0}</span>
            <span className="text-xs text-muted-foreground font-bold uppercase">Memories</span>
          </div>
          {person.nextImportantDate && (
            <>
              <div className="w-px h-8 bg-border"></div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-accent" /> {format(new Date(person.nextImportantDate), "MMM d")}
                </span>
                <span className="text-xs text-muted-foreground font-bold uppercase">Next Event</span>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Timeline */}
      <div className="p-5 pb-32">
        <h2 className="text-xl font-bold mb-6">Our Story</h2>
        
        {person.memories && person.memories.length > 0 ? (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border/50 before:to-transparent">
            {person.memories.map((memory, i) => (
              <motion.div 
                key={memory.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Timeline dot */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10" style={{ backgroundColor: memory.giftColor }}>
                  <Gift className="w-4 h-4 text-white" />
                </div>
                
                {/* Card */}
                <Link href={`/gifts/${memory.id}`} className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)]">
                  <div className="bg-white p-4 rounded-3xl border border-border shadow-sm hover:shadow-md transition-shadow active:scale-95">
                    <span className="text-xs font-bold text-muted-foreground mb-1 block">
                      {format(new Date(memory.date), "MMMM d, yyyy")}
                    </span>
                    <h3 className="font-bold text-lg leading-tight mb-2">{memory.title}</h3>
                    {memory.photoUrls && memory.photoUrls.length > 0 && (
                      <div className="h-24 w-full rounded-xl overflow-hidden mb-2">
                        <img src={memory.photoUrls[0]} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {memory.story && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{memory.story}</p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Gift className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">No shared memories</h3>
            <p className="text-sm text-muted-foreground">Wrap a memory with {person.name} and it will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
