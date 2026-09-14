import React, { useState, useEffect } from 'react';
import { Timer, X, Play, Pause, RotateCcw, User, BellRing } from 'lucide-react';
import { GroupMember } from '../types';
import { playTimerFinishChime } from '../utils/audio';

interface SpeakerTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  timerSecondsLeft: number | null;
  isTimerRunning: boolean;
  totalDurationSeconds: number;
  onStartTimer: (duration: number) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
  activeSpeakerName?: string;
  onSelectSpeakerName: (name: string) => void;
  members: GroupMember[];
}

export const SpeakerTimerModal: React.FC<SpeakerTimerModalProps> = ({
  isOpen,
  onClose,
  timerSecondsLeft,
  isTimerRunning,
  totalDurationSeconds,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  activeSpeakerName,
  onSelectSpeakerName,
  members,
}) => {
  const [selectedDuration, setSelectedDuration] = useState(120); // default 2 mins

  if (!isOpen) return null;

  const currentSeconds = timerSecondsLeft !== null ? timerSecondsLeft : selectedDuration;
  const progressPercent = totalDurationSeconds > 0 ? (currentSeconds / totalDurationSeconds) * 100 : 100;

  const mins = Math.floor(currentSeconds / 60);
  const secs = currentSeconds % 60;
  const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const handlePresetSelect = (duration: number) => {
    setSelectedDuration(duration);
    onStartTimer(duration);
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs touch-manipulation animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-stone-900 text-stone-100 rounded-3xl max-w-md w-full shadow-2xl border border-stone-800 p-5 sm:p-6 flex flex-col items-center touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-stone-100">夥伴分享計時器</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Speaker Selection */}
        <div className="w-full mb-6 bg-stone-800/80 p-3 rounded-2xl border border-stone-700/80">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              目前發言夥伴：
            </span>
            <span className="text-xs font-bold text-amber-300">
              {activeSpeakerName || '自由發言'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectSpeakerName(m.name)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  activeSpeakerName === m.name
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Big Circular Progress Timer Display */}
        <div className="relative w-48 h-48 flex items-center justify-center my-2">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-stone-800 stroke-current"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className={`stroke-current transition-all duration-1000 ${
                currentSeconds < 20
                  ? 'text-rose-500'
                  : currentSeconds < 45
                  ? 'text-amber-500'
                  : 'text-emerald-400'
              }`}
              strokeWidth="7"
              strokeDasharray={276}
              strokeDashoffset={276 - (276 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-bold tracking-tight text-stone-50">
              {formattedTime}
            </span>
            <span className="text-[11px] text-stone-400 mt-1">
              {isTimerRunning ? '分享倒數中...' : '已暫停'}
            </span>
          </div>
        </div>

        {/* Preset Time Buttons */}
        <div className="flex items-center gap-2.5 my-4">
          {[
            { label: '1 分鐘', sec: 60 },
            { label: '2 分鐘', sec: 120 },
            { label: '3 分鐘', sec: 180 },
            { label: '5 分鐘', sec: 300 },
          ].map((preset) => (
            <button
              key={preset.sec}
              onClick={() => handlePresetSelect(preset.sec)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                selectedDuration === preset.sec && timerSecondsLeft === null
                  ? 'bg-amber-400 text-stone-950 font-bold shadow-xs'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-750 border border-stone-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center gap-3 w-full mt-2">
          {isTimerRunning ? (
            <button
              onClick={onPauseTimer}
              className="flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Pause className="w-5 h-5" />
              <span>暫停計時</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (timerSecondsLeft !== null) {
                  onResumeTimer();
                } else {
                  onStartTimer(selectedDuration);
                }
              }}
              className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Play className="w-5 h-5" />
              <span>{timerSecondsLeft !== null ? '繼續計時' : '開始計時'}</span>
            </button>
          )}

          <button
            onClick={onResetTimer}
            className="px-4 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-base font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            title="重置計時"
          >
            <RotateCcw className="w-5 h-5" />
            <span>重設</span>
          </button>
        </div>
      </div>
    </div>
  );
};
