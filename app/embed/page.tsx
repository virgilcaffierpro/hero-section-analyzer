"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle, ExternalLink } from "lucide-react";
import { Globe, Camera, Diamond, Lightning, Star, ChartBar, ArrowCounterClockwise, Clock, CheckCircle } from "@phosphor-icons/react";
import type { AnalysisResult } from "@/lib/types";
import ResultsDashboard from "@/components/ResultsDashboard";

type AppState = "input" | "loading" | "results" | "error";

const LOADING_STEPS = [
  { id: 1, Icon: Globe, label: "Accès au site" },
  { id: 2, Icon: Camera, label: "Capture hero" },
  { id: 3, Icon: Diamond, label: "Prop. de valeur" },
  { id: 4, Icon: Lightning, label: "Accroche & CTA" },
  { id: 5, Icon: Star, label: "Preuve sociale" },
  { id: 6, Icon: ChartBar, label: "Finalisation" },
];

const STEP_DURATIONS = [3000, 4000, 4000, 4000, 4000, 6000];

function EmbedLoading({ url }: { url: string }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_STEPS.forEach((_, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index + 1);
      }, elapsed);
      timers.push(timer);
      elapsed += STEP_DURATIONS[index];
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = Math.min(((currentStep) / LOADING_STEPS.length) * 100, 95);

  return (
    <div className="p-6">
      {/* Horizontal step icons */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "24px",
        }}
      >
        {LOADING_STEPS.map((step, index) => {
          const isCompleted = index < currentStep - 1;
          const isCurrent = index === currentStep - 1;
          const isPending = index >= currentStep;

          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                minWidth: "52px",
              }}
            >
              <div
                className={`loading-step-circle ${
                  isCompleted ? "completed" : isCurrent ? "active" : isPending ? "pending" : ""
                }`}
              >
                {isCompleted ? (
                  <CheckCircle size={20} weight="fill" style={{ color: "#059669" }} />
                ) : (
                  <step.Icon size={20} weight={isCurrent ? "fill" : "regular"} />
                )}
              </div>
              {isCurrent && (
                <span
                  className="text-xs font-semibold text-center"
                  style={{ color: "var(--accent)", lineHeight: "1.2" }}
                >
                  {step.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track" style={{ marginBottom: "12px" }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(to right, var(--accent), #A78BFA)",
          }}
        />
      </div>

      {/* Time estimate */}
      <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
        ~20 secondes
      </p>
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

const LS_KEY = "ha-history";
const LS_LAST_ANALYSIS = "ha-last-analysis";
const LS_LAST_RESULT = "ha-last-result";

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
    if (level === "convainc") return "#059669";
    if (level === "confuse") return "#D97706";
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
                  <ArrowCounterClockwise size={11} weight="bold" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmbedInput({ onAnalyze, history, limitReached, onViewResult }: { onAnalyze: (url: string, target: string, force?: boolean) => void; history: HistoryEntry[]; limitReached: boolean; onViewResult: () => void }) {
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) { setError("Entre l'URL de ta page."); return; }
    const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    try {
      new URL(withProtocol);
      onAnalyze(trimmed, target.trim());
    } catch {
      setError("URL invalide. Ex : https://monsite.com");
    }
  }

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            URL de ta page
          </label>
          <input
            type="text"
            className="input-field text-sm"
            placeholder="https://monsite.com"
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
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Ta cible <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optionnel)</span>
          </label>
          <input
            type="text"
            className="input-field text-sm"
            placeholder="Ex : entrepreneurs créatifs 30-50 ans, PME locales…"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={!url.trim() || limitReached}>
          Analyser ma hero section
          <ArrowRight size={15} />
        </button>
        {limitReached && (
          <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
            Tu as déjà utilisé ton analyse gratuite aujourd'hui. Reviens demain !
          </p>
        )}
      </form>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="text-center p-2 rounded-xl" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          <div className="text-base mb-0.5"><ChartBar size={18} weight="duotone" style={{ display: "inline-block", color: "var(--accent)" }} /></div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>7 axes hero</p>
        </div>
        <div className="text-center p-2 rounded-xl" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
          <div className="text-base mb-0.5"><Clock size={18} weight="duotone" style={{ display: "inline-block", color: "var(--accent)" }} /></div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>30–60 sec</p>
        </div>
      </div>
      <HistoryPanel history={history} onReanalyze={(url) => onAnalyze(url, "", false)} onViewResult={onViewResult} limitReached={limitReached} />
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
        <ArrowCounterClockwise size={14} weight="bold" />
        Réessayer
      </button>
    </div>
  );
}

function EmbedPageInner() {
  const [state, setState] = useState<AppState>("input");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [limitReached, setLimitReached] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const searchParams = useSearchParams();
  const autoLaunched = useRef(false);

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
      const userReset = sessionStorage.getItem("ha-reset");
      const saved = localStorage.getItem(LS_LAST_RESULT);
      if (saved && !userReset) {
        const parsed = JSON.parse(saved);
        setResult(parsed.result);
        setUrl(parsed.url);
        setState("results");
      }
    } catch {}
  }, []);

  const handleAnalyze = useCallback(async (portfolioUrl: string, target = "", force = false) => {
    setUrl(portfolioUrl);
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: portfolioUrl, target, force }),
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

  // Auto-launch from ?url= query param (coming from landing page)
  useEffect(() => {
    const paramUrl = searchParams.get("url");
    if (paramUrl && !autoLaunched.current && state === "input") {
      autoLaunched.current = true;
      handleAnalyze(paramUrl, "");
    }
  }, [searchParams, handleAnalyze, state]);

  function handleReset() {
    setState("input"); setError(""); setResult(null);
    try { sessionStorage.setItem("ha-reset", "1"); } catch {}
  }
  function handleForceReanalyze() { handleAnalyze(url, "", true); }
  function handleViewLastResult() {
    try {
      const saved = localStorage.getItem(LS_LAST_RESULT);
      if (saved) {
        const parsed = JSON.parse(saved);
        setResult(parsed.result);
        setUrl(parsed.url);
        setState("results");
        sessionStorage.removeItem("ha-reset");
      }
    } catch {}
  }

  const isResults = state === "results" && result;

  return (
    <div style={{
      background: "transparent",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: isResults ? "stretch" : "center",
      justifyContent: isResults ? "flex-start" : "center",
      padding: isResults ? "0" : "24px 16px",
    }}>
      {state === "input" && (
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div className="text-center mb-6">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              Audit gratuit
            </span>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Analyse ta hero section</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
              Colle l'URL de ta page. L'IA va analyser ce que ton visiteur voit dans les 5 premières secondes — et te dire ce qui le fait rester ou fuir.
            </p>
          </div>
          <div className="card">
            <EmbedInput onAnalyze={(url, target, force) => handleAnalyze(url, target, force)} history={history} limitReached={limitReached} onViewResult={handleViewLastResult} />
          </div>
        </div>
      )}
      {state === "loading" && (
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div className="card" style={{ marginBottom: "12px" }}>
            <EmbedLoading url={url} />
          </div>
          {/* Compact disabled input */}
          <div className="card p-4">
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                className="input-field text-sm"
                value={url}
                disabled
                style={{ opacity: 0.6, flex: 1, padding: "10px 14px" }}
              />
              <button
                className="btn-primary flex-shrink-0"
                disabled
                style={{ padding: "10px 20px", fontSize: "13px" }}
              >
                <span className="loading-spinner" />
                Scanning...
              </button>
            </div>
          </div>
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
      {!isResults && (
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
      )}
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense>
      <EmbedPageInner />
    </Suspense>
  );
}
