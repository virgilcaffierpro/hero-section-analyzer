"use client";

import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { ArrowRight, ExternalLink, AlertCircle } from "lucide-react";
import {
  Diamond, Lightning, Target, Globe, Camera, Star,
  ChartBar, ArrowCounterClockwise, CheckCircle,
} from "@phosphor-icons/react";
import type { AnalysisResult } from "@/lib/types";
import ResultsDashboard from "@/components/ResultsDashboard";

// ── Types ──────────────────────────────────────────────────
type AppState = "landing" | "loading" | "results" | "error";

// ── Loading steps ──────────────────────────────────────────
const LOADING_STEPS = [
  { id: 1, Icon: Globe, label: "Accès au site" },
  { id: 2, Icon: Camera, label: "Capture hero" },
  { id: 3, Icon: Diamond, label: "Prop. de valeur" },
  { id: 4, Icon: Lightning, label: "Accroche & CTA" },
  { id: 5, Icon: Star, label: "Preuve sociale" },
  { id: 6, Icon: ChartBar, label: "Finalisation" },
];
const STEP_DURATIONS = [3000, 4000, 4000, 4000, 4000, 6000];

// ── Features for landing section ──────────────────────────
const FEATURES = [
  {
    Icon: Diamond,
    title: "7 axes d'analyse",
    desc: "Proposition de valeur, accroche, CTA, preuve sociale, design, clarté, alignement cible — tout est passé au crible.",
  },
  {
    Icon: Lightning,
    title: "Audit IA sans filtre",
    desc: "L'IA analyse ce que ton visiteur voit en 5 secondes. Pas de complaisance : chaque faiblesse est identifiée.",
  },
  {
    Icon: Target,
    title: "Plan d'action concret",
    desc: "Des recommandations priorisées par impact et effort. Tu sais exactement quoi changer et dans quel ordre.",
  },
];

// ── Helpers ────────────────────────────────────────────────
const LS_LAST_RESULT = "ha-last-result";
const LS_LAST_ANALYSIS = "ha-last-analysis";

function canAnalyzeToday(): boolean {
  try {
    const last = localStorage.getItem(LS_LAST_ANALYSIS);
    if (!last) return true;
    return new Date(last).toDateString() !== new Date().toDateString();
  } catch { return true; }
}

function markAnalyzedToday(): void {
  try { localStorage.setItem(LS_LAST_ANALYSIS, new Date().toISOString()); } catch {}
}

// ── Loading component ──────────────────────────────────────
function LoadingView({ url }: { url: string }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_STEPS.forEach((_, index) => {
      timers.push(setTimeout(() => setCurrentStep(index + 1), elapsed));
      elapsed += STEP_DURATIONS[index];
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = Math.min((currentStep / LOADING_STEPS.length) * 100, 95);

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="card" style={{ width: "100%", maxWidth: 480, margin: "0 auto" }}>
          <div className="p-6">
            {/* Step icons */}
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
              {LOADING_STEPS.map((step, index) => {
                const isCompleted = index < currentStep - 1;
                const isCurrent = index === currentStep - 1;
                return (
                  <div key={step.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: "52px" }}>
                    <div className={`loading-step-circle ${isCompleted ? "completed" : isCurrent ? "active" : "pending"}`}>
                      {isCompleted ? (
                        <CheckCircle size={20} weight="fill" style={{ color: "#059669" }} />
                      ) : (
                        <step.Icon size={20} weight={isCurrent ? "fill" : "regular"} />
                      )}
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-semibold text-center" style={{ color: "var(--accent)", lineHeight: "1.2" }}>
                        {step.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="progress-bar-track" style={{ marginBottom: "12px" }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%`, background: "linear-gradient(to right, var(--accent), #A78BFA)" }} />
            </div>

            <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>~20 secondes</p>
          </div>

          {/* Disabled input showing URL */}
          <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="text" className="input-field text-sm" value={url} disabled style={{ opacity: 0.6, flex: 1, padding: "10px 14px" }} />
              <button className="btn-primary flex-shrink-0" disabled style={{ padding: "10px 20px", fontSize: "13px" }}>
                <span className="loading-spinner" />
                Scanning...
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <a href="https://www.framesacademie.com" target="_blank" rel="noopener noreferrer">
          Créé par Frames académie <ExternalLink size={12} />
        </a>
      </footer>
    </div>
  );
}

// ── Error component ────────────────────────────────────────
function ErrorView({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="card" style={{ width: "100%", maxWidth: 480, margin: "0 auto" }}>
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
        </div>
      </section>

      <footer className="landing-footer">
        <a href="https://www.framesacademie.com" target="_blank" rel="noopener noreferrer">
          Créé par Frames académie <ExternalLink size={12} />
        </a>
      </footer>
    </div>
  );
}

// ── Landing view (hero + features + CTA) ───────────────────
function LandingView({ url, setUrl, onSubmit, limitReached }: {
  url: string;
  setUrl: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  limitReached: boolean;
}) {
  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-pill">
          <Diamond size={14} weight="fill" />
          Audit Hero Section
        </div>

        <h1 className="landing-h1">
          Ta hero section vend-elle {" "}
          <span>vraiment</span> ?
        </h1>

        <p className="landing-subtitle">
          Colle ton URL. L&apos;IA analyse ce que ton visiteur voit en 5 secondes
          — et te dit ce qui le fait rester ou fuir.
        </p>

        <form onSubmit={onSubmit}>
          <div className="landing-input-row">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://monsite.com"
              autoFocus
            />
            <button type="submit" disabled={!url.trim() || limitReached}>
              Analyser
              <ArrowRight size={16} />
            </button>
          </div>
        </form>

        {limitReached && (
          <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
            Tu as déjà utilisé ton analyse gratuite aujourd&apos;hui. Reviens demain !
          </p>
        )}

        <div className="landing-trust">
          <span>Gratuit</span>
          <span className="landing-trust-dot" />
          <span>30 secondes</span>
          <span className="landing-trust-dot" />
          <span>Propulsé par l&apos;IA</span>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-feature-grid">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <feat.Icon size={22} weight="duotone" />
              </div>
              <div className="landing-feature-title">{feat.title}</div>
              <div className="landing-feature-desc">{feat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="landing-cta">
        <h2 className="landing-cta-title">
          Prêt à découvrir ce que ton visiteur<br />
          pense <span>vraiment</span> ?
        </h2>
        <button className="btn-primary" onClick={() => {
          const input = document.querySelector<HTMLInputElement>(".landing-input-row input");
          if (input) { input.focus(); input.scrollIntoView({ behavior: "smooth", block: "center" }); }
        }}>
          Analyser ma hero section
          <ArrowRight size={16} />
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <a href="https://www.framesacademie.com" target="_blank" rel="noopener noreferrer">
          Créé par Frames académie
          <ExternalLink size={12} />
        </a>
      </footer>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function HomePage() {
  const [state, setState] = useState<AppState>("landing");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const initialized = useRef(false);

  // Init: check admin + restore last result
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    fetch("/api/is-admin")
      .then((r) => r.json())
      .then((data) => {
        const admin = data?.admin === true;
        setIsAdmin(admin);
        if (!admin) setLimitReached(!canAnalyzeToday());
      })
      .catch(() => setLimitReached(!canAnalyzeToday()));

    // Restore last result if user refreshes on results
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

  const handleAnalyze = useCallback(async (portfolioUrl: string, force = false) => {
    setUrl(portfolioUrl);
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: portfolioUrl, target: "", force }),
      });
      const text = await res.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Erreur serveur inattendue. Vérifie que la clé API Anthropic est bien configurée.");
      }
      if (!res.ok) throw new Error(data.error || "Erreur serveur.");

      setResult(data);
      setState("results");

      if (!isAdmin) {
        markAnalyzedToday();
        setLimitReached(true);
      }

      try { localStorage.setItem(LS_LAST_RESULT, JSON.stringify({ result: data, url: portfolioUrl })); } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setState("error");
    }
  }, [isAdmin]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    handleAnalyze(withProtocol);
  };

  const handleReset = () => {
    setState("landing");
    setUrl("");
    setError("");
    setResult(null);
    try { sessionStorage.setItem("ha-reset", "1"); } catch {}
  };

  const handleForceReanalyze = () => {
    handleAnalyze(url, true);
  };

  // ── Render by state ─────────────────────────────────────
  if (state === "loading") {
    return <LoadingView url={url} />;
  }

  if (state === "error") {
    return <ErrorView error={error} onRetry={handleReset} />;
  }

  if (state === "results" && result) {
    return <ResultsDashboard result={result} onReanalyze={handleReset} onForceReanalyze={handleForceReanalyze} />;
  }

  return (
    <LandingView
      url={url}
      setUrl={setUrl}
      onSubmit={handleSubmit}
      limitReached={limitReached}
    />
  );
}
