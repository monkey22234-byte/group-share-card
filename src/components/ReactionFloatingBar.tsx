import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ThumbsUp, Sparkles, MessageCircle, Flame, Users, Mic } from 'lucide-react';
import { ReactionType, FloatingParticle } from '../types';
import { REACTION_TYPES } from '../data/defaultTopics';
import { playReactionSound } from '../utils/audio';

interface ReactionFloatingBarProps {
  activeSpeakerName?: string;
  onOpenTimerModal: () => void;
}

export const ReactionFloatingBar: React.FC<ReactionFloatingBarProps> = ({
  activeSpeakerName,
  onOpenTimerModal,
}) => {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [lastCheerText, setLastCheerText] = useState<string | null>(null);

  // Trigger floating reaction particle
  const handleTriggerReaction = (reaction: ReactionType) => {
    playReactionSound(reaction.soundPitch);

    // Update count
    setReactionCounts((prev) => ({
      ...prev,
      [reaction.id]: (prev[reaction.id] || 0) + 1,
    }));

    // Show temporary cheer banner
    setLastCheerText(
      activeSpeakerName
        ? `為 ${activeSpeakerName} 送上「${reaction.emoji} ${reaction.label}」！`
        : `為夥伴送上「${reaction.emoji} ${reaction.label}」！`
    );

    // Create 3 floating particles for burst effect
    const newParticles: FloatingParticle[] = Array.from({ length: 3 }).map((_, i) => ({
      id: `${Date.now()}-${Math.random()}-${i}`,
      emoji: reaction.emoji,
      label: reaction.label,
      x: 30 + Math.random() * 40, // Center cluster (30% to 70%)
      size: 24 + Math.random() * 16,
      rotation: (Math.random() - 0.5) * 45,
      createdAt: Date.now(),
    }));

    setParticles((prev) => [...prev.slice(-25), ...newParticles]);
  };

  // Clean up particles older than 2.2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setParticles((prev) => prev.filter((p) => now - p.createdAt < 2200));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Floating Particles Canvas Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                opacity: 1,
                y: window.innerHeight - 100,
                x: `${p.x}vw`,
                scale: 0.6,
                rotate: p.rotation,
              }}
              animate={{
                opacity: 0,
                y: window.innerHeight - 520 - Math.random() * 120,
                x: `${p.x + (Math.random() - 0.5) * 15}vw`,
                scale: 1.4,
                rotate: p.rotation * 2,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className="absolute select-none drop-shadow-lg flex flex-col items-center"
              style={{ fontSize: `${p.size}px` }}
            >
              <span>{p.emoji}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Emotional Cheer Dock */}
      <div className="sticky bottom-0 z-30 w-full bg-stone-900/90 backdrop-blur-md border-t border-stone-800 py-2.5 px-3 shadow-2xl">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Active Speaker Spotlight Indicator */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={onOpenTimerModal}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition shrink-0"
              title="點擊切換分享者或設定計時"
            >
              <Mic className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{activeSpeakerName ? `發言：${activeSpeakerName}` : '夥伴熱情分享中'}</span>
            </button>

            {lastCheerText && (
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-stone-300 italic truncate max-w-[200px]"
              >
                {lastCheerText}
              </motion.span>
            )}
          </div>

          {/* Reaction Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider hidden md:inline shrink-0 mr-1">
              提供情緒價值：
            </span>

            {REACTION_TYPES.map((reaction) => {
              const count = reactionCounts[reaction.id] || 0;
              return (
                <button
                  key={reaction.id}
                  id={`btn-react-${reaction.id}`}
                  onClick={() => handleTriggerReaction(reaction)}
                  className="relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 border border-stone-700/80 hover:border-stone-500 transition-all duration-150 active:scale-90 shrink-0 shadow-sm"
                  title={`${reaction.label} (${reaction.subText})`}
                >
                  <span className="text-base sm:text-lg group-hover:scale-125 transition-transform">
                    {reaction.emoji}
                  </span>
                  <span className="text-xs font-medium text-stone-200 hidden sm:inline whitespace-nowrap">
                    {reaction.label}
                  </span>

                  {/* Reaction Count Badge */}
                  {count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-stone-950 shadow-xs animate-scale">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
