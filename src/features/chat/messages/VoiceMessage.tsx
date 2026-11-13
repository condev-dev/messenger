"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "../types";

export function VoiceMessage({ message }: { message: Message }) {
  const url = typeof message.content.url === "string" ? message.content.url : "";
  const initialDuration = typeof message.content.duration === "number" ? message.content.duration : 0;
  const waveform: number[] = Array.isArray(message.content.waveform) && message.content.waveform.length > 0
    ? (message.content.waveform as number[])
    : Array.from({ length: 32 }, (_, i) => 0.2 + (Math.sin(i * 0.5) + 1) * 0.35);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const [duration, setDuration] = useState(initialDuration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.onpause = () => {
      setIsPlaying(false);
    };

    audio.onplay = () => {
      setIsPlaying(true);
    };

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [url]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.playbackRate = playbackRate;
      void audio.play();
    }
  }, [isPlaying, playbackRate]);

  const toggleRate = useCallback(() => {
    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  const handleSeek = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      if (!audio || duration <= 0) return;
      const progress = index / waveform.length;
      const targetTime = progress * duration;
      audio.currentTime = targetTime;
      setCurrentTime(targetTime);
      if (!isPlaying) {
        audio.playbackRate = playbackRate;
        void audio.play();
      }
    },
    [duration, isPlaying, playbackRate, waveform.length]
  );

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBarIndex = Math.floor(progress * waveform.length);

  return (
    <div className="flex items-center gap-3 py-1 select-none min-w-[220px] max-w-[280px]">
      {/* دکمه Play/Pause دایره‌ای تلگرام */}
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "size-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition active:scale-95",
          "bg-primary text-primary-foreground hover:opacity-90"
        )}
        aria-label={isPlaying ? "توقف پخش" : "پخش صدا"}
      >
        {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ms-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* نوار موج صوتی قابل کلیک */}
        <div className="flex items-center gap-[2px] h-6 cursor-pointer py-1" role="presentation">
          {waveform.map((bar, i) => {
            const isPlayed = i <= activeBarIndex && (isPlaying || currentTime > 0);
            const height = Math.max(4, Math.round(bar * 20));

            return (
              <span
                key={i}
                onClick={() => handleSeek(i)}
                style={{ height: `${height}px` }}
                className={cn(
                  "w-[3px] rounded-full transition-all duration-75 hover:opacity-100",
                  isPlayed
                    ? "bg-primary opacity-100"
                    : "bg-current opacity-30 hover:opacity-50"
                )}
              />
            );
          })}
        </div>

        {/* اطلاعات زمان و سرعت پخش */}
        <div className="flex items-center justify-between text-[11px] opacity-75 font-mono">
          <span>{isPlaying ? formatSeconds(currentTime) : formatSeconds(duration || initialDuration)}</span>

          <button
            type="button"
            onClick={toggleRate}
            className={cn(
              "px-1 py-0.5 rounded text-[10px] font-bold tracking-tight transition hover:bg-black/10 dark:hover:bg-white/10",
              playbackRate !== 1 ? "text-primary opacity-100 font-extrabold" : "opacity-60"
            )}
            title="تغییر سرعت پخش"
          >
            {playbackRate}X
          </button>
        </div>
      </div>
    </div>
  );
}
