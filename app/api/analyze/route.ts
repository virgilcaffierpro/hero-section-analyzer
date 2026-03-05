import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/scraper";
import { analyzePortfolio } from "@/lib/analyzer";
import { getCached, setCached, clearCachedUrl, getLastEntry, addToHistory } from "@/lib/cache";
import type { ScrapedContent } from "@/lib/types";

function computeScrapingWarnings(content: ScrapedContent): Record<string, string> {
  const w: Record<string, string> = {};

  if (!content.h1.length && !content.metaDescription) {
    w.positioning = "Aucun titre H1 ni meta description trouvés. Ces balises sont essentielles pour ton positionnement — vérifie qu'elles sont bien présentes dans le HTML de ta page.";
  }

  if (content.testimonials.length === 0) {
    w.social_proof = "Aucun témoignage détecté sur ta page. S'ils sont présents, ils sont peut-être dans un carrousel avec timer, masqués au chargement ou dans un format non standard. Assure-toi qu'au moins un témoignage est visible sans interaction dès le chargement.";
  }

  if (content.ctaTexts.length === 0 && !content.hasContactForm) {
    w.cta = "Aucun bouton de contact ni formulaire détecté. Vérifie que tes CTAs sont des balises <a> ou <button> avec un lien ou texte contenant « contact », « devis », « book » ou « calendly ».";
  }

  if (!content.servicesText && !content.pricingText) {
    w.offer_clarity = "Aucune section offre ou tarifs identifiée. Ajoute une classe CSS contenant « services », « offre », « pricing » ou « tarifs » sur ta section pour que l'analyse soit plus précise.";
  }

  if (!content.aboutText) {
    w.storytelling = "Aucune section À propos détectée. Ajoute la classe ou l'id « about », « bio » ou « à-propos » sur ta section personnelle pour améliorer l'analyse du storytelling.";
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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes("placeholder") || !apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        {
          error:
            "🔑 Clé API Anthropic manquante ou invalide. Ouvre le fichier .env.local et remplace la valeur de ANTHROPIC_API_KEY par ta vraie clé (commence par sk-ant-). Récupère-la sur console.anthropic.com.",
        },
        { status: 500 }
      );
    }

    // Return cached result unless force=true
    if (!force) {
      const cached = getCached(trimmedUrl);
      if (cached) {
        // Attach the previous score (the one before the cached entry in history)
        const urlHistory = getLastEntry(trimmedUrl);
        return NextResponse.json({ ...cached, fromCache: true, previousScore: urlHistory ?? null });
      }
    } else {
      // Force reanalysis: clear cache for this URL
      clearCachedUrl(trimmedUrl);
    }

    // Get the last history entry before this new analysis (for delta)
    const previousEntry = getLastEntry(trimmedUrl);

    // Step 1: Scrape
    const scrapedContent = await scrapeWebsite(trimmedUrl);

    // Step 2: Analyze with Claude
    const result = await analyzePortfolio(trimmedUrl, scrapedContent, typeof target === "string" ? target.trim() : "");

    // Attach previous score for delta display + scraping warnings
    const resultWithHistory = {
      ...result,
      fromCache: false,
      previousScore: previousEntry
        ? { score: previousEntry.totalScore, level: previousEntry.level, analyzedAt: previousEntry.analyzedAt }
        : null,
      scrapingWarnings: computeScrapingWarnings(scrapedContent),
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
