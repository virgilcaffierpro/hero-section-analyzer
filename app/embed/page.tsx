"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, AlertCircle, RefreshCw, ExternalLink, Clock } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import ResultsDashboard from "@/components/ResultsDashboard";

type AppState = "input" | "loading" | "results" | "error";

const LOADING_STEPS = [
  { id: 1, label: "Accès au site en cours…" },
  { id: 2, label: "Analyse du message de positionnement…" },
  { id: 3, label: "Analyse de la preuve sociale…" },
  { id: 4, label: "Analyse des CTAs et de l'offre…" },
  { id: 5, label: "Analyse du storytelling et de l'UX…" },
  { id: 6, label: "Génération du diagnostic…" },
  { id: 7, label: "Finalisation des recommandations…" },
];

const STEP_DURATIONS = [3000, 4000, 3000, 3000, 3000, 4000, 5000];

function EmbedLoading({ url }: { url: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_STEPS.forEach((_, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index + 1);
        if (index > 0) setCompletedSteps((prev) => [...prev, index]);
      }, elapsed);
      timers.push(timer);
      elapsed += STEP_DURATIONS[index];
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = Math.min(((currentStep - 1) / LOADING_STEPS.length) * 100, 95);

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
          style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)", animation: "loadingBounce 1.4s ease-in-out infinite" }} />
          Analyse en cours
        </div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>On regarde ton site…</h2>
        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "monospace", wordBreak: "break-all" }}>{url}</p>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
          <span>Progression</span>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%`, background: "linear-gradient(to right, var(--accent), #A78BFA)" }} />
        </div>
      </div>

      <div className="space-y-1.5">
        {LOADING_STEPS.map((step, index) => {
          const isCompleted = index < currentStep - 1;
          const isCurrent = index === currentStep - 1;
          const isPending = index >= currentStep;
          return (
            <div
              key={step.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-300"
              style={{
                background: isCurrent ? "var(--accent-light)" : isCompleted ? "#F0FDF4" : "transparent",
                opacity: isPending ? 0.35 : 1,
              }}
            >
              <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="8" fill="#10B981" />
                    <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full" style={{ border: "1.5px solid var(--border)" }} />
                )}
              </div>
              <span
                className="text-xs"
                style={{ color: isCurrent ? "var(--accent)" : isCompleted ? "#059669" : "var(--text-muted)", fontWeight: isCurrent ? 600 : 400 }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface HistoryEntry {
  url: string;
  normalizedUrl: string;
  totalScore: number;
  level: string;
  analyzedAt: string;
}

const LS_KEY = "pa-history";
const LS_LAST_ANALYSIS = "pa-last-analysis";
const LS_LAST_RESULT = "pa-last-result";

function canAnalyzeToday(): boolean {
  try {
    const last = localStorage.getItem(LS_LAST_ANALYSIS);
    if (!last) return true;
    const lastDate = new Date(last).toDateString();
    return lastDate !== new Date().toDateString();
  } catch { return true; }
}

function markAnalyzedToday(): void {
  try { localStorage.setItem(LS_LAST_ANALYSIS, new Date().toISOString()); } catch {}
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const hostname = u.hostname.replace(/^www\./, "");
    const pathname = u.pathname.replace(/\/+$/, "") || "";
    return (hostname + pathname).toLowerCase();
  } catch {
    return url.toLowerCase().trim().replace(/\/+$/, "");
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch { return []; }
}

function saveToHistory(entry: HistoryEntry): HistoryEntry[] {
  const all = loadHistory();
  const filtered = all.filter((e) => e.normalizedUrl !== entry.normalizedUrl);
  const updated = [entry, ...filtered].slice(0, 1);
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
  return updated;
}

function HistoryPanel({ history, onReanalyze, onViewResult, limitReached }: {
  history: HistoryEntry[];
  onReanalyze: (url: string, force: boolean) => void;
  onViewResult: () => void;
  limitReached: boolean;
}) {
  if (!history || history.length === 0) return null;

  const levelColor = (level: string) => {
    if (level === "vend") return "#059669";
    if (level === "transition") return "#D97706";
    return "#DC2626";
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Analyses récentes
        </span>
      </div>
      <div className="space-y-2">
        {history.map((entry, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
            style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
            onClick={() => limitReached ? onViewResult() : onReanalyze(entry.url, false)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {entry.normalizedUrl}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {new Date(entry.analyzedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-bold text-sm" style={{ color: levelColor(entry.level) }}>
                {entry.totalScore}/100
              </span>
              {!limitReached && (
                <button
                  className="p-1.5 rounded-lg"
                  style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
                  onClick={(e) => { e.stopPropagation(); onReanalyze(entry.url, true); }}
                  title="Forcer une nouvelle analyse"
                >
                  <RefreshCw size={11} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmbedInput({ onAnalyze, history, limitReached, onViewResult }: { onAnalyze: (url: string, force?: boolean) => void; history: HistoryEntry[]; limitReached: boolean; onViewResult: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) { setError("Entre l'URL de ton portfolio."); return; }
    const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    try {
      new URL(withProtocol);
      onAnalyze(trimmed);
    } catch {
      setError("URL invalide. Ex : https://monportfolio.com");
    }
  }

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            className="input-field text-sm"
            placeholder="https://monportfolio.com"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
            autoFocus
            autoComplete="url"
          />
          {error && (
            <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: "#DC2626" }}>
              <AlertCircle size={12} />
              {error}
            </p>
          )}
        </div>
        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={!url.trim() || limitReached}>
          Analyser mon portfolio
          <ArrowRight size={15} />
        </button>
        {limitReached && (
          <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
            Tu as déjà utilisé ton analyse gratuite aujourd'hui. Reviens demain !
          </p>
        )}
      </form>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {[{ icon: "🔍", label: "7 axes" }, { icon: "⏱", label: "30–60 sec" }].map((item, i) => (
          <div key={i} className="text-center p-2 rounded-xl" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
            <div className="text-base mb-0.5">{item.icon}</div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.label}</p>
          </div>
        ))}
      </div>
      <HistoryPanel history={history} onReanalyze={onAnalyze} onViewResult={onViewResult} limitReached={limitReached} />
    </div>
  );
}

function EmbedError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="p-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
        <AlertCircle size={22} color="#DC2626" />
      </div>
      <h3 className="font-bold mb-2" style={{ color: "var(--text-primary)" }}>Analyse impossible</h3>
      <p className="text-sm mb-5" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>{error}</p>
      <button onClick={onRetry} className="btn-primary">
        <RefreshCw size={14} />
        Réessayer
      </button>
    </div>
  );
}

export default function EmbedPage() {
  const [state, setState] = useState<AppState>("input");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [limitReached, setLimitReached] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());

    // Check admin IP → si admin, pas de limite
    fetch("/api/is-admin")
      .then((r) => r.json())
      .then((data) => {
        const admin = data?.admin === true;
        setIsAdmin(admin);
        if (!admin) setLimitReached(!canAnalyzeToday());
      })
      .catch(() => {
        setLimitReached(!canAnalyzeToday());
      });

    // Restore last result on refresh, unless user explicitly chose to go back to input
    try {
      const userReset = sessionStorage.getItem("pa-reset");
      const saved = localStorage.getItem(LS_LAST_RESULT);
      if (saved && !userReset) {
        const parsed = JSON.parse(saved);
        setResult(parsed.result);
        setUrl(parsed.url);
        setState("results");
      }
    } catch {}
  }, []);

  const handleAnalyze = useCallback(async (portfolioUrl: string, force = false) => {
    setUrl(portfolioUrl);
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: portfolioUrl, force }),
      });
      const text = await res.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Erreur serveur inattendue. Vérifie que la clé API Anthropic est bien configurée dans les variables d'environnement Vercel.");
      }
      if (!res.ok) throw new Error(data.error || "Erreur serveur.");
      setResult(data);
      setState("results");
      if (!isAdmin) {
        markAnalyzedToday();
        setLimitReached(true);
      }
      try { localStorage.setItem(LS_LAST_RESULT, JSON.stringify({ result: data, url: portfolioUrl })); } catch {}
      const entry: HistoryEntry = {
        url: portfolioUrl,
        normalizedUrl: normalizeUrl(portfolioUrl),
        totalScore: data.totalScore,
        level: data.level,
        analyzedAt: data.analyzedAt,
      };
      setHistory(saveToHistory(entry));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setState("error");
    }
  }, [isAdmin]);

  function handleReset() {
    setState("input"); setError(""); setResult(null);
    try { sessionStorage.setItem("pa-reset", "1"); } catch {}
  }
  function handleForceReanalyze() { handleAnalyze(url, true); }
  function handleViewLastResult() {
    try {
      const saved = localStorage.getItem(LS_LAST_RESULT);
      if (saved) {
        const parsed = JSON.parse(saved);
        setResult(parsed.result);
        setUrl(parsed.url);
        setState("results");
        sessionStorage.removeItem("pa-reset");
      }
    } catch {}
  }

  return (
    <div style={{ background: "transparent", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      {state === "input" && (
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div className="text-center mb-6">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              Audit gratuit
            </span>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Analyse ton portfolio</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
              Colle l'URL de ton site. L'IA va analyser ton message, tes CTAs, ta preuve sociale — et te dire ce qui bloque tes conversions.
            </p>
          </div>
          <div className="card">
            <EmbedInput onAnalyze={handleAnalyze} history={history} limitReached={limitReached} onViewResult={handleViewLastResult} />
          </div>
        </div>
      )}
      {state === "loading" && (
        <div className="card" style={{ width: "100%", maxWidth: 480 }}>
          <EmbedLoading url={url} />
        </div>
      )}
      {state === "results" && result && (
        <ResultsDashboard result={result} onReanalyze={handleReset} onForceReanalyze={handleForceReanalyze} />
      )}
      {state === "error" && (
        <div className="card" style={{ width: "100%", maxWidth: 480 }}>
          <EmbedError error={error} onRetry={handleReset} />
        </div>
      )}

      {/* Powered by footer */}
      <div className="text-center py-3">
        <a
          href="https://framesacademie.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Créé par Frames académie <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
