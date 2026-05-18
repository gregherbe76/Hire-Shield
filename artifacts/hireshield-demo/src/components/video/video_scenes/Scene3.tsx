import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(5), 5500)
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const signals = [
    { label: 'Urgent Language', val: 'High', color: 'text-error', bg: 'bg-error/10 border-error/20' },
    { label: 'Unrealistic Salary', val: 'Detected', color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
    { label: 'Upfront Payment', val: 'Critical', color: 'text-error', bg: 'bg-error/10 border-error/20' },
    { label: 'Vague Requirements', val: 'Moderate', color: 'text-accent', bg: 'bg-accent/10 border-accent/20' }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[70vw] max-w-5xl flex gap-8">
        
        {/* Left Column: Scores */}
        <div className="w-1/3 flex flex-col gap-6">
          <motion.div 
            className="bg-[#0f1115] border border-white/10 rounded-xl p-6 relative overflow-hidden"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="text-white/50 text-sm font-mono uppercase mb-2">Trust Score</div>
            <div className="flex items-end gap-2">
              <motion.div 
                className="text-6xl font-bold font-mono text-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {phase >= 2 ? '24' : '??'}
              </motion.div>
              <div className="text-white/30 text-xl pb-2">/100</div>
            </div>
            {phase >= 2 && (
              <motion.div 
                className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div 
                  className="h-full bg-error"
                  initial={{ width: '0%' }}
                  animate={{ width: '24%' }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </motion.div>
            )}
          </motion.div>

          <motion.div 
            className="bg-[#0f1115] border border-white/10 rounded-xl p-6"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="text-white/50 text-sm font-mono uppercase mb-2">Ghost Job Prob</div>
            <div className="text-4xl font-bold text-white font-mono">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {phase >= 3 ? '89%' : '--%'}
              </motion.span>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Signals */}
        <div className="w-2/3">
          <motion.div 
            className="bg-[#0f1115] border border-white/10 rounded-xl p-8 h-full"
            initial={{ opacity: 0, y: 50 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <h3 className="text-xl font-bold mb-6 font-display flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
              Detected Signals
            </h3>
            
            <div className="flex flex-col gap-4">
              {signals.map((sig, i) => (
                <motion.div 
                  key={i}
                  className={`flex justify-between items-center p-4 rounded-lg border ${sig.bg}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                >
                  <div className="font-medium text-white/90">{sig.label}</div>
                  <div className={`font-mono text-sm uppercase ${sig.color}`}>{sig.val}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Decorative large text behind */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15vw] font-bold text-white/[0.02] font-mono pointer-events-none whitespace-nowrap z-[-1]"
        animate={{ x: ['-50%', '-60%'] }}
        transition={{ duration: 10, ease: 'linear' }}
      >
        ANALYSIS
      </motion.div>
    </motion.div>
  );
}