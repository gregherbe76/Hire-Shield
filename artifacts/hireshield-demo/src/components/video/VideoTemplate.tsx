import { useEffect, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  hook: 7000,
  paste: 10000,
  report: 12000,
  community: 9000,
  close: 5000,
};

export const SCENE_COMPONENTS: Record<string, ComponentType> = {
  hook: Scene1,
  paste: Scene2,
  report: Scene3,
  community: Scene4,
  close: Scene5,
};

const bgGlowPos = [
  { x: '50vw', y: '50vh', scale: 1, opacity: 0.1 },
  { x: '20vw', y: '20vh', scale: 1.2, opacity: 0.15 },
  { x: '80vw', y: '70vh', scale: 1.5, opacity: 0.2 },
  { x: '50vw', y: '10vh', scale: 2, opacity: 0.15 },
  { x: '50vw', y: '50vh', scale: 1, opacity: 0.1 },
];

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const safeIndex = sceneIndex >= 0 ? sceneIndex : 0;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-bg-dark)] font-body">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full blur-[120px] bg-accent"
          style={{ translateX: '-50%', translateY: '-50%' }}
          animate={bgGlowPos[safeIndex]}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[100px] bg-secondary"
          style={{ top: '60%', left: '20%', translateX: '-50%', translateY: '-50%' }}
          animate={{ x: ['0%', '10%', '-10%', '0%'], y: ['0%', '-10%', '10%', '0%'] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <motion.div
        className="absolute h-[1px] bg-accent/40 z-0"
        animate={{
          left: ['0%', '10%', '30%', '5%', '0%'][safeIndex],
          width: ['100%', '80%', '40%', '90%', '100%'][safeIndex],
          top: ['15%', '80%', '20%', '90%', '50%'][safeIndex],
          opacity: [0.2, 0.5, 0.8, 0.4, 0][safeIndex],
        }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute w-[1px] bg-accent/40 z-0"
        animate={{
          top: ['0%', '10%', '30%', '5%', '0%'][safeIndex],
          height: ['100%', '80%', '40%', '90%', '100%'][safeIndex],
          left: ['85%', '20%', '80%', '10%', '50%'][safeIndex],
          opacity: [0.2, 0.5, 0.8, 0.4, 0][safeIndex],
        }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />

      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
