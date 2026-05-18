import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-dark)]"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Central Shield/Logo motif */}
      <motion.div 
        className="relative w-32 h-32 mb-8 flex items-center justify-center"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
      >
        <div className="absolute inset-0 border-4 border-accent rounded-xl rotate-45 opacity-50" />
        <div className="absolute inset-0 border-4 border-accent rounded-xl rotate-45 scale-75" />
        <div className="w-12 h-12 bg-accent rounded-full blur-md opacity-80 animate-pulse" />
      </motion.div>

      <div className="text-center">
        <motion.h1 
          className="text-6xl font-bold font-display text-white tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          HireShield
        </motion.h1>
        
        <motion.p
          className="mt-6 text-2xl text-white/60 font-body"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="text-white">Trust signals,</span> not verdicts.
        </motion.p>
      </div>

      <motion.div 
        className="absolute bottom-12 text-sm font-mono text-white/30 tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        Open-Source • Community-Driven
      </motion.div>
    </motion.div>
  );
}