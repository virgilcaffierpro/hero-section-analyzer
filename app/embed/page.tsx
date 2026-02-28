"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, AlertCircle, RefreshCw, Zap, ExternalLink } from "lucide-react";
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

function EmbedInput({ onAnalyze }: { onAnalyze: (url: string) => void }) {
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
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
          <Zap size={13} color="white" />
        </div>
        <div>
          <h2 className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>Analyse ton portfolio</h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Audit IA gratuit • 60 secondes</p>
        </div>
      </div>

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
        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={!url.trim()}>
          Analyser mon portfolio
          <ArrowRight size={15} />
        </button>
      </form>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[{ icon: "🔍", label: "7 axes" }, { icon: "⏱", label: "30–60 sec" }, { icon: "🔒", label: "Sans stockage" }].map((item, i) => (
          <div key={i} className="text-center p-2 rounded-xl" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
            <div className="text-base mb-0.5">{item.icon}</div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.label}</p>
          </div>
        ))}
      </div>
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
      const data = await res.json();
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
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      {state === "input" && (
        <div className="card m-4" style={{ maxWidth: 480, margin: "16px auto" }}>
          <EmbedInput onAnalyze={handleAnalyze} />
        </div>
      )}
      {state === "loading" && (
        <div className="card m-4" style={{ maxWidth: 480, margin: "16px auto" }}>
          <EmbedLoading url={url} />
        </div>
      )}
      {state === "results" && result && (
        <ResultsDashboard result={result} onReanalyze={handleReset} onForceReanalyze={handleForceReanalyze} />
      )}
      {state === "error" && (
        <div className="card m-4" style={{ maxWidth: 480, margin: "16px auto" }}>
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
          Propulsé par Portfolio Analyzer <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
