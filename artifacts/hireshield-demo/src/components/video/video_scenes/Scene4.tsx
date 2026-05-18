import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 4500)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center z-10 mb-12">
        <motion.h2 
          className="text-5xl font-bold font-display text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Community Intelligence
        </motion.h2>
        <motion.div
          className="text-2xl font-mono text-accent"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          >
            10,482
          </motion.span>
          <span className="text-white/50 text-lg ml-2">postings analyzed</span>
        </motion.div>
      </div>

      <div className="relative w-[80vw] h-[40vh] flex items-end justify-center gap-2">
        {/* Animated Bar Chart Mockup */}
        {[...Array(40)].map((_, i) => {
          const height = Math.random() * 80 + 20;
          const isHighRisk = height > 70;
          return (
            <motion.div 
              key={i}
              className={`w-4 rounded-t-sm ${isHighRisk ? 'bg-accent/80' : 'bg-white/20'}`}
              initial={{ height: 0, opacity: 0 }}
              animate={phase >= 3 ? { height: `${height}%`, opacity: 1 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.6, delay: i * 0.02, type: 'spring', damping: 20 }}
            />
          );
        })}
        
        {/* Data points overlay */}
        {phase >= 3 && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            <div className="w-full h-[1px] bg-accent/50 relative top-[-10%]">
              <div className="absolute right-0 -top-6 text-accent font-mono text-xs">High Risk Threshold</div>
            </div>
          </motion.div>
        )}
      </div>

    </motion.div>
  );
}