"use client";
import { useCallback, useRef, useState } from "react";

/**
 * Mic in (MediaRecorder -> ElevenLabs Scribe) and voice out (ElevenLabs TTS), with one
 * AnalyserNode the orb reads for loudness.
 *
 * `listen()` is the hands-free path: it opens the mic, waits for the person to start talking,
 * and stops by itself after a short pause, then returns the transcript. The mic stream is kept
 * open between turns so the browser doesn't re-prompt or add a delay every question.
 * If TTS is unavailable we fall back to the browser's own voice so a call never goes silent.
 */
export function useVoice() {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const buf = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const micSrc = useRef<MediaStreamAudioSourceNode | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const endSpeech = useRef<(() => void) | null>(null);
  const cancelListen = useRef<(() => void) | null>(null);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const a = ctx.createAnalyser();
      a.fftSize = 512;
      ctxRef.current = ctx;
      analyser.current = a;
      buf.current = new Uint8Array(new ArrayBuffer(a.frequencyBinCount));
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  };

  const level = useCallback(() => {
    const a = analyser.current;
    const b = buf.current;
    if (!a || !b) return 0;
    a.getByteTimeDomainData(b);
    let sum = 0;
    for (const v of b) sum += ((v - 128) / 128) ** 2;
    return Math.sqrt(sum / b.length);
  }, []);

  const openMic = async () => {
    const ctx = ensureCtx();
    if (!stream.current || stream.current.getTracks().every((t) => t.readyState === "ended")) {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      micSrc.current = ctx.createMediaStreamSource(stream.current);
    }
    micSrc.current!.connect(analyser.current!);
    return stream.current;
  };

  const start = useCallback(async () => {
    const s = await openMic();
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.start();
    rec.current = r;
    setRecording(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishRecording = async (transcribe: boolean): Promise<string> => {
    const r = rec.current;
    if (!r) return "";
    const done = new Promise<void>((res) => (r.onstop = () => res()));
    r.stop();
    await done;
    micSrc.current?.disconnect();
    rec.current = null;
    setRecording(false);
    if (!transcribe) return "";
    const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "speech.webm");
    const res = await fetch("/api/stt", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Couldn't understand that.");
    return json.text as string;
  };

  /** Stop a hold-to-talk recording and return what was said. */
  const stop = useCallback(() => finishRecording(true), []);

  /**
   * Hands-free: listen until the person speaks and then pauses. Resolves "" if nobody spoke
   * (so the caller can just listen again) or if `stopListening()` was called.
   */
  const listen = useCallback(async (opts: { pauseMs?: number; maxMs?: number; waitMs?: number } = {}): Promise<string> => {
    const { pauseMs = 1200, maxMs = 20000, waitMs = 9000 } = opts;
    await start();
    return new Promise<string>((resolve, reject) => {
      const t0 = Date.now();
      let floor = 0;
      let samples = 0;
      let spoke = false;
      let lastLoud = 0;
      const tick = setInterval(async () => {
        const l = level();
        const now = Date.now();
        // first 300 ms: learn the room's background level so a fan or traffic isn't "speech"
        if (now - t0 < 300) {
          floor = (floor * samples + l) / ++samples;
          return;
        }
        const threshold = Math.max(0.02, floor * 2.5);
        if (l > threshold) {
          spoke = true;
          lastLoud = now;
        }
        const end = (spoke && now - lastLoud > pauseMs) || now - t0 > maxMs || (!spoke && now - t0 > waitMs);
        if (!end) return;
        clearInterval(tick);
        cancelListen.current = null;
        try {
          resolve(await finishRecording(spoke));
        } catch (e) {
          reject(e);
        }
      }, 80);
      cancelListen.current = () => {
        clearInterval(tick);
        cancelListen.current = null;
        void finishRecording(false).then(() => resolve(""));
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, start]);

  const stopListening = useCallback(() => cancelListen.current?.(), []);

  /** Release the microphone completely (end of a call or conversation). */
  const releaseMic = useCallback(() => {
    cancelListen.current?.();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    micSrc.current = null;
  }, []);

  const browserSpeak = (text: string) =>
    new Promise<void>((resolve) => {
      if (!("speechSynthesis" in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = /[ऀ-ॿ]/.test(text) ? "hi-IN" : "en-IN";
      const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith(u.lang.slice(0, 2)) && /female|lekha|veena|kalpana/i.test(x.name));
      if (v) u.voice = v;
      endSpeech.current = resolve;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });

  const speak = useCallback(async (text: string, voiceId?: string) => {
    const ctx = ensureCtx();
    setSpeaking(true);
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, voiceId }) });
      if (!res.ok) throw new Error("tts");
      const url = URL.createObjectURL(await res.blob());
      if (!audioEl.current) {
        audioEl.current = new Audio();
        const src = ctx.createMediaElementSource(audioEl.current);
        // Voice goes to the speakers and, separately, to the analyser for the orb.
        // The analyser itself never reaches the speakers, or the mic (also wired to it) would echo.
        src.connect(ctx.destination);
        src.connect(analyser.current!);
      }
      const el = audioEl.current;
      el.src = url;
      await new Promise<void>((resolve) => {
        endSpeech.current = resolve;
        el.onended = () => resolve();
        el.onerror = () => resolve();
        el.play().catch(() => resolve());
      });
      URL.revokeObjectURL(url);
    } catch {
      await browserSpeak(text);
    } finally {
      endSpeech.current = null;
      setSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Cut speech off immediately; the pending speak() resolves so loops can move on. */
  const hush = useCallback(() => {
    audioEl.current?.pause();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    endSpeech.current?.();
    endSpeech.current = null;
    setSpeaking(false);
  }, []);

  return { start, stop, listen, stopListening, releaseMic, speak, hush, level, recording, speaking };
}
