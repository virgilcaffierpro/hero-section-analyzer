import Link from "next/link";
import { ArrowRight, CheckCircle, Zap } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Colle ton URL",
    description: "L'URL de ton portfolio ou site freelance. Pas besoin de créer un compte.",
  },
  {
    number: "02",
    title: "L'IA analyse ton site",
    description: "On lit ton site avec les yeux d'un décideur qui a 30 secondes pour évaluer si tu mérites son attention.",
  },
  {
    number: "03",
    title: "Reçois ton audit complet",
    description: "Score sur 100, analyse par axe, quick wins et plan d'action 30 jours. Actionnable immédiatement.",
  },
];

const AXES = [
  { icon: "💬", label: "Message de positionnement" },
  { icon: "⭐", label: "Preuve sociale et crédibilité" },
  { icon: "🎯", label: "Appel à l'action (CTA)" },
  { icon: "📋", label: "Clarté de l'offre" },
  { icon: "🖥️", label: "Expérience utilisateur" },
  { icon: "✨", label: "Storytelling et connexion" },
  { icon: "🎪", label: "Alignement cible / message" },
];

export default function HomePage() {
  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>

      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(245, 243, 255, 0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <Zap size={15} color="white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Portfolio Analyzer
          </span>
        </div>
        <Link href="/analyze" className="btn-primary text-sm px-5 py-2.5">
          Analyser mon portfolio
          <ArrowRight size={15} />
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center max-w-3xl mx-auto">
        <div className="animate-fadeInUp">
          <span className="tag mb-6 inline-block">Audit IA • Gratuit • 60 secondes</span>
        </div>

        <h1
          className="text-5xl md:text-6xl font-bold tracking-tight mb-5 animate-fadeInUp delay-100"
          style={{ lineHeight: "1.08", color: "var(--text-primary)" }}
        >
          Ton portfolio est beau.<br />
          <span className="gradient-text">Mais est-ce qu'il vend ?</span>
        </h1>

        <p
          className="text-lg md:text-xl mb-8 animate-fadeInUp delay-200"
          style={{ color: "var(--text-secondary)", lineHeight: "1.65" }}
        >
          Analyse ton site en 60 secondes et découvre pourquoi tu perds des clients{" "}
          <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>avant même de leur parler.</strong>
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeInUp delay-300">
          <Link href="/analyze" className="btn-primary text-base px-8 py-4">
            Analyser mon portfolio — c'est gratuit
            <ArrowRight size={18} />
          </Link>
        </div>

        <p className="mt-5 text-sm animate-fadeInUp delay-400" style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text-secondary)" }}>+1 200 portfolios</strong> analysés • Aucun compte requis
        </p>
      </section>

      {/* Problem card */}
      <section className="px-6 pb-20 max-w-2xl mx-auto">
        <div className="card p-8 text-center animate-fadeInUp delay-200">
          <div className="text-4xl mb-5">😬</div>
          <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text-primary)" }}>
            Le problème que personne ne te dit
          </h2>
          <div className="space-y-3 text-left">
            {[
              "Tes amis designers adorent ton portfolio. Ton prospect idéal, lui, ne comprend pas pourquoi te choisir toi.",
              "Tu maîtrises Framer, Figma, After Effects. Mais ton site parle à des créatifs — pas à des décideurs.",
              "Résultat : tu sous-tarifes, tu prospectes trop, et les bons deals partent ailleurs.",
            ].map((text, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl text-sm"
                style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", lineHeight: "1.6" }}
              >
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>→</span>
                {text}
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="font-semibold" style={{ color: "var(--accent)" }}>
              Portfolio Analyzer lit ton site avec les yeux de ton prospect — pas ceux d'un créatif.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="py-20 px-6"
        style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="tag mb-4 inline-block">Comment ça marche</span>
            <h2 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              3 étapes. 60 secondes.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="card p-6">
                <div
                  className="text-3xl font-black mb-4"
                  style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}
                >
                  {step.number}
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
                  {step.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 axes */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="tag mb-4 inline-block">7 axes d'analyse</span>
              <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                Ce qu'on regarde,{" "}
                <span className="gradient-text">et pourquoi ça compte</span>
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", lineHeight: "1.8" }}>
                On ne note pas l'esthétique. On analyse si ton site permet à un décideur de comprendre ta valeur et de passer à l'action en moins de 30 secondes.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Score /100", "Quick wins", "Plan 30 jours"].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 text-sm" style={{ color: "#059669" }}>
                    <CheckCircle size={14} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {AXES.map((ax, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl card-flat"
                >
                  <span className="text-lg">{ax.icon}</span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {ax.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Score levels */}
      <section
        className="py-20 px-6"
        style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="tag mb-4 inline-block">Résultats de l'analyse</span>
            <h2 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              Un diagnostic honnête, pas du bullshit
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                emoji: "🔴",
                title: "Portfolio vitrine",
                range: "0 – 40 / 100",
                desc: "Beau pour les créatifs. Ton prospect ne comprend pas pourquoi te choisir.",
                pillClass: "pill-vitrine",
              },
              {
                emoji: "🟡",
                title: "Portfolio en transition",
                range: "41 – 70 / 100",
                desc: "Bonnes bases. Des frictions bloquent encore la conversion.",
                pillClass: "pill-transition",
              },
              {
                emoji: "🟢",
                title: "Portfolio qui vend",
                range: "71 – 100 / 100",
                desc: "Ton site travaille pour toi. Les prospects comprennent ta valeur.",
                pillClass: "pill-vend",
              },
            ].map((item, i) => (
              <div key={i} className="card p-6">
                <div className="text-3xl mb-3">{item.emoji}</div>
                <div className={`pill ${item.pillClass} mb-3 text-xs`}>{item.range}</div>
                <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {item.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <div
            className="rounded-2xl p-10 md:p-12"
            style={{
              background: "linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)",
            }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">
              Prêt à savoir la vérité ?
            </h2>
            <p className="text-base mb-8" style={{ color: "rgba(255,255,255,0.75)" }}>
              Autant savoir maintenant ce qui bloque tes conversions.
            </p>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-9999 text-base transition-all"
              style={{
                background: "white",
                color: "var(--accent)",
                borderRadius: "9999px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              }}
            >
              Analyser mon portfolio — c'est gratuit
              <ArrowRight size={18} />
            </Link>
            <p className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Aucun compte. Aucune CB. Résultat en 60 secondes.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Fait pour les freelances créatifs qui veulent vendre sans se brader.{" "}
          <a
            href="https://framesacademie.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--accent)" }}
          >
            Frames Académie
          </a>
        </p>
      </footer>
    </div>
  );
}
