import Anthropic from "@anthropic-ai/sdk";
import type { ScrapedContent, AnalysisResult } from "./types";

// ── Static system prompt (cacheable ≥1024 tokens) ────────────────────────────
// Ce bloc ne change jamais entre les appels → éligible au prompt caching Anthropic.
// Le cache est écrit au 1er appel (~3.75$/M write) puis relu à 0.30$/M (−90%).
const SYSTEM_PROMPT = `Tu es un expert reconnu en conversion web, positionnement freelance et copywriting orienté résultats. Tu as analysé des centaines de portfolios de freelances créatifs (graphistes, développeurs, rédacteurs, consultants) et tu sais exactement ce qui fait qu'un site génère des clients premium ou fait fuir les prospects. Tu connais les patterns qui convertissent, les erreurs classiques du freelance créatif, et tu sais les expliquer avec bienveillance et précision.

Tu vas recevoir le contenu extrait d'un portfolio de freelance et produire un audit complet, honnête et actionnable.

RÈGLES D'ANALYSE ABSOLUES :
1. Analyse avec les yeux d'un directeur marketing ou fondateur de startup, PAS d'un créatif
2. Ce qui compte : est-ce que ce site aide à closer des clients qui paient bien ?
3. L'esthétique n'est PAS un critère (sauf si elle nuit à la lisibilité)
4. Sois direct, honnête, bienveillant — jamais condescendant
5. Utilise "tu" — parle au freelance comme un mentor le ferait
6. Donne des exemples concrets dans tes feedbacks quand possible
7. Si les données sont insuffisantes pour un axe, indique-le et note de façon conservatrice
8. PÉRIMÈTRE STRICT : toutes tes recommandations (quickAction, quickWins, blocking) doivent porter UNIQUEMENT sur la page analysée. Ne suggère JAMAIS de créer une nouvelle page ou de modifier une autre page du site. Si un élément manque (témoignages, offre, CTA…), recommande de l'ajouter sur CETTE page, pas sur une autre page inexistante.
9. TÉMOIGNAGES : si le champ TÉMOIGNAGES indique un nombre > 0, cela signifie que des témoignages sont présents et visibles sur la page. Ne dis JAMAIS qu'il n'y a pas de témoignages dans ce cas. Évalue plutôt leur QUALITÉ (résultats business concrets, spécificité, nom + titre de l'auteur, photo, logo client) plutôt que leur présence.

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

Retourne UNIQUEMENT un objet JSON valide, compact, sans indentation ni espaces superflus (sans markdown, sans backticks, sans commentaires).
IMPORTANT — sois concis : chaque valeur de string doit faire maximum 120 caractères.

FORMAT EXACT DE RÉPONSE (respecte ces ids, ces champs, cet ordre) :
{"totalScore":<entier 0-100>,"level":"<vitrine|transition|vend>","verdict":"<2-3 phrases : constat principal + impact business + espoir — max 120 chars chacune>","axes":[{"id":"positioning","name":"Message de positionnement","score":<0-20>,"maxScore":20,"working":["<point positif factuel et précis>","<optionnel>"],"blocking":["<point bloquant avec exemple concret>","<point bloquant 2>","<optionnel>"],"quickAction":"<1 action ultra-concrète cette semaine — commence par un verbe>"},{"id":"social_proof","name":"Preuve sociale et crédibilité","score":<0-20>,"maxScore":20,"working":["<point>"],"blocking":["<point>","<point>"],"quickAction":"<action>"},{"id":"cta","name":"Appel à l'action (CTA)","score":<0-15>,"maxScore":15,"working":["<point>"],"blocking":["<point>","<point>"],"quickAction":"<action>"},{"id":"offer_clarity","name":"Clarté de l'offre","score":<0-15>,"maxScore":15,"working":["<point>"],"blocking":["<point>","<point>"],"quickAction":"<action>"},{"id":"ux","name":"Expérience utilisateur","score":<0-10>,"maxScore":10,"working":["<point>"],"blocking":["<point>"],"quickAction":"<action>"},{"id":"storytelling","name":"Storytelling et connexion émotionnelle","score":<0-10>,"maxScore":10,"working":["<point>"],"blocking":["<point>"],"quickAction":"<action>"},{"id":"alignment","name":"Alignement cible / message","score":<0-10>,"maxScore":10,"working":["<point>"],"blocking":["<point>"],"quickAction":"<action>"}],"quickWins":[{"title":"<titre court et percutant>","description":"<QUOI faire + POURQUOI ça marche — max 120 chars>","effort":"<faible|moyen|élevé>","impact":"<fort|moyen|faible>"},{"title":"<titre>","description":"<desc — max 120 chars>","effort":"<faible|moyen|élevé>","impact":"<fort|moyen|faible>"},{"title":"<titre>","description":"<desc — max 120 chars>","effort":"<faible|moyen|élevé>","impact":"<fort|moyen|faible>"}]}`;

