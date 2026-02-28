"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Zap, AlertCircle, RefreshCw, ExternalLink, Clock } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import type { HistoryEntry } from "@/lib/cache";
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

function LoadingScreen({ url }: { url: string }) {
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

  const progress = Math.min(((currentStep - 1) / LOADING_STEPS.length) * 100, 95);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: "var(--bg-page)" }}>
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-5"
              style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", animation: "loadingBounce 1.4s ease-in-out infinite" }} />
              Analyse en cours
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>On regarde ton site…</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "monospace", wordBreak: "break-all" }}>{url}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              <span>Progression</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%`, background: "linear-gradient(to right, var(--accent), #A78BFA)" }} />
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {LOADING_STEPS.map((step, index) => {
              const isCompleted = index < currentStep - 1;
              const isCurrent = index === currentStep - 1;
              const isPending = index >= currentStep;
              return (
                <div
                  key={step.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300"
                  style={{ background: isCurrent ? "var(--accent-light)" : isCompleted ? "#F0FDF4" : "transparent", opacity: isPending ? 0.35 : 1 }}
                >
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {isCompleted ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="8" fill="#10B981" />
                        <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : isCurrent ? (
                      <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                    ) : (
                      <div className="w-4 h-4 rounded-full" style={{ border: "1.5px solid var(--border)" }} />
                    )}
                  </div>
                  <span className="text-sm" style={{ color: isCurrent ? "var(--accent)" : isCompleted ? "#059669" : "var(--text-muted)", fontWeight: isCurrent ? 600 : 400 }}>
                    {step.label}
                  </span>
                  {isCurrent && (
                    <div className="ml-auto flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="loading-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)", animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs italic" style={{ color: "var(--text-muted)" }}>
            "On analyse avec les yeux de ton prospect, pas d'un créatif."
          </p>
        </div>
      </div>
    </div>
  );
}

// ── History Panel ──────────────────────────────────────────────

function HistoryPanel({ onReanalyze }: { onReanalyze: (url: string, force: boolean) => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data: HistoryEntry[]) => {
        // Keep latest entry per normalizedUrl
        const seen = new Set<string>();
        const deduped = data.filter((e) => {
          if (seen.has(e.normalizedUrl)) return false;
          seen.add(e.normalizedUrl);
          return true;
        });
        setHistory(deduped.slice(0, 5));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || history.length === 0) return null;

  const levelColor = (level: string) => {
    if (level === "vend") return "#059669";
    if (level === "transition") return "#D97706";
    return "#DC2626";
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={13} style={{ color: "var(--text-muted)" }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Analyses récentes
        </span>
      </div>
      <div className="space-y-2">
        {history.map((entry, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover-lift"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            onClick={() => onReanalyze(entry.url, false)}
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
              <button
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}
                onClick={(e) => { e.stopPropagation(); onReanalyze(entry.url, true); }}
                title="Forcer une nouvelle analyse"
              >
                <RefreshCw size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Input Form ─────────────────────────────────────────────────

function InputForm({ onAnalyze }: { onAnalyze: (url: string, force?: boolean) => void }) {
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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
      <div className="px-6 py-4 flex items-center" style={{ borderBottom: "1px solid var(--border)", background: "rgba(245,243,255,0.9)", backdropFilter: "blur(16px)" }}>
        <Link href="/" className="btn-back">
          <ArrowLeft size={16} />
          Retour
        </Link>
        <div className="mx-auto flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <Zap size={13} color="white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Portfolio Analyzer</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <span className="tag mb-4 inline-block">Audit gratuit</span>
            <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Analyse ton portfolio</h1>
            <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
              Colle l'URL de ton site. L'IA va analyser ton message, tes CTAs, ta preuve sociale — et te dire ce qui bloque tes conversions.
            </p>
          </div>

          <div className="card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  URL de ton portfolio
                </label>
                <input
                  id="url"
                  type="text"
                  className="input-field"
                  placeholder="https://monportfolio.com"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
                  autoFocus
                  autoComplete="url"
                />
                {error && (
                  <p className="mt-2 text-sm flex items-center gap-1.5" style={{ color: "#DC2626" }}>
                    <AlertCircle size={14} />
                    {error}
                  </p>
                )}
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3.5" disabled={!url.trim()}>
                Analyser mon portfolio
                <ArrowRight size={17} />
              </button>
            </form>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { icon: "🔍", label: "7 axes analysés" },
              { icon: "⏱", label: "30–60 secondes" },
              { icon: "🔒", label: "Résultats mémorisés" },
            ].map((item, i) => (
              <div key={i} className="text-center p-3 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="text-xl mb-1">{item.icon}</div>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{item.label}</p>
              </div>
            ))}
          </div>

          <HistoryPanel onReanalyze={onAnalyze} />

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Tu n'as pas encore de site ?{" "}
              <a href="https://framesacademie.fr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline" style={{ color: "var(--accent)" }}>
                Découvre Frames Académie <ExternalLink size={11} />
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Error Screen ───────────────────────────────────────────────

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: "var(--bg-page)" }}>
      <div className="w-full max-w-lg">
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <AlertCircle size={26} color="#DC2626" />
          </div>
          <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>L'analyse a rencontré un problème</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>{error}</p>
          <div className="p-4 rounded-xl mb-6 text-left" style={{ background: "var(--bg-muted)", border: "1px solid var(--accent-border)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--accent)" }}>Causes fréquentes</p>
            <ul className="space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              <li>• Le site bloque les robots (Cloudflare, etc.)</li>
              <li>• Le site est 100% JavaScript (Framer, Webflow SPA)</li>
              <li>• L'URL est incorrecte ou le site est hors ligne</li>
              <li>• Clé API Anthropic manquante dans .env.local</li>
            </ul>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={onRetry} className="btn-primary">
              <RefreshCw size={15} />
              Réessayer
            </button>
            <Link href="/" className="btn-ghost">
              <ArrowLeft size={15} />
              Retour
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function AnalyzePage() {
  const [state, setState] = useState<AppState>("input");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

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
      let data: { error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Erreur serveur inattendue. Vérifie que la clé API Anthropic est bien configurée dans les variables d'environnement Vercel.");
      }
      if (!res.ok) throw new Error(data.error || "Erreur serveur.");
      setResult(data);
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setState("error");
    }
  }, []);

  function handleReset() { setState("input"); setError(""); setResult(null); }
  function handleForceReanalyze() { handleAnalyze(url, true); }

  return (
    <>
      {state === "input"   && <InputForm onAnalyze={handleAnalyze} />}
      {state === "loading" && <LoadingScreen url={url} />}
      {state === "results" && result && (
        <ResultsDashboard result={result} onReanalyze={handleReset} onForceReanalyze={handleForceReanalyze} />
      )}
      {state === "error"   && <ErrorScreen error={error} onRetry={handleReset} />}
    </>
  );
}
