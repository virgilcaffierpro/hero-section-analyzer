import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/scraper";
import { analyzeHeroSection } from "@/lib/analyzer";
import { getCached, setCached, clearCachedUrl, getLastEntry, addToHistory } from "@/lib/cache";
import type { ScrapedContent } from "@/lib/types";

function computeScrapingWarnings(content: ScrapedContent): Record<string, string> {
  const w: Record<string, string> = {};

  if (!content.heroHeadline) {
    w.value_prop = "Aucun headline (H1) détecté dans la hero section. Vérifie qu'un H1 est bien présent au-dessus de la ligne de flottaison.";
  }

  if (!content.heroSubheadline) {
    w.hook = "Aucun sous-titre détecté sous le headline. Un subheadline aide à clarifier la promesse et contextualiser l'offre.";
  }

  if (content.heroCTAs.length === 0) {
    w.hero_cta = "Aucun bouton d'action détecté dans la hero section. Vérifie que tes CTAs sont des <a> ou <button> visibles au-dessus de la ligne de flottaison.";
  }

  if (content.heroLogos === 0 && content.heroNumbers.length === 0 && !content.heroMicroTestimonial && content.trustSignals.length === 0) {
    w.social_proof = "Aucun signal de confiance détecté dans la hero (logos, chiffres, témoignage). S'ils sont présents plus bas, envisage d'en remonter un dans la hero.";
  }

  return w;
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, target = "", force = false } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Une URL valide est requise." }, { status: 400 });
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) {
      return NextResponse.json({ error: "L'URL ne peut pas être vide." }, { status: 400 });
    }

    const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
    if (!apiKey || apiKey.includes("placeholder") || apiKey.length < 10) {
      return NextResponse.json(
        {
          error:
            "Clé API Anthropic manquante ou invalide. Configure ANTHROPIC_API_KEY dans les variables d'environnement.",
        },
        { status: 500 }
      );
    }

    // Return cached result unless force=true
    if (!force) {
      const cached = getCached(trimmedUrl);
      if (cached) {
        const urlHistory = getLastEntry(trimmedUrl);
        return NextResponse.json({ ...cached, fromCache: true, previousScore: urlHistory ?? null });
      }
    } else {
      clearCachedUrl(trimmedUrl);
    }

    // Get the last history entry before this new analysis (for delta)
    const previousEntry = getLastEntry(trimmedUrl);

    // Step 1: Scrape hero section
    const scrapedContent = await scrapeWebsite(trimmedUrl);

    // Step 2: Analyze with Claude
    const result = await analyzeHeroSection(trimmedUrl, scrapedContent, typeof target === "string" ? target.trim() : "");

    // Attach previous score for delta display + scraping warnings + original hero text
    const resultWithHistory = {
      ...result,
      fromCache: false,
      previousScore: previousEntry
        ? { score: previousEntry.totalScore, level: previousEntry.level, analyzedAt: previousEntry.analyzedAt }
        : null,
      scrapingWarnings: computeScrapingWarnings(scrapedContent),
      heroOriginal: {
        headline: scrapedContent.heroHeadline || scrapedContent.title || "",
        subheadline: scrapedContent.heroSubheadline || scrapedContent.metaDescription || "",
      },
    };

    // Save to cache and history
    setCached(trimmedUrl, resultWithHistory);
    addToHistory(result);

    return NextResponse.json(resultWithHistory);
  } catch (error) {
    console.error("Analysis error:", error);

    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

    if (errorMessage.includes("JSON")) {
      return NextResponse.json(
        { error: "Erreur lors du parsing de la réponse IA. Réessaie dans quelques secondes." },
        { status: 500 }
      );
    }

    if (
      errorMessage.includes("401") ||
      errorMessage.includes("authentication_error") ||
      errorMessage.includes("invalid x-api-key") ||
      errorMessage.includes("invalid_api_key")
    ) {
      return NextResponse.json(
        {
          error:
            "🔑 Clé API Anthropic invalide (erreur 401). Ouvre .env.local, vérifie que ANTHROPIC_API_KEY commence bien par sk-ant- et qu'elle est correctement copiée depuis console.anthropic.com.",
        },
        { status: 500 }
      );
    }

    if (errorMessage.includes("Anthropic") || errorMessage.includes("API key")) {
      return NextResponse.json({ error: `Erreur API Claude : ${errorMessage}` }, { status: 500 });
    }

    return NextResponse.json(
      { error: `Analyse impossible : ${errorMessage}. Vérifie que le site est accessible publiquement.` },
      { status: 500 }
    );
  }
}