// ── Dynamic content builder (par appel, non caché) ────────────────────────────
// Réduit vs avant : bodyText 2000→1200 chars, services/about 600→350 chars,
// format compact sans labels verbeux → ~30% de tokens en moins côté contenu.
function buildContentMessage(url: string, content: ScrapedContent): string {
  const lines: string[] = [
    `URL: ${url}`,
    `TITRE: ${content.title || "—"}`,
    `META: ${content.metaDescription || "—"}`,
    `H1: ${content.h1.slice(0, 3).join(" | ") || "—"}`,
    `H2: ${content.h2.slice(0, 5).join(" | ") || "—"}`,
    `NAV: ${content.navigationItems.join(", ") || "—"}`,
    `CTAs: ${content.ctaTexts.join(" | ") || "—"}`,
    `FORMULAIRE: ${content.hasContactForm ? "oui" : "non"} | TÉMOIGNAGES: ${content.testimonials.length} | PROJETS: ${content.hasCaseStudies ? "oui" : "non"}`,
  ];

  if (content.testimonials.length > 0) {
    lines.push(`TÉMOIGNAGES:\n${content.testimonials.slice(0, 2).map(t => t.substring(0, 300)).join("\n---\n")}`);
  }
  if (content.servicesText) {
    lines.push(`SERVICES: ${content.servicesText.substring(0, 350)}`);
  }
  if (content.aboutText) {
    lines.push(`À PROPOS: ${content.aboutText.substring(0, 350)}`);
  }
  if (content.pricingText) {
    lines.push(`PRIX: ${content.pricingText}`);
  }

  lines.push(`CONTENU: ${(content.bodyText || "—").substring(0, 1200)}`);

  if (content.error) {
    lines.push(`⚠️ ERREUR SCRAPING: ${content.error} — Base ton analyse sur les données disponibles.`);
  }

  return lines.join("\n");
}

export async function analyzePortfolio(
  url: string,
  content: ScrapedContent
): Promise<AnalysisResult> {
  const contentMessage = buildContentMessage(url, content);

  // Estimation tokens avant envoi (4 chars ≈ 1 token)
  const estimatedSystemTokens = Math.round(SYSTEM_PROMPT.length / 4);
  const estimatedContentTokens = Math.round(contentMessage.length / 4);
  console.log(
    `[analyzer] tokens estimés — system (caché): ~${estimatedSystemTokens} | contenu: ~${estimatedContentTokens} | total: ~${estimatedSystemTokens + estimatedContentTokens}`
  );

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 55000,
    maxRetries: 0,
  });

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2500,   // était 4096 → 1500 trop court (JSON tronqué) → 2500 safe
    temperature: 0,
    // Prompt caching : le system prompt statique est mis en cache après le 1er appel
    // Coût cache write : $3.75/M (1x) → cache read : $0.30/M (−90% sur appels suivants)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ] as any,
    messages: [
      { role: "user", content: contentMessage },
      { role: "assistant", content: "{" }, // prefill → force JSON direct, pas de markdown
    ],
  });

  // Log réel post-appel pour mesurer le gain de caching
  const usage = message.usage as Anthropic.Usage & {
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  console.log(
    `[analyzer] stop_reason: ${message.stop_reason} | ` +
    `input: ${usage.input_tokens} | output: ${usage.output_tokens} | ` +
    `cache_write: ${usage.cache_creation_input_tokens ?? 0} | cache_read: ${usage.cache_read_input_tokens ?? 0}`
  );

  const rawText = message.content[0].type === "text" ? message.content[0].text : "";
  const responseText = "{" + rawText;

  // Nettoyage markdown résiduel
  let cleanedResponse = responseText.trim();
  if (cleanedResponse.startsWith("```json")) cleanedResponse = cleanedResponse.slice(7);
  if (cleanedResponse.startsWith("```")) cleanedResponse = cleanedResponse.slice(3);
  if (cleanedResponse.endsWith("```")) cleanedResponse = cleanedResponse.slice(0, -3);
  cleanedResponse = cleanedResponse.trim();

  // Fix des vrais \n/\t dans les strings JSON (bug Claude occasionnel)
  let fixed = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < cleanedResponse.length; i++) {
    const ch = cleanedResponse[i];
    if (escaped) { fixed += ch; escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; fixed += ch; continue; }
    if (ch === '"') { inString = !inString; fixed += ch; continue; }
    if (inString) {
      if (ch === "\n") { fixed += "\\n"; continue; }
      if (ch === "\r") { fixed += "\\r"; continue; }
      if (ch === "\t") { fixed += "\\t"; continue; }
    }
    fixed += ch;
  }
  cleanedResponse = fixed;

  let analysisData: ReturnType<typeof JSON.parse>;
  try {
    analysisData = JSON.parse(cleanedResponse);
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    const pos = parseInt(msg.match(/position (\d+)/)?.[1] ?? "0");
    console.error("[analyzer] JSON parse failed:", msg);
    console.error("[analyzer] response_len:", cleanedResponse.length, "| error_pos:", pos);
    if (pos > 0) {
      console.error("[analyzer] context:", JSON.stringify(cleanedResponse.substring(Math.max(0, pos - 80), pos + 40)));
    }
    console.error("[analyzer] last 120 chars:", JSON.stringify(cleanedResponse.slice(-120)));
    throw parseErr;
  }

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
