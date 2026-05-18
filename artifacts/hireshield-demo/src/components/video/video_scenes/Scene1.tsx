import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center">
        <motion.div 
          className="overflow-hidden mb-6 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-sm tracking-widest text-white/80 uppercase">SYSTEM ALERT</span>
          </div>
        </motion.div>

        <motion.h1 
          className="text-[6vw] font-bold tracking-tight text-white leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <motion.span
            className="block text-white/40"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            Spot the scam
          </motion.span>
          <motion.span
            className="block text-accent"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          >
            before you apply.
          </motion.span>
        </motion.h1>

        <motion.p
          className="mt-8 text-[1.5vw] text-white/60 font-body max-w-[60%] mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          HireShield: Open-source job-posting fraud detection.
        </motion.p>
      </div>
      
      {/* Decorative frame elements */}
      <motion.div 
        className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/20"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div 
        className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-white/20"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
      />
      <motion.div 
        className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-white/20"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, delay: 2 }}
      />
      <motion.div 
        className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/20"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, delay: 3 }}
      />
    </motion.div>
  );
}