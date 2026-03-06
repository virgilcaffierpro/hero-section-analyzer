import fs from "fs";
import os from "os";
import path from "path";
import type { AnalysisResult, HeroLevel } from "./types";

// On Vercel (production), process.cwd() is read-only — use /tmp instead
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "portfolio-analyzer")
  : path.join(process.cwd(), "data");

const CACHE_FILE = path.join(DATA_DIR, "cache.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(file: string, data: unknown): void {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

// Normalize URL: strip protocol, www, trailing slashes
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const hostname = u.hostname.replace(/^www\./, "");
    const pathname = u.pathname.replace(/\/+$/, "") || "";
    return (hostname + pathname).toLowerCase();
  } catch {
    return url.toLowerCase().trim().replace(/\/+$/, "");
  }
}

// ── Cache (same result for same URL) ─────────────────────────

type CacheStore = Record<string, AnalysisResult>;

export function getCached(url: string): AnalysisResult | null {
  const key = normalizeUrl(url);
  const store = readJSON<CacheStore>(CACHE_FILE, {});
  return store[key] ?? null;
}

export function setCached(url: string, result: AnalysisResult): void {
  const key = normalizeUrl(url);
  const store = readJSON<CacheStore>(CACHE_FILE, {});
  store[key] = result;
  writeJSON(CACHE_FILE, store);
}

export function clearCachedUrl(url: string): void {
  const key = normalizeUrl(url);
  const store = readJSON<CacheStore>(CACHE_FILE, {});
  delete store[key];
  writeJSON(CACHE_FILE, store);
}

// ── History (timeline of analyses per URL) ───────────────────

export interface HistoryEntry {
  url: string;
  normalizedUrl: string;
  totalScore: number;
  level: HeroLevel;
  analyzedAt: string;
}

type HistoryStore = HistoryEntry[];

export function getHistory(url?: string): HistoryEntry[] {
  const history = readJSON<HistoryStore>(HISTORY_FILE, []);
  if (!url) return history;
  const key = normalizeUrl(url);
  return history.filter((e) => e.normalizedUrl === key);
}

export function getLastEntry(url: string): HistoryEntry | null {
  const entries = getHistory(url);
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

export function addToHistory(result: AnalysisResult): void {
  const history = readJSON<HistoryStore>(HISTORY_FILE, []);
  const entry: HistoryEntry = {
    url: result.url,
    normalizedUrl: normalizeUrl(result.url),
    totalScore: result.totalScore,
    level: result.level,
    analyzedAt: result.analyzedAt,
  };
  history.push(entry);
  writeJSON(HISTORY_FILE, history);
}
