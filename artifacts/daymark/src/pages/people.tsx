import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListPeople } from "@workspace/api-client-react";
import { Heart, Plus, Calendar, Image as ImageIcon } from "lucide-react";
import heartyLooking from "@assets/generated_images/hearty_looking.png";

export default function PeoplePage() {
  const { data: people, isLoading } = useListPeople();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 pb-32">
      <header className="pt-8 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">My People</h1>
          <p className="text-muted-foreground font-medium mt-1">The ones who make it special.</p>
        </div>
        <button className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-4 mt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : people && people.length > 0 ? (
        <div className="space-y-4 mt-6">
          {people.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-5 rounded-3xl border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full -mr-10 -mt-10 z-0"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-full border-2 border-white shadow-md bg-lavender flex items-center justify-center overflow-hidden flex-shrink-0">
                  {person.avatarUrl ? (
                    <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{person.name.charAt(0)}</span>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-xl leading-tight">{person.name}</h3>
                  {person.relationship && (
                    <p className="text-sm font-medium text-muted-foreground">{person.relationship}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    {person.memoriesCount || 0} memories
                  </div>
                  {person.birthday && (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                      <Calendar className="w-4 h-4 text-accent" />
                      Soon
                    </div>
                  )}
                </div>
                
                <Link href={`/people/${person.id}`}>
                  <button className="bg-lavender text-primary px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:scale-105 active:scale-95 transition-all">
                    Our Story
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <img src={heartyLooking} alt="Hearty" className="w-48 h-48 object-contain mb-6" />
          <h2 className="text-2xl font-serif font-bold mb-2">No people yet</h2>
          <p className="text-muted-foreground font-medium mb-8 max-w-xs">Memories are better when they're shared. Add the people you love.</p>
          <button className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/30 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Someone
          </button>
        </div>
      )}
    </div>
  );
}
