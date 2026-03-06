"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Diamond, Lightning, Target } from "@phosphor-icons/react";

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

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    router.push(`/embed?url=${encodeURIComponent(trimmed)}`);
  };

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

        <form onSubmit={handleSubmit}>
          <div className="landing-input-row">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://monsite.com"
              autoFocus
            />
            <button type="submit">
              Analyser
              <ArrowRight size={16} />
            </button>
          </div>
        </form>

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
