"use client";

import { useState, useEffect } from "react";
import {
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import {
  Diamond,
  Lightning,
  Crosshair,
  Star,
  Eye,
  Microscope,
  Users,
  ChartBar,
  MapTrifold,
  MagnifyingGlass,
  Sparkle,
  Export,
  DoorOpen,
  Question,
  Target,
  ArrowCounterClockwise,
  TrendUp,
  TrendDown,
  Minus,
  Warning,
  CheckCircle,
  XCircle,
  CaretDown,
  CaretUp,
  Copy,
  LinkedinLogo,
  Lightbulb,
} from "@phosphor-icons/react";
import type { AnalysisResult, AxisResult, HeroLevel, QuickWin, HeroRewrite } from "@/lib/types";

// ============================================================
// Constants
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AXIS_ICONS: Record<string, any> = {
  value_prop: Diamond,
  hook: Lightning,
  hero_cta: Crosshair,
  social_proof: Star,
  visual_hierarchy: Eye,
  specificity: Microscope,
  target_alignment: Users,
};

const SHORT_NAMES: Record<string, string> = {
  value_prop: "Prop. de valeur",
  hook: "Accroche",
  hero_cta: "CTA",
  social_proof: "Preuve sociale",
  visual_hierarchy: "Hiérarchie",
  specificity: "Spécificité",
  target_alignment: "Cible",
};

// ============================================================
// Helpers
// ============================================================

function getLevelConfig(level: HeroLevel) {
  switch (level) {
    case "fuite":
      return {
        Icon: DoorOpen,
        label: "Hero qui fait fuir",
        description: "Le visiteur ne comprend pas ou n'est pas convaincu — il part",
        color: "#DC2626",
        bg: "#FEF2F2",
        border: "#FECACA",
        pillClass: "pill-fuite",
      };
    case "confuse":
      return {
        Icon: Question,
        label: "Hero confuse",
        description: "Le visiteur hésite — message flou, pas assez convaincant",
        color: "#D97706",
        bg: "#FFFBEB",
        border: "#FDE68A",
        pillClass: "pill-confuse",
      };
    case "convainc":
      return {
        Icon: Target,
        label: "Hero qui convainc",
        description: "Le visiteur reste — proposition claire, accroche forte",
        color: "#059669",
        bg: "#ECFDF5",
        border: "#A7F3D0",
        pillClass: "pill-convainc",
      };
  }
}

function getScoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct < 0.4) return "#DC2626";
  if (pct < 0.7) return "#D97706";
  return "#059669";
}

function getScoreBg(score: number, max: number): string {
  const pct = score / max;
  if (pct < 0.4) return "#FEF2F2";
  if (pct < 0.7) return "#FFFBEB";
  return "#ECFDF5";
}

function computePercentile(score: number): number {
  if (score >= 95) return 3;
  if (score >= 85) return 10;
  if (score >= 75) return 20;
  if (score >= 65) return 35;
  if (score >= 55) return 50;
  if (score >= 45) return 65;
  if (score >= 35) return 80;
  return 95;
}

function getStatusConfig(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct < 40)
    return { label: "À renforcer", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" };
  if (pct < 70)
    return { label: "Correct", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
  return { label: "Bon", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" };
}

// ============================================================
// Score Card — CopyScore style
// ============================================================

function ScoreCard({
  result,
  levelConfig,
  formattedDate,
  onForceReanalyze,
}: {
  result: AnalysisResult;
  levelConfig: ReturnType<typeof getLevelConfig>;
  formattedDate: string;
  onForceReanalyze?: () => void;
}) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const duration = 1200;
    function step(timestamp: number) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * result.totalScore));
      if (progress < 1) requestAnimationFrame(step);
    }
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [result.totalScore]);

  const percentile = computePercentile(result.totalScore);
  const LevelIcon = levelConfig.Icon;

  const hasDelta = result.previousScore && typeof result.previousScore.score === "number";
  const delta = hasDelta ? result.totalScore - result.previousScore!.score : 0;

  return (
    <div className="cs-card cs-card-score animate-fadeInUp">
      {/* Score row */}
      <div className="cs-score-row">
        <div
          className="cs-score-box"
          style={{ background: levelConfig.bg, borderColor: levelConfig.border }}
        >
          <span className="cs-score-number" style={{ color: levelConfig.color }}>
            {displayScore}
          </span>
          <span className="cs-score-max">/100</span>
        </div>

        <div className="cs-score-info">
          <div className="cs-score-title">Score Hero</div>
          <div
            className={`cs-pill ${levelConfig.pillClass}`}
          >
            <LevelIcon size={14} weight="bold" /> {levelConfig.label}
          </div>
          <div className="cs-score-percentile">
            Top {percentile}% des hero sections analysées
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="cs-progress-track">
        <div
          className="cs-progress-fill"
          style={{ width: `${result.totalScore}%`, background: levelConfig.color }}
        />
      </div>

      {/* Benchmarks */}
      <div className="cs-benchmarks">
        <span>Moyenne marché : <strong>55</strong></span>
        <span>Top 10% : <strong style={{ color: "#059669" }}>85+</strong></span>
      </div>

      {/* Divider */}
      <div className="cs-divider" />

      {/* Verdict */}
      <div
        className="cs-verdict"
        style={{ borderLeftColor: levelConfig.color }}
      >
        {result.verdict}
      </div>

      {/* Meta */}
      <div className="cs-meta">
        <span className="cs-meta-date">{formattedDate}</span>

        {hasDelta && delta !== 0 && (
          <span
            className="cs-delta"
            style={{
              color: delta > 0 ? "#059669" : "#DC2626",
              background: delta > 0 ? "#ECFDF5" : "#FEF2F2",
              borderColor: delta > 0 ? "#A7F3D0" : "#FECACA",
            }}
          >
            {delta > 0 ? <TrendUp size={11} /> : <TrendDown size={11} />}
            {delta > 0 ? "+" : ""}{delta} pts
          </span>
        )}

        {hasDelta && delta === 0 && (
          <span className="cs-delta" style={{ color: "#6B7280", background: "#F3F4F6", borderColor: "#E5E7EB" }}>
            <Minus size={11} /> Inchangé
          </span>
        )}

        {result.fromCache && (
          <span className="cs-cache-notice">
            Résultat en cache —{" "}
            <button onClick={onForceReanalyze}>
              nouvelle analyse
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Diagnostic Overview — CopyScore horizontal bar chart
// ============================================================

function DiagnosticOverview({ axes }: { axes: AxisResult[] }) {
  return (
    <div className="cs-card animate-fadeInUp delay-100">
      <div className="cs-section-header">
        <span className="cs-section-icon"><ChartBar size={20} weight="duotone" /></span>
        <div>
          <h2 className="cs-section-title">Diagnostic hero</h2>
          <p className="cs-section-subtitle">Vue d'ensemble des 7 axes analysés</p>
        </div>
      </div>

      <div className="cs-divider" />

      <div className="cs-bar-chart">
        {axes.map((axis) => {
          const color = getScoreColor(axis.score, axis.maxScore);
          const pct = (axis.score / axis.maxScore) * 100;
          const IconComponent = AXIS_ICONS[axis.id] || ChartBar;
          const shortName = SHORT_NAMES[axis.id] || axis.name;

          return (
            <div key={axis.id} className="cs-bar-row">
              <div className="cs-bar-label">
                <IconComponent size={14} weight="bold" style={{ color, flexShrink: 0 }} />
                <span>{shortName}</span>
              </div>
              <div className="cs-bar-track">
                <div
                  className="cs-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <div className="cs-bar-value" style={{ color }}>
                <strong>{axis.score}</strong>
                <span>/{axis.maxScore}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Axis Card — CopyScore criteria style
// ============================================================

function AxisCard({
  axis,
  index,
  warning,
}: {
  axis: AxisResult;
  index: number;
  warning?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = getScoreColor(axis.score, axis.maxScore);
  const bg = getScoreBg(axis.score, axis.maxScore);
  const status = getStatusConfig(axis.score, axis.maxScore);
  const IconComponent = AXIS_ICONS[axis.id] || ChartBar;

  return (
    <div
      className={`cs-card cs-axis-card ${expanded ? "cs-axis-expanded" : ""} animate-fadeInUp`}
      style={{ animationDelay: `${index * 0.06}s`, animationFillMode: "both" }}
    >
      {/* Header */}
      <div className="cs-axis-header" onClick={() => setExpanded(!expanded)}>
        <div
          className="cs-axis-score"
          style={{ color, background: bg, borderColor: `${color}40` }}
        >
          <span className="cs-axis-score-num">{axis.score}</span>
          <span className="cs-axis-score-max">/{axis.maxScore}</span>
        </div>

        <div className="cs-axis-info">
          <div className="cs-axis-name">
            <IconComponent size={15} weight="bold" style={{ color }} />
            {axis.name}
            {warning && !expanded && (
              <Warning size={13} style={{ color: "#D97706" }} />
            )}
          </div>
        </div>

        <span
          className="cs-status-pill"
          style={{ color: status.color, background: status.bg, borderColor: status.border }}
        >
          {status.label}
        </span>

        <button
          className="cs-chevron"
          aria-label={expanded ? "Réduire" : "Développer"}
        >
          {expanded ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="cs-axis-body">
          {/* Warning */}
          {warning && (
            <div className="cs-warning-box">
              <Warning size={15} style={{ color: "#D97706", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="cs-warning-title">Données non détectées dans la hero</div>
                <div className="cs-warning-text">{warning}</div>
              </div>
            </div>
          )}

          {/* What works */}
          {axis.working.length > 0 && (
            <div className="cs-detail-block">
              <div className="cs-detail-label" style={{ color: "#059669" }}>Ce qui fonctionne</div>
              {axis.working.map((item, i) => (
                <div key={i} className="cs-detail-item">
                  <CheckCircle size={14} weight="fill" style={{ color: "#059669", flexShrink: 0, marginTop: 2 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* What blocks */}
          {axis.blocking.length > 0 && (
            <div className="cs-detail-block">
              <div className="cs-detail-label" style={{ color: "#DC2626" }}>Ce qui bloque</div>
              {axis.blocking.map((item, i) => (
                <div key={i} className="cs-detail-item">
                  <XCircle size={14} weight="fill" style={{ color: "#DC2626", flexShrink: 0, marginTop: 2 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className="cs-reco-box">
            <div className="cs-reco-label">Recommandation</div>
            <div className="cs-reco-text">{axis.quickAction}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Action Plan — CopyScore checklist
// ============================================================

function ActionPlan({ quickWins }: { quickWins: QuickWin[] }) {
  const [checked, setChecked] = useState<boolean[]>(
    new Array(quickWins.length).fill(false)
  );
  const completedCount = checked.filter(Boolean).length;

  function toggle(index: number) {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  const impactPts: Record<string, string> = {
    fort: "+8 pts",
    moyen: "+5 pts",
    faible: "+2 pts",
  };

  const effortText: Record<string, string> = {
    faible: "Rapide",
    moyen: "Modéré",
    "élevé": "Complexe",
  };

  return (
    <div className="cs-card animate-fadeInUp" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
      <div className="cs-section-header">
        <span className="cs-section-icon"><Lightning size={20} weight="fill" /></span>
        <div>
          <h2 className="cs-section-title">Plan d&apos;action par impact</h2>
          <p className="cs-section-subtitle">Modifications à fort impact — classées par priorité</p>
        </div>
      </div>

      {/* Progress header */}
      <div className="cs-action-progress">
        <span>Progression</span>
        <strong>{completedCount}/{quickWins.length}</strong>
      </div>
      <div className="cs-action-progress-bar">
        <div
          style={{
            width: `${quickWins.length > 0 ? (completedCount / quickWins.length) * 100 : 0}%`,
            height: "100%",
            background: "var(--accent)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Items */}
      {quickWins.map((win, index) => (
        <div
          key={index}
          className={`cs-action-item ${checked[index] ? "cs-action-checked" : ""}`}
          onClick={() => toggle(index)}
        >
          <div
            className="cs-action-checkbox"
            style={{
              borderColor: checked[index] ? "var(--accent)" : "#D1D5DB",
              background: checked[index] ? "var(--accent)" : "transparent",
            }}
          >
            {checked[index] && (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 8l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <div className="cs-action-content">
            <div className={`cs-action-title ${checked[index] ? "cs-action-done" : ""}`}>
              {win.title}
            </div>
            <div className="cs-action-desc">{win.description}</div>
          </div>

          <span className="cs-action-effort">
            {effortText[win.effort] || win.effort}
          </span>

          <span className="cs-action-impact">
            {impactPts[win.impact] || win.impact}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Heatmap des axes — grid cards
// ============================================================

function HeatmapGrid({ axes }: { axes: AxisResult[] }) {
  return (
    <div className="cs-card animate-fadeInUp" style={{ animationDelay: "0.12s", animationFillMode: "both" }}>
      <div className="cs-section-header">
        <span className="cs-section-icon"><MapTrifold size={20} weight="duotone" /></span>
        <div>
          <h2 className="cs-section-title">Heatmap des axes</h2>
          <p className="cs-section-subtitle">Vue rapide des forces et faiblesses</p>
        </div>
      </div>

      <div className="cs-heatmap-grid">
        {axes.map((axis) => {
          const pct = (axis.score / axis.maxScore) * 100;
          const color = getScoreColor(axis.score, axis.maxScore);
          const status = getStatusConfig(axis.score, axis.maxScore);
          const IconComponent = AXIS_ICONS[axis.id] || ChartBar;
          const shortName = SHORT_NAMES[axis.id] || axis.name;

          return (
            <div key={axis.id} className="cs-heatmap-card" style={{ borderColor: `${color}30` }}>
              <div className="cs-heatmap-header">
                <span className="cs-heatmap-name">
                  <IconComponent size={14} weight="bold" style={{ color }} />
                  {shortName}
                </span>
                {pct < 70 && (
                  <span className="cs-heatmap-badge" style={{ color: status.color, background: status.bg, borderColor: status.border }}>
                    {status.label.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="cs-heatmap-score" style={{ color }}>
                {axis.score}
                <span className="cs-heatmap-max">/{axis.maxScore}</span>
              </div>
              <div className="cs-heatmap-bar-track">
                <div
                  className="cs-heatmap-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Avant / Après — Section Hero
// ============================================================

function BeforeAfter({
  heroOriginal,
  heroRewrite,
}: {
  heroOriginal?: { headline: string; subheadline: string };
  heroRewrite?: HeroRewrite;
}) {
  if (!heroRewrite || !heroOriginal) return null;
  if (!heroOriginal.headline && !heroOriginal.subheadline) return null;

  return (
    <div className="cs-card animate-fadeInUp" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
      <div className="cs-section-header">
        <span className="cs-section-icon"><Sparkle size={20} weight="fill" /></span>
        <div>
          <h2 className="cs-section-title">Avant / Après — Section Hero</h2>
          <p className="cs-section-subtitle">Suggestion de réécriture pour améliorer l&apos;impact</p>
        </div>
      </div>

      <div className="cs-divider" />

      <div className="cs-ba-grid">
        {/* AVANT */}
        <div className="cs-ba-col cs-ba-avant">
          <div className="cs-ba-label">AVANT</div>
          <div className="cs-ba-headline">{heroOriginal.headline || "—"}</div>
          {heroOriginal.subheadline && (
            <div className="cs-ba-sub">{heroOriginal.subheadline}</div>
          )}
        </div>

        {/* APRÈS */}
        <div className="cs-ba-col cs-ba-apres">
          <div className="cs-ba-label cs-ba-label-green">APRÈS</div>
          <div className="cs-ba-headline">{heroRewrite.headline}</div>
          {heroRewrite.subheadline && (
            <div className="cs-ba-sub">{heroRewrite.subheadline}</div>
          )}
        </div>
      </div>

      {/* Rationale */}
      {heroRewrite.rationale && (
        <div className="cs-ba-rationale">
          <CheckCircle size={14} weight="fill" style={{ color: "#059669", flexShrink: 0, marginTop: 2 }} />
          <span>{heroRewrite.rationale}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Partagez votre résultat
// ============================================================

function ShareResult({
  result,
  levelConfig,
  onForceReanalyze,
}: {
  result: AnalysisResult;
  levelConfig: ReturnType<typeof getLevelConfig>;
  onForceReanalyze?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = `Mon Score Hero : ${result.totalScore}/100 — ${levelConfig.label}\n${result.url}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleLinkedIn() {
    const emoji = result.totalScore >= 70 ? "🟢" : result.totalScore >= 40 ? "🟠" : "🔴";
    const post = `${emoji} J'ai fait auditer ma hero section par une IA.\n\nRésultat : ${result.totalScore}/100 — "${levelConfig.label}"\n\nL'outil analyse 7 axes en 30 secondes :\n→ Proposition de valeur\n→ Accroche & hook\n→ CTA\n→ Preuve sociale\n→ Hiérarchie visuelle\n→ Spécificité\n→ Alignement cible\n\nC'est gratuit, testez votre page ici 👇\nhttps://hungry-swanson.vercel.app`;
    const encoded = encodeURIComponent(post);
    window.open(
      `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`,
      "_blank",
      "width=600,height=600"
    );
  }

  // Estimate potential score
  const potentialGain = Math.max(35, Math.round((100 - result.totalScore) * 0.7));
  const potentialScore = Math.min(result.totalScore + potentialGain, 97);

  return (
    <div className="cs-card animate-fadeInUp" style={{ animationDelay: "0.35s", animationFillMode: "both" }}>
      <div className="cs-section-header">
        <span className="cs-section-icon"><Export size={20} weight="bold" /></span>
        <div>
          <h2 className="cs-section-title">Partagez votre résultat</h2>
          <p className="cs-section-subtitle">Montrez votre score et challengez vos pairs</p>
        </div>
      </div>

      <div className="cs-divider" />

      {/* Score display */}
      <div className="cs-share-score-block">
        <div className="cs-share-label">Mon Score Hero</div>
        <div className="cs-share-number" style={{ color: levelConfig.color }}>
          {result.totalScore}
        </div>
        <div className="cs-share-percentile">
          Top <strong>{computePercentile(result.totalScore)}%</strong> des landing pages
        </div>
      </div>

      {/* Share buttons */}
      <div className="cs-share-buttons">
        <button className="cs-share-btn cs-share-copy" onClick={handleCopy}>
          <Copy size={16} weight="bold" />
          {copied ? "Copié !" : "Copier"}
        </button>
        <button className="cs-share-btn cs-share-linkedin" onClick={handleLinkedIn}>
          <LinkedinLogo size={16} weight="bold" />
          LinkedIn
        </button>
      </div>

      <div className="cs-divider" />

      {/* Potential CTA */}
      <div className="cs-share-potential">
        <p className="cs-share-potential-text">
          En appliquant ces actions, votre score peut passer à <strong style={{ color: "#059669" }}>{potentialScore}</strong> — dans le top 5% des hero sections.
        </p>
        <p className="cs-share-potential-sub">
          Appliquez les actions prioritaires ci-dessus puis relancez l&apos;analyse pour mesurer vos progrès.
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

  const formattedDate = new Date(result.analyzedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="cs-dashboard">
      {/* Sticky header */}
      <div className="cs-sticky-header">
        <div className="cs-header-inner">
          <div className="cs-header-url">
            <ExternalLink size={12} />
            <a
              href={result.url.startsWith("http") ? result.url : `https://${result.url}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {result.url}
            </a>
          </div>
          <div className="cs-header-actions">
            {onForceReanalyze && (
              <button onClick={onForceReanalyze} className="cs-btn-ghost">
                <ArrowCounterClockwise size={12} weight="bold" /> Ré-analyser
              </button>
            )}
            <button onClick={onReanalyze} className="cs-btn-primary">
              Nouvelle URL
            </button>
          </div>
        </div>
      </div>

      <div className="cs-content">
        {/* 1. Score */}
        <ScoreCard
          result={result}
          levelConfig={levelConfig}
          formattedDate={formattedDate}
          onForceReanalyze={onForceReanalyze}
        />

        {/* 2. Diagnostic bar chart */}
        <DiagnosticOverview axes={result.axes} />

        {/* 2b. Heatmap grid */}
        <HeatmapGrid axes={result.axes} />

        {/* 3. Criteria */}
        <div className="cs-card animate-fadeInUp delay-200" style={{ padding: 0 }}>
          <div className="cs-section-header" style={{ padding: "20px 24px 16px" }}>
            <span className="cs-section-icon"><MagnifyingGlass size={20} weight="bold" /></span>
            <div>
              <h2 className="cs-section-title">Critères analysés</h2>
              <p className="cs-section-subtitle">Clique sur un axe pour voir le détail</p>
            </div>
          </div>
          <div>
            {result.axes.map((axis, i) => (
              <AxisCard
                key={axis.id}
                axis={axis}
                index={i}
                warning={result.scrapingWarnings?.[axis.id]}
              />
            ))}
          </div>
        </div>

        {/* 4. Action plan */}
        <ActionPlan quickWins={result.quickWins} />

        {/* 4b. Avant / Après */}
        <BeforeAfter
          heroOriginal={result.heroOriginal}
          heroRewrite={result.heroRewrite}
        />

        {/* 4c. Partagez votre résultat */}
        <ShareResult
          result={result}
          levelConfig={levelConfig}
          onForceReanalyze={onForceReanalyze}
        />

        {/* 5. CTA */}
        <div className="cs-cta animate-fadeInUp">
          <span className="cs-cta-badge">Prochaine étape</span>
          <h3 className="cs-cta-title">
            Tu sais maintenant ce qui fait fuir tes visiteurs.
          </h3>
          <p className="cs-cta-text">
            La prochaine étape, c&apos;est de transformer ta hero section en machine à
            capter l&apos;attention. C&apos;est exactement ce qu&apos;on fait dans{" "}
            <strong>Frames Académie</strong> : tu maîtrises
            Framer et tu apprends à construire des pages qui convertissent.
          </p>
          <a
            href="https://framesacademie.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="cs-cta-btn"
          >
            Découvrir Frames Académie
            <ExternalLink size={15} />
          </a>
          <p className="cs-cta-sub">
            Maîtriser Framer + se positionner comme expert = clients premium.
          </p>
        </div>

        {/* 6. Back */}
        <div style={{ textAlign: "center", paddingBottom: "48px" }}>
          <button onClick={onReanalyze} className="cs-btn-back">
            <ArrowLeft size={15} />
            Analyser une autre page
          </button>
        </div>
      </div>
    </div>
  );
}
