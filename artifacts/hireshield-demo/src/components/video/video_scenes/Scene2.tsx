import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 4500)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const fakeJobText = "URGENT HIRING: Remote Data Entry Clerk. No experience needed! Make $3000/week from home. Must pay $50 for background check equipment. Apply immediately!!!";

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-dark)]"
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[60vw] max-w-4xl relative">
        <motion.div 
          className="bg-[#0f1115] border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mock Browser/App Header */}
          <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-white/[0.02]">
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="ml-4 font-mono text-xs text-white/40">hireshield / analyze</div>
          </div>
          
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4 font-display">Paste Job Description</h2>
            <div className="relative">
              <div className="w-full h-48 bg-black/40 border border-white/10 rounded-lg p-4 font-mono text-sm text-white/80 leading-relaxed overflow-hidden">
                {phase >= 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.1 }}
                  >
                    {fakeJobText.split(' ').map((word, i) => (
                      <motion.span
                        key={i}
                        className="inline-block mr-2"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.1, delay: i * 0.05 }}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </motion.div>
                )}
                
                {/* Scanning overlay */}
                {phase >= 3 && (
                  <motion.div 
                    className="absolute inset-0 bg-accent/10 border-t-2 border-accent shadow-[0_0_15px_var(--color-accent)] pointer-events-none"
                    initial={{ top: '-10%', bottom: '100%' }}
                    animate={{ top: '100%', bottom: '-10%' }}
                    transition={{ duration: 1.5, ease: 'linear' }}
                  />
                )}
              </div>
              
              <motion.div 
                className="mt-6 flex justify-end"
                initial={{ opacity: 0 }}
                animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
              >
                <div className={`px-6 py-3 rounded-md font-bold text-sm transition-colors duration-300 ${phase >= 3 ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white text-black'}`}>
                  {phase >= 3 ? 'Analyzing Signals...' : 'Analyze Posting'}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
        
        {/* Floating code snippets background */}
        <motion.div 
          className="absolute -right-20 -top-20 text-[0.6rem] font-mono text-accent/30 opacity-50 whitespace-pre pointer-events-none"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        >
          {`def analyze_urgency(text):\n  score = 0\n  keywords = ['URGENT', 'IMMEDIATELY', 'NOW']\n  for k in keywords:\n    if k in text.upper(): score += 1\n  return score`}
        </motion.div>
      </div>
    </motion.div>
  );
}