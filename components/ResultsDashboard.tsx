"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  Zap,
  Target,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { AnalysisResult, AxisResult, PortfolioLevel, QuickWin } from "@/lib/types";

// ============================================================
// Helpers
// ============================================================

function getLevelConfig(level: PortfolioLevel) {
  switch (level) {
    case "vitrine":
      return {
        emoji: "🔴",
        label: "Portfolio vitrine",
        description: "Beau pour les créatifs — invisible pour les décideurs",
        color: "#DC2626",
        bgClass: "bg-score-vitrine",
        pillClass: "pill pill-vitrine",
      };
    case "transition":
      return {
        emoji: "🟡",
        label: "Portfolio en transition",
        description: "Bonnes bases, mais des frictions bloquent la conversion",
        color: "#D97706",
        bgClass: "bg-score-transition",
        pillClass: "pill pill-transition",
      };
    case "vend":
      return {
        emoji: "🟢",
        label: "Portfolio qui vend",
        description: "Ton site travaille activement pour toi",
        color: "#059669",
        bgClass: "bg-score-vend",
        pillClass: "pill pill-vend",
      };
  }
}

function getScoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct < 0.4) return "#DC2626";
  if (pct < 0.7) return "#D97706";
  return "#059669";
}

// ============================================================
// Score Gauge (SVG circle)
// ============================================================

