import Anthropic from "@anthropic-ai/sdk";
import type { ScrapedContent, AnalysisResult } from "./types";

function buildContentSummary(url: string, content: ScrapedContent): string {
  return `
URL analysée : ${url}

=== ÉLÉMENTS CLÉS DÉTECTÉS ===
Titre de la page : ${content.title || "Non détecté"}
Meta description : ${content.metaDescription || "Absente"}
H1 (titres principaux) : ${content.h1.length > 0 ? content.h1.join(" | ") : "Aucun"}
H2 (sous-titres) : ${content.h2.length > 0 ? content.h2.slice(0, 6).join(" | ") : "Aucun"}
Navigation : ${content.navigationItems.length > 0 ? content.navigationItems.join(", ") : "Non détectée"}
CTAs détectés : ${content.ctaTexts.length > 0 ? content.ctaTexts.join(" | ") : "Aucun"}
Formulaire de contact : ${content.hasContactForm ? "Oui" : "Non"}
Témoignages : ${content.hasTestimonials ? `Oui (${content.testimonials.length} détecté(s))` : "Aucun"}
Projets/Études de cas : ${content.hasCaseStudies ? "Présents" : "Non détectés"}

=== CONTENU DES TÉMOIGNAGES ===
${content.testimonials.length > 0 ? content.testimonials.slice(0, 3).join("\n---\n") : "Aucun témoignage trouvé"}

=== SECTION SERVICES/OFFRE ===
${content.servicesText || "Aucune section services/offre clairement identifiable"}

=== SECTION À PROPOS ===
${content.aboutText || "Aucune section à propos clairement identifiable"}

=== TEXTE PRINCIPAL DU SITE ===
${content.bodyText || "Contenu non extractible (site probablement en JavaScript pur)"}
`.trim();
}

