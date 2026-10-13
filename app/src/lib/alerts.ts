"use client";

import { BRAND } from "@/lib/brand";

let audioCtx: AudioContext | null = null;
let unlocked = false;

/**
 * Navegadores bloqueiam áudio antes de qualquer interação do usuário na página.
 * Chamamos isto uma vez (no primeiro clique/toque) para "destravar" o contexto de
 * áudio, para que o som de alerta consiga tocar mais tarde quando um lead novo chegar
 * via polling (sem gesto do usuário naquele momento).
 */
export function unlockAudio() {
  if (unlocked && audioCtx?.state === "running") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx ?? new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    unlocked = true;
  } catch {
    // Web Audio indisponível — o alerta visual/notificação continua funcionando normalmente.
  }
}

/**
 * true quando o navegador já liberou o áudio (houve interação na página). Antes disso o
 * alerta não consegue tocar — o BrokerAlertListener mostra um aviso discreto pedindo um toque.
 */
export function isAudioReady(): boolean {
  return audioCtx?.state === "running";
}

// O mesmo lead pode disparar o alerta por dois caminhos quase juntos (polling do dashboard e
// mensagem do push via service worker) — evita tocar duas vezes seguidas.
let lastPlayedAt = 0;
const MIN_INTERVAL_MS = 4000;

// Alarme de lead novo: 3 rajadas de 4 bipes agudos alternados (B5/E6), ~2s no total.
// Onda quadrada + volume alto passando por um compressor = som forte e marcante sem distorcer.
const BURSTS = 3;
const BEEPS_PER_BURST = 4;
const BEEP_SECONDS = 0.09;
const BEEP_GAP_SECONDS = 0.03;
const BURST_GAP_SECONDS = 0.22;
const TONES = [988, 1319];
const PEAK_GAIN = 0.9;

/** Toca o alarme de lead novo (gerado via Web Audio, sem depender de arquivo de áudio externo). */
export function playLeadAlertSound() {
  const nowMs = Date.now();
  if (nowMs - lastPlayedAt < MIN_INTERVAL_MS) return;
  lastPlayedAt = nowMs;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx ?? new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const ctx = audioCtx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 6;
    compressor.connect(ctx.destination);

    let start = ctx.currentTime + 0.02;
    for (let burst = 0; burst < BURSTS; burst++) {
      for (let beep = 0; beep < BEEPS_PER_BURST; beep++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = TONES[beep % TONES.length];
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(PEAK_GAIN, start + 0.005);
        gain.gain.setValueAtTime(PEAK_GAIN, start + BEEP_SECONDS - 0.01);
        gain.gain.linearRampToValueAtTime(0, start + BEEP_SECONDS);
        osc.connect(gain);
        gain.connect(compressor);
        osc.start(start);
        osc.stop(start + BEEP_SECONDS);
        start += BEEP_SECONDS + BEEP_GAP_SECONDS;
      }
      start += BURST_GAP_SECONDS;
    }
  } catch {
    // Silencioso — não deve quebrar a UI se o áudio falhar.
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported" as const;
  return Notification.requestPermission();
}

export function showLeadNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: BRAND.logo.src, tag: `lead-${Date.now()}` });
  } catch {
    // Alguns navegadores mobile não suportam `new Notification()` fora de um Service Worker — ok ignorar.
  }
}