function ScoreGauge({ score, max = 100, level }: { score: number; max?: number; level: PortfolioLevel }) {
  const [displayScore, setDisplayScore] = useState(0);
  const { color } = getLevelConfig(level);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const pct = score / max;
  const offset = circumference - pct * circumference;

  useEffect(() => {
    let start: number | null = null;
    const duration = 1200;

    function step(timestamp: number) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(step);
    }

    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" className="-rotate-90">
        {/* Track */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#EDE9FE"
          strokeWidth="10"
        />
        {/* Fill */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
          {displayScore}
        </span>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          / {max}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Axis Progress Bar
// ============================================================

function AxisProgressBar({ score, max, color }: { score: number; max: number; color: string }) {
  const [width, setWidth] = useState("0%");
  const pct = (score / max) * 100;

  useEffect(() => {
    const t = setTimeout(() => setWidth(`${pct}%`), 100);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="progress-bar-track">
      <div
        className="progress-bar-fill"
        style={{ width, background: color }}
      />
    </div>
  );
}

// ============================================================
// Axis Card
// ============================================================

function AxisCard({ axis, index }: { axis: AxisResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = getScoreColor(axis.score, axis.maxScore);
  const pct = (axis.score / axis.maxScore) * 100;

  const axisIcons: Record<string, string> = {
    positioning: "💬",
    social_proof: "⭐",
    cta: "🎯",
    offer_clarity: "📋",
    ux: "🖥️",
    storytelling: "✨",
    alignment: "🎪",
  };

  return (
    <div
      className="card hover-lift cursor-pointer animate-fadeInUp"
      style={{ animationDelay: `${index * 0.08}s`, animationFillMode: "both" }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">{axisIcons[axis.id] || "📊"}</span>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                {axis.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-lg" style={{ color }}>
                  {axis.score}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  / {axis.maxScore}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: `${color}15`,
                    color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {Math.round(pct)}%
                </span>
              </div>
            </div>
          </div>
          <button
            className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}
            aria-label={expanded ? "Réduire" : "Développer"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Progress bar */}
        <AxisProgressBar score={axis.score} max={axis.maxScore} color={color} />

        {/* Expanded content */}
        {expanded && (
          <div className="mt-5 space-y-4 animate-fadeIn">
            {/* What works */}
            {axis.working.length > 0 && (
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2.5"
                  style={{ color: "#059669" }}
                >
                  Ce qui fonctionne
                </p>
                <div className="space-y-2">
                  {axis.working.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="dot-green mt-1.5" />
                      <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: "1.5" }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What blocks */}
            {axis.blocking.length > 0 && (
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2.5"
                  style={{ color: "#DC2626" }}
                >
                  Ce qui bloque
                </p>
                <div className="space-y-2">
                  {axis.blocking.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="dot-red mt-1.5" />
                      <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: "1.5" }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick action */}
            <div
              className="p-3.5 rounded-xl"
              style={{
                background: "var(--accent-light)",
                border: "1px solid var(--accent-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--accent)" }}
              >
                Action cette semaine
              </p>
              <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: "1.5" }}>
                {axis.quickAction}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Quick Win Card
// ============================================================

function QuickWinCard({ win, index }: { win: QuickWin; index: number }) {
  const effortLabel = {
    faible: "Effort faible",
    moyen: "Effort moyen",
    élevé: "Effort élevé",
  };

  const impactLabel = {
    fort: "Impact fort",
    moyen: "Impact moyen",
    faible: "Impact faible",
  };

  const priorities = ["🥇", "🥈", "🥉"];

  return (
    <div
      className="card p-5 hover-lift animate-fadeInUp"
      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "both" }}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl flex-shrink-0">{priorities[index]}</span>
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {win.title}
        </h3>
      </div>

      <p className="text-sm mb-4 ml-9" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
        {win.description}
      </p>

      <div className="flex items-center gap-2 ml-9">
        <span className={`badge badge-effort-${win.effort}`}>
          {effortLabel[win.effort]}
        </span>
        <span className={`badge badge-impact-${win.impact}`}>
          {impactLabel[win.impact]}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Action Plan
// ============================================================

function ActionPlan({ plan }: { plan: AnalysisResult["plan30Days"] }) {
  if (!plan) return null;
  const weeks = [
    {
      label: "Semaine 1",
      subtitle: "Urgences — à faire maintenant",
      items: plan.week1,
      color: "#DC2626",
      bg: "#FEF2F2",
      border: "#FECACA",
    },
    {
      label: "Semaines 2–3",
      subtitle: "Optimisations",
      items: plan.week2_3,
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
    },
    {
      label: "Semaine 4",
      subtitle: "Tests & mesures",
      items: plan.week4,
      color: "#059669",
      bg: "#ECFDF5",
      border: "#A7F3D0",
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-5">
      {weeks.map((week, i) => (
        <div
          key={i}
          className="rounded-xl p-5 animate-fadeInUp"
          style={{
            background: week.bg,
            border: `1px solid ${week.border}`,
            animationDelay: `${i * 0.1}s`,
            animationFillMode: "both",
          }}
        >
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: week.color }}>
              {week.label}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {week.subtitle}
            </p>
          </div>
          <ul className="space-y-2.5">
            {week.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2.5">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{ background: week.color }}
                />
                <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: "1.5" }}>
                  {item}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Section Header
// ============================================================

function SectionHeader({
  icon,
  title,
  subtitle,
  iconBg = "var(--accent-light)",
  iconColor = "var(--accent)",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="section-icon flex-shrink-0"
        style={{ background: iconBg, border: `1px solid ${iconColor}30` }}
      >
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main Dashboard
// ============================================================

export default function ResultsDashboard({
  result,
  onReanalyze,
  onForceReanalyze,
}: {
  result: AnalysisResult;
  onReanalyze: () => void;
  onForceReanalyze?: () => void;
}) {
  const levelConfig = getLevelConfig(result.level);
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const text = `J'ai analysé mon portfolio avec Portfolio Analyzer.\n\nScore : ${result.totalScore}/100 — ${levelConfig.label}\n\n"${result.verdict}"\n\nAnalyse ton portfolio gratuitement : ${window.location.origin}/analyze`;

    if (navigator.share) {
      navigator.share({ title: "Mon analyse de portfolio", text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  const formattedDate = new Date(result.analyzedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen pb-24" style={{ background: "transparent" }}>

      {/* Sticky header */}
      <div
        className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{
          background: "rgba(245, 243, 255, 0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button onClick={onReanalyze} className="btn-back">
          <ArrowLeft size={16} />
          Nouvelle analyse
        </button>

        <div className="flex items-center gap-2">
          {onForceReanalyze && (
            <button
              onClick={onForceReanalyze}
              className="btn-ghost text-xs px-3 py-2"
              title="Forcer une nouvelle analyse (ignore le cache)"
            >
              <RefreshCw size={12} />
              Nouvelle analyse
            </button>
          )}
          <a
            href={result.url.startsWith("http") ? result.url : `https://${result.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs px-3 py-2"
          >
            <ExternalLink size={12} />
            Voir le site
          </a>
          <button
            onClick={handleShare}
            className="btn-ghost text-xs px-3 py-2"
            style={copied ? { background: "#ECFDF5", color: "#059669", borderColor: "#A7F3D0" } : {}}
          >
            <Share2 size={12} />
            {copied ? "Copié !" : "Partager"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-10">

        {/* ================================================
            PARTIE 1 — Score global et verdict
            ================================================ */}
        <section className="mb-12 animate-fadeInUp">
          <div className="card overflow-hidden">
            {/* Top accent line */}
            <div
              className="h-1"
              style={{
                background: `linear-gradient(to right, ${levelConfig.color}, ${levelConfig.color}50, transparent)`,
              }}
            />

            <div className="p-8 md:p-10">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Score gauge */}
                <div className="flex-shrink-0 flex flex-col items-center gap-3">
                  <ScoreGauge score={result.totalScore} max={100} level={result.level} />
                  <div className={levelConfig.pillClass}>
                    {levelConfig.emoji} {levelConfig.label}
                  </div>
                  {/* Score delta vs previous analysis */}
                  {result.previousScore && (() => {
                    const delta = result.totalScore - result.previousScore.score;
                    if (delta === 0) return (
                      <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>
                        <Minus size={11} />
                        Inchangé vs analyse précédente
                      </div>
                    );
                    if (delta > 0) return (
                      <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
                        <TrendingUp size={11} />
                        +{delta} pts vs analyse précédente
                      </div>
                    );
                    return (
                      <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                        <TrendingDown size={11} />
                        {delta} pts vs analyse précédente
                      </div>
                    );
                  })()}
                  {/* From cache indicator */}
                  {result.fromCache && (
                    <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                      Résultat en cache — <button className="underline" style={{ color: "var(--accent)" }} onClick={onForceReanalyze}>nouvelle analyse</button>
                    </p>
                  )}
                </div>

                {/* Verdict */}
                <div className="flex-1 md:pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="tag">Diagnostic</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formattedDate}
                    </span>
                  </div>

                  <blockquote
                    className="text-lg md:text-xl font-medium leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    "{result.verdict}"
                  </blockquote>

                  <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                    Site analysé :{" "}
                    <a
                      href={result.url.startsWith("http") ? result.url : `https://${result.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline inline-flex items-center gap-1"
                      style={{ color: "var(--accent)" }}
                    >
                      {result.url}
                      <ExternalLink size={11} />
                    </a>
                  </p>

                  {/* Mini score breakdown */}
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {result.axes.map((axis) => {
                      const color = getScoreColor(axis.score, axis.maxScore);
                      return (
                        <div
                          key={axis.id}
                          className="p-2.5 rounded-lg text-center"
                          style={{
                            background: "var(--bg-muted)",
                            border: "1px solid var(--accent-border)",
                          }}
                        >
                          <div className="text-xl font-bold" style={{ color }}>
                            {axis.score}
                            <span className="text-sm font-normal" style={{ color: "var(--text-muted)" }}>
                              /{axis.maxScore}
                            </span>
                          </div>
                          <div
                            className="text-xs mt-0.5 leading-tight"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {axis.name.split(" ")[0]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================
            PARTIE 2 — Analyse détaillée par axe
            ================================================ */}
        <section className="mb-12">
          <SectionHeader
            icon={<Target size={16} />}
            title="Analyse détaillée"
            subtitle="Clique sur un axe pour voir le détail et les recommandations"
          />
          <div className="space-y-3">
            {result.axes.map((axis, i) => (
              <AxisCard key={axis.id} axis={axis} index={i} />
            ))}
          </div>
        </section>

        {/* ================================================
            PARTIE 3 — Quick wins
            ================================================ */}
        <section className="mb-12">
          <SectionHeader
            icon={<Zap size={16} />}
            title="3 quick wins prioritaires"
            subtitle="Les modifications à fort impact — classées par effort"
          />
          <div className="space-y-4">
            {result.quickWins.map((win, i) => (
              <QuickWinCard key={i} win={win} index={i} />
            ))}
          </div>
        </section>

        {/* ================================================
            PARTIE 4 — Plan 30 jours
            ================================================ */}
        {result.plan30Days && (
          <section className="mb-12">
            <SectionHeader
              icon={<Calendar size={16} />}
              title="Plan d'action 30 jours"
              subtitle="Roadmap claire pour transformer ton portfolio en outil de vente"
              iconBg="#ECFDF5"
              iconColor="#059669"
            />
            <ActionPlan plan={result.plan30Days} />
          </section>
        )}

        {/* ================================================
            CTA Frames Académie
            ================================================ */}
        <section className="animate-fadeInUp mb-10">
          <div
            className="rounded-2xl p-8 md:p-10"
            style={{
              background: "linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)",
            }}
          >
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
            >
              Prochaine étape
            </span>
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              Tu sais maintenant ce qui bloque tes conversions.
            </h3>
            <p className="text-base mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
              La prochaine étape, c'est de corriger tout ça — et d'apprendre à construire un site
              qui travaille pour toi. C'est exactement ce qu'on fait dans{" "}
              <strong className="text-white">Frames Académie</strong> : tu maîtrises Framer et tu
              apprends à te positionner pour attirer des clients qui paient bien.
            </p>
            <a
              href="https://framesacademie.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-full text-sm transition-all"
              style={{
                background: "white",
                color: "var(--accent)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              }}
            >
              Découvrir Frames Académie
              <ExternalLink size={15} />
            </a>
            <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Maîtriser Framer + se positionner comme expert = clients premium.
            </p>
          </div>
        </section>

        {/* Re-analyze */}
        <div className="text-center">
          <button onClick={onReanalyze} className="btn-back">
            <ArrowLeft size={15} />
            Analyser un autre portfolio
          </button>
        </div>

      </div>
    </div>
  );
}