function buildPrompt(url: string, content: ScrapedContent): string {
  const contentSummary = buildContentSummary(url, content);

  return `Tu es un expert reconnu en conversion web, positionnement freelance et copywriting orienté résultats. Tu as analysé des centaines de portfolios de freelances créatifs et tu sais exactement ce qui fait qu'un site génère des clients premium ou fait fuir les prospects.

Tu vas analyser ce portfolio de freelance créatif et produire un audit complet, honnête et actionnable.

CONTENU DU SITE À ANALYSER :
${contentSummary}

${content.error ? `⚠️ NOTE : Le scraping a rencontré des limitations (${content.error}). Base ton analyse sur les données disponibles et indique-le dans le verdict.` : ""}

RÈGLES D'ANALYSE ABSOLUES :
1. Analyse avec les yeux d'un directeur marketing ou fondateur de startup, PAS d'un créatif
2. Ce qui compte : est-ce que ce site aide à closer des clients qui paient bien ?
3. L'esthétique n'est PAS un critère (sauf si elle nuit à la lisibilité)
4. Sois direct, honnête, bienveillant — jamais condescendant
5. Utilise "tu" — parle au freelance comme un mentor le ferait
6. Donne des exemples concrets dans tes feedbacks quand possible
7. Si les données sont insuffisantes pour un axe, indique-le et note de façon conservatrice

SCORES ET PONDÉRATIONS :
- Message de positionnement : /20
- Preuve sociale et crédibilité : /20
- Appel à l'action (CTA) : /15
- Clarté de l'offre : /15
- Expérience utilisateur : /10
- Storytelling et connexion émotionnelle : /10
- Alignement cible / message : /10
Total : /100

NIVEAUX :
- "vitrine" : 0-40 (portfolio beau pour les créatifs, invisible pour les décideurs)
- "transition" : 41-70 (bonnes bases mais pas encore optimisé pour convertir)
- "vend" : 71-100 (site qui travaille activement à attirer et convaincre des clients)

Retourne UNIQUEMENT un objet JSON valide (sans markdown, sans backticks, sans commentaires) :

{
  "totalScore": <nombre entier 0-100>,
  "level": "<vitrine|transition|vend>",
  "verdict": "<2-3 phrases percutantes et honnêtes qui résument le diagnostic. Commence par le constat principal, puis l'impact sur le business, puis l'espoir. Ex: 'Ton site ressemble à un book de fin d'études, pas à l'outil commercial d'un expert. Résultat : tes prospects ne comprennent pas pourquoi te payer toi plutôt qu'une agence moins chère. La bonne nouvelle : quelques changements ciblés peuvent transformer ça radicalement.'>",
  "axes": [
    {
      "id": "positioning",
      "name": "Message de positionnement",
      "score": <0-20>,
      "maxScore": 20,
      "working": ["<point positif 1 — sois précis et factuel>", "<point positif 2 optionnel>"],
      "blocking": ["<point bloquant 1 avec exemple concret>", "<point bloquant 2>", "<point bloquant 3 optionnel>"],
      "quickAction": "<1 action ultra-concrète à faire cette semaine — commence par un verbe d'action>"
    },
    {
      "id": "social_proof",
      "name": "Preuve sociale et crédibilité",
      "score": <0-20>,
      "maxScore": 20,
      "working": ["<point positif 1>"],
      "blocking": ["<point bloquant 1>", "<point bloquant 2>"],
      "quickAction": "<1 action concrète>"
    },
    {
      "id": "cta",
      "name": "Appel à l'action (CTA)",
      "score": <0-15>,
      "maxScore": 15,
      "working": ["<point positif 1>"],
      "blocking": ["<point bloquant 1>", "<point bloquant 2>"],
      "quickAction": "<1 action concrète>"
    },
    {
      "id": "offer_clarity",
      "name": "Clarté de l'offre",
      "score": <0-15>,
      "maxScore": 15,
      "working": ["<point positif 1>"],
      "blocking": ["<point bloquant 1>", "<point bloquant 2>"],
      "quickAction": "<1 action concrète>"
    },
    {
      "id": "ux",
      "name": "Expérience utilisateur",
      "score": <0-10>,
      "maxScore": 10,
      "working": ["<point positif 1>"],
      "blocking": ["<point bloquant 1>"],
      "quickAction": "<1 action concrète>"
    },
    {
      "id": "storytelling",
      "name": "Storytelling et connexion émotionnelle",
      "score": <0-10>,
      "maxScore": 10,
      "working": ["<point positif 1>"],
      "blocking": ["<point bloquant 1>"],
      "quickAction": "<1 action concrète>"
    },
    {
      "id": "alignment",
      "name": "Alignement cible / message",
      "score": <0-10>,
      "maxScore": 10,
      "working": ["<point positif 1>"],
      "blocking": ["<point bloquant 1>"],
      "quickAction": "<1 action concrète>"
    }
  ],
  "quickWins": [
    {
      "title": "<titre court et percutant>",
      "description": "<description actionnable en 2-3 phrases — dis exactement QUOI faire et POURQUOI ça va marcher>",
      "effort": "<faible|moyen|élevé>",
      "impact": "<fort|moyen|faible>"
    },
    {
      "title": "<titre>",
      "description": "<description>",
      "effort": "<faible|moyen|élevé>",
      "impact": "<fort|moyen|faible>"
    },
    {
      "title": "<titre>",
      "description": "<description>",
      "effort": "<faible|moyen|élevé>",
      "impact": "<fort|moyen|faible>"
    }
  ],
  "plan30Days": {
    "week1": ["<action urgente 1>", "<action urgente 2>", "<action urgente 3>"],
    "week2_3": ["<action d'optimisation 1>", "<action d'optimisation 2>", "<action d'optimisation 3>"],
    "week4": ["<test à mettre en place 1>", "<test à mettre en place 2>"]
  }
}`;
}

export async function analyzePortfolio(
  url: string,
  content: ScrapedContent
): Promise<AnalysisResult> {
  const prompt = buildPrompt(url, content);

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 25000, // 25s per attempt
    maxRetries: 0,  // no retries — 2 retries × 30s = 60s = Vercel kill
  });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Clean potential markdown wrapping
  let cleanedResponse = responseText.trim();
  if (cleanedResponse.startsWith("```json")) {
    cleanedResponse = cleanedResponse.slice(7);
  }
  if (cleanedResponse.startsWith("```")) {
    cleanedResponse = cleanedResponse.slice(3);
  }
  if (cleanedResponse.endsWith("```")) {
    cleanedResponse = cleanedResponse.slice(0, -3);
  }
  cleanedResponse = cleanedResponse.trim();

  const analysisData = JSON.parse(cleanedResponse);

  // Validate and ensure totalScore matches sum of axes
  const computedTotal = analysisData.axes.reduce(
    (sum: number, axis: { score: number }) => sum + axis.score,
    0
  );

  return {
    url,
    totalScore: analysisData.totalScore ?? computedTotal,
    level: analysisData.level,
    verdict: analysisData.verdict,
    axes: analysisData.axes,
    quickWins: analysisData.quickWins,
    plan30Days: analysisData.plan30Days,
    analyzedAt: new Date().toISOString(),
  };
}
