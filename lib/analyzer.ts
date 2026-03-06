import Anthropic from "@anthropic-ai/sdk";
import type { ScrapedContent, AnalysisResult } from "./types";

// ── Static system prompt (cacheable ≥1024 tokens) ────────────────────────────
// Ce bloc ne change jamais entre les appels → éligible au prompt caching Anthropic.
// Le cache est écrit au 1er appel (~3.75$/M write) puis relu à 0.30$/M (−90%).
const SYSTEM_PROMPT = `Tu es un expert en optimisation de conversion web, spécialiste des hero sections. Tu as analysé des centaines de pages d'accueil et tu sais exactement ce qui fait qu'un visiteur reste ou part dans les 5 premières secondes. Tu maîtrises les principes de clarté, d'accroche, de hiérarchie visuelle et de preuve sociale appliqués au-dessus de la ligne de flottaison.

Tu vas recevoir le contenu extrait de la hero section d'une page web (au-dessus de la ligne de flottaison, viewport 1280x900) et produire un audit ciblé, honnête et actionnable.

RÈGLES D'ANALYSE ABSOLUES :
1. Analyse avec les yeux d'un PROSPECT qui arrive pour la première fois — pas d'un designer ou développeur
2. Ce qui compte : est-ce que le visiteur comprend immédiatement l'offre et a envie d'en savoir plus ?
3. L'esthétique n'est PAS un critère direct (sauf si elle nuit à la lisibilité ou la hiérarchie)
4. Sois direct, honnête, bienveillant — jamais condescendant
5. Utilise "tu" — parle au créateur du site comme un mentor le ferait
6. Donne des exemples concrets dans tes feedbacks quand possible
7. Si les données sont insuffisantes pour un axe, indique-le et note de façon conservatrice
8. PÉRIMÈTRE STRICT : toutes tes recommandations portent UNIQUEMENT sur la hero section (au-dessus de la ligne de flottaison). Ne suggère JAMAIS de modifier des sections en-dessous ou d'autres pages.
9. CIBLE DÉCLARÉE : si le champ CIBLE est renseigné, utilise-la pour évaluer si la hero section parle vraiment à cette cible. Si CIBLE est vide, évalue sur la base de la cible que la page semble vouloir atteindre.
10. SIGNAUX DE CONFIANCE : si des logos clients, chiffres ou micro-témoignages sont détectés dans la hero, évalue leur QUALITÉ et leur impact, pas seulement leur présence.

SCORES ET PONDÉRATIONS (total /100) :
- Clarté proposition de valeur : /20 — Le visiteur comprend-il en 5 secondes ce que tu fais, pour qui, et le bénéfice principal ?
- Accroche & Hook : /15 — Le headline capte-t-il l'attention ? Adresse-t-il un pain point ou un désir fort ?
- CTA hero : /15 — Y a-t-il un CTA visible, clair, avec un verbe d'action et une proposition de valeur ?
- Preuve sociale immédiate : /15 — Logos clients, nombre de clients/projets, micro-témoignage, badges visibles dans la hero ?
- Hiérarchie visuelle & Lisibilité : /10 — Le texte est-il lisible ? La hiérarchie headline > subheadline > CTA est-elle claire ?
- Spécificité & Différenciation : /15 — Le message est-il spécifique (pas générique) ? Se démarque-t-il de la concurrence ?
- Alignement cible : /10 — Le vocabulaire, le ton et les promesses parlent-ils à la cible visée ?

NIVEAUX :
- "fuite" : 0-35 — Le prospect part. Il n'a pas compris ou n'a pas été convaincu. Hero section qui fait fuir.
- "confuse" : 36-65 — Le prospect hésite. Le message est flou, pas assez convaincant, ou l'action à prendre n'est pas claire.
- "convainc" : 66-100 — Le prospect reste. La proposition est claire, l'accroche est forte, il veut en savoir plus.

RÉÉCRITURE HERO :
En plus de l'audit, tu dois proposer une réécriture améliorée du headline et du subheadline de la hero section. La réécriture doit :
- Être en français
- Garder la même intention/offre mais être plus percutante, claire et orientée bénéfice
- Adresser directement la cible avec un angle émotionnel ou un pain point
- Le headline réécrit doit faire max 80 caractères, le subheadline max 160 caractères

Retourne UNIQUEMENT un objet JSON valide, compact, sans indentation ni espaces superflus (sans markdown, sans backticks, sans commentaires).
IMPORTANT — sois concis : chaque valeur de string doit faire maximum 120 caractères (sauf heroRewrite.subheadline max 160).
QUICKWINS : génère entre 5 et 15 actions concrètes dans quickWins, classées par impact décroissant (fort → moyen → faible). Plus le score est bas, plus tu dois proposer d'actions (max 15). Le format dans le JSON montre 1 exemple, mais tu en mets autant que nécessaire.

FORMAT EXACT DE RÉPONSE (respecte ces ids, ces champs, cet ordre) :
{"totalScore":<entier 0-100>,"level":"<fuite|confuse|convainc>","verdict":"<2-3 phrases : constat principal + impact sur le visiteur + piste d'amélioration — max 120 chars chacune>","axes":[{"id":"value_prop","name":"Clarté proposition de valeur","score":<0-20>,"maxScore":20,"working":["<point positif factuel>","<optionnel>"],"blocking":["<point bloquant avec exemple concret>","<optionnel>"],"quickAction":"<1 action concrète — commence par un verbe>"},{"id":"hook","name":"Accroche & Hook","score":<0-15>,"maxScore":15,"working":["<point>"],"blocking":["<point>"],"quickAction":"<action>"},{"id":"hero_cta","name":"CTA hero","score":<0-15>,"maxScore":15,"working":["<point>"],"blocking":["<point>"],"quickAction":"<action>"},{"id":"social_proof","name":"Preuve sociale immédiate","score":<0-15>,"maxScore":15,"working":["<point>"],"blocking":["<point>"],"quickAction":"<action>"},{"id":"visual_hierarchy","name":"Hiérarchie visuelle & Lisibilité","score":<0-10>,"maxScore":10,"working":["<point>"],"blocking":["<point>"],"quickAction":"<action>"},{"id":"specificity","name":"Spécificité & Différenciation","score":<0-15>,"maxScore":15,"working":["<point>"],"blocking":["<point>"],"quickAction":"<action>"},{"id":"target_alignment","name":"Alignement cible","score":<0-10>,"maxScore":10,"working":["<point>"],"blocking":["<point>"],"quickAction":"<action>"}],"quickWins":[{"title":"<titre court>","description":"<QUOI + POURQUOI — max 120 chars>","effort":"<faible|moyen|élevé>","impact":"<fort|moyen|faible>"}],"heroRewrite":{"headline":"<headline réécrit — max 80 chars>","subheadline":"<subheadline réécrit — max 160 chars>","rationale":"<1 phrase expliquant pourquoi cette réécriture est meilleure — max 160 chars>"}}`;

