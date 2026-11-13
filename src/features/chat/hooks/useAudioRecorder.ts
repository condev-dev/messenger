"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { playRecordStartSound } from "@/lib/sounds";

export type AudioRecordingResult = {
  blob: Blob;
  duration: number; // in seconds
  waveform: number[]; // normalized bars between 0.1 and 1.0
};

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [liveVolume, setLiveVolume] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    cleanup();
    audioChunksRef.current = [];
    waveformSamplesRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio analysis for live waveform
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const norm = Math.max(0.12, Math.min(1.0, avg / 128));

        waveformSamplesRef.current.push(norm);

        setLiveVolume((prev) => {
          const next = [...prev, norm];
          return next.slice(-24); // keep latest 24 bars for live UI
        });

        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      animFrameRef.current = requestAnimationFrame(updateWaveform);

      // MediaRecorder setup
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "",
      ];
      const supportedMime = mimeTypes.find((mime) => mime === "" || MediaRecorder.isTypeSupported(mime)) || "";
      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100); // 100ms chunks
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);
      playRecordStartSound();

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
      }, 200);

      return true;
    } catch {
      cleanup();
      setIsRecording(false);
      return false;
    }
  }, [cleanup]);

  const stopRecording = useCallback((): Promise<AudioRecordingResult | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanup();
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const totalDuration = Math.max(1, (Date.now() - startTimeRef.current) / 1000);
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        // Normalize raw samples to fixed 32 bars
        const rawSamples = waveformSamplesRef.current;
        const targetBars = 32;
        const normalizedWaveform: number[] = [];

        if (rawSamples.length > 0) {
          const blockSize = Math.floor(rawSamples.length / targetBars) || 1;
          for (let i = 0; i < targetBars; i++) {
            const start = i * blockSize;
            const end = Math.min(start + blockSize, rawSamples.length);
            let sum = 0;
            let count = 0;
            for (let j = start; j < end; j++) {
              sum += rawSamples[j];
              count++;
            }
            const val = count > 0 ? sum / count : 0.2;
            normalizedWaveform.push(Number(val.toFixed(2)));
          }
        } else {
          // fallback bars
          for (let i = 0; i < targetBars; i++) {
            normalizedWaveform.push(0.2 + (Math.sin(i * 0.4) + 1) * 0.3);
          }
        }

        cleanup();
        setIsRecording(false);
        setDuration(0);
        setLiveVolume([]);

        resolve({
          blob,
          duration: totalDuration,
          waveform: normalizedWaveform,
        });
      };

      try {
        recorder.stop();
      } catch {
        cleanup();
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {
        // Ignore
      }
    }
    cleanup();
    setIsRecording(false);
    setDuration(0);
    setLiveVolume([]);
  }, [cleanup]);

  return {
    isRecording,
    duration,
    liveVolume,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
