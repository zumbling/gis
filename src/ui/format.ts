import type { CaptureRecord } from "../types";

export function formatNumber(value: number | null | undefined, digits: number, unit: string): string {
  return value === null || value === undefined ? "-" : `${value.toFixed(digits)}${unit}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function detectPlatform(): CaptureRecord["device"]["platform"] {
  const agent = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(agent)) return "ios";
  if (/Android/.test(agent)) return "android";
  return "other";
}

export function escapeHtml(text: string): string {
  const element = document.createElement("span");
  element.textContent = text;
  return element.innerHTML;
}