// ── Dynamic content builder (par appel, non caché) ────────────────────────────
function buildContentMessage(url: string, content: ScrapedContent, target: string): string {
  const lines: string[] = [
    `URL: ${url}`,
    `CIBLE: ${target || "non renseignée"}`,
    `TITRE PAGE: ${content.title || "—"}`,
    `META: ${content.metaDescription || "—"}`,
    `HERO HEADLINE: ${content.heroHeadline || "—"}`,
    `HERO SUBHEADLINE: ${content.heroSubheadline || "—"}`,
    `HERO CTAs: ${content.heroCTAs.join(" | ") || "aucun CTA détecté"}`,
    `NAV: ${content.navigationItems.join(", ") || "—"}`,
    `IMAGE HERO: ${content.hasHeroImage ? "oui" : "non"} | VIDEO HERO: ${content.hasHeroVideo ? "oui" : "non"}`,
    `LOGOS CLIENTS VISIBLES: ${content.heroLogos}`,
    `CHIFFRES/STATS HERO: ${content.heroNumbers.join(" | ") || "aucun"}`,
    `MICRO-TÉMOIGNAGE HERO: ${content.heroMicroTestimonial || "aucun"}`,
    `SIGNAUX DE CONFIANCE: ${content.trustSignals.join(" | ") || "aucun"}`,
    `TEXTE VISIBLE HERO: ${(content.heroRawText || "—").substring(0, 1500)}`,
  ];

  if (content.error) {
    lines.push(`⚠️ ERREUR SCRAPING: ${content.error} — Base ton analyse sur les données disponibles.`);
  }

  return lines.join("\n");
}

export async function analyzeHeroSection(
  url: string,
  content: ScrapedContent,
  target = ""
): Promise<AnalysisResult> {
  const contentMessage = buildContentMessage(url, content, target);

  // Estimation tokens avant envoi (4 chars ≈ 1 token)
  const estimatedSystemTokens = Math.round(SYSTEM_PROMPT.length / 4);
  const estimatedContentTokens = Math.round(contentMessage.length / 4);
  console.log(
    `[analyzer] tokens estimés — system (caché): ~${estimatedSystemTokens} | contenu: ~${estimatedContentTokens} | total: ~${estimatedSystemTokens + estimatedContentTokens}`
  );

  const client = new Anthropic({
    apiKey: (process.env.ANTHROPIC_API_KEY || "").trim(),
    timeout: 55000,
    maxRetries: 0,
  });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    temperature: 0,
    // Prompt caching : le system prompt statique est mis en cache après le 1er appel
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
    heroRewrite: analysisData.heroRewrite ?? undefined,
    analyzedAt: new Date().toISOString(),
  };
}
