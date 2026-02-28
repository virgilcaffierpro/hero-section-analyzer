import * as cheerio from "cheerio";
import type { ScrapedContent } from "./types";

const TIMEOUT_MS = 5000;

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function scrapeWebsite(rawUrl: string): Promise<ScrapedContent> {
  const url = normalizeUrl(rawUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove noise
    $("script, style, noscript, svg, iframe, img").remove();
    $("nav footer header").find("script, style").remove();

    // Extract title
    const title = cleanText($("title").text());

    // Meta description
    const metaDescription =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    // Headings
    const h1 = $("h1")
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t.length > 0);

    const h2 = $("h2")
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t.length > 0)
      .slice(0, 8);

    // Navigation items
    const navigationItems = $("nav a, header a, [role='navigation'] a")
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t.length > 0 && t.length < 60)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 10);

    // CTA buttons / contact links
    const ctaTexts = $(
      'a[href*="contact"], a[href*="calendly"], a[href*="book"], a[href*="hire"], a[href*="devis"], a[href*="projet"], button[type="submit"], .cta, [class*="cta"], [class*="btn-primary"]'
    )
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t.length > 0 && t.length < 100)
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 8);

    // Testimonials — détection large (class + id + headings + cite)
    const testimonialCssSelectors = [
      // class-based
      '[class*="testimonial"]', '[class*="testimonials"]',
      '[class*="review"]',      '[class*="reviews"]',
      '[class*="avis"]',        '[class*="temoignage"]',
      '[class*="témoignage"]',  '[class*="recommandation"]',
      '[class*="quote"]',       '[class*="client-say"]',
      '[class*="client-word"]', '[class*="feedback"]',
      '[class*="social-proof"]','[class*="trust-"]',
      '[class*="what-client"]', '[class*="what-people"]',
      // id-based (ex: id="témoignages", id="avis-clients") — Framer / Webflow
      '[id*="testimonial"]',    '[id*="testimonials"]',
      '[id*="temoignage"]',     '[id*="témoignage"]',
      '[id*="review"]',         '[id*="avis"]',
      '[id*="social-proof"]',
      // éléments sémantiques
      "blockquote",             "cite",
    ].join(", ");

    const selectorBased = $(testimonialCssSelectors)
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t.length > 30);

    // Fallback heading : chercher sections proches de h1-h4 contenant les mots clés
    // Sur Framer/Webflow, closest("section") échoue → on remonte jusqu'à 5 niveaux
    const testimonialKeywords = ["avis", "témoignage", "temoignage", "client", "recommandation", "disent", "parlent", "confiance", "ils nous font", "ce que disent"];
    const headingBased: string[] = [];
    $("h1, h2, h3, h4").each((_, heading) => {
      const headingText = $(heading).text().toLowerCase();
      if (testimonialKeywords.some((kw) => headingText.includes(kw))) {
        // Remonter de 1 à 5 niveaux, prendre le premier ancêtre dont le texte
        // est nettement plus long que le heading seul (= section complète)
        const headingLen = cleanText($(heading).text()).length;
        let target = $(heading).parent();
        for (let i = 0; i < 5; i++) {
          const parent = target.parent();
          if (!parent.length) break;
          const parentLen = cleanText(parent.text()).length;
          // S'arrêter quand l'ancêtre contient au moins 3× plus de texte que le heading
          // et moins de 6000 chars (évite de prendre tout le body)
          if (parentLen > headingLen * 3 && parentLen < 6000) {
            target = parent;
            break;
          }
          if (parentLen < 6000) target = parent;
        }
        const txt = cleanText(target.text());
        if (txt.length > 40) headingBased.push(txt.substring(0, 1500));
      }
    });

    // Heuristique : détection par pattern de contenu (guillemets, étoiles, attribution)
    // Couvre les sites sans classe/id sémantique (builders custom, HTML brut…)
    const heuristicTestimonials: string[] = [];

    // Pattern 1 : paragraphe qui commence par un guillemet ou contient des étoiles
    $("p").each((_, el) => {
      const txt = cleanText($(el).text());
      if (txt.length < 40 || txt.length > 500) return;
      const startsWithQuote = /^["""«\u201C\u00AB'']/.test(txt);
      const hasStars       = /[★⭐]|\d\s*\/\s*5/.test(txt);
      if (startsWithQuote || hasStars) {
        // Inclure le contexte du parent (souvent l'attribution y est)
        const parentTxt = cleanText($(el).parent().text());
        const result = parentTxt.length > txt.length && parentTxt.length < 700
          ? parentTxt : txt;
        heuristicTestimonials.push(result);
      }
    });

    // Pattern 2 : conteneur avec un texte long (citation) + ligne courte (Prénom Nom, Titre)
    $("div, li, article").each((_, container) => {
      const children = $(container).children().toArray();
      if (children.length < 2 || children.length > 7) return;
      const childTexts = children
        .map((c) => cleanText($(c).text()))
        .filter((t) => t.length > 0);
      const hasQuotedText  = childTexts.some((t) => t.length > 50 && /^["""«\u201C\u00AB'']/.test(t));
      // Attribution = ligne courte avec initiale majuscule + nom + virgule/pipe
      const hasAttribution = childTexts.some(
        (t) => t.length > 3 && t.length < 80 && /^[A-ZÉÀÈÙÂ][a-zéàèùâê]+\s+[A-ZÉÀÈÙÂ]/.test(t)
      );
      if (hasQuotedText && hasAttribution) {
        const combined = childTexts.join(" — ");
        if (combined.length > 60 && combined.length < 650) {
          heuristicTestimonials.push(combined);
        }
      }
    });

    const testimonials = [...selectorBased, ...headingBased, ...heuristicTestimonials]
      .filter((t, i, arr) => arr.indexOf(t) === i) // dédoublonnage
      .filter((t) => t.length > 30)
      .slice(0, 5);

    // Case studies detection
    const bodyTextLower = $("body").text().toLowerCase();
    const hasCaseStudies =
      bodyTextLower.includes("case study") ||
      bodyTextLower.includes("étude de cas") ||
      bodyTextLower.includes("projet") ||
      bodyTextLower.includes("portfolio") ||
      $('[class*="case"], [class*="project"], [class*="work"]').length > 0;

    // Contact form detection
    const hasContactForm = $("form").length > 0;

    // Services / offer section
    const servicesText = cleanText(
      $(
        '[class*="service"], [class*="offre"], [class*="offer"], [class*="prestations"], #services, #offres, [id*="service"]'
      )
        .text()
        .substring(0, 600)
    );

    // About section
    const aboutText = cleanText(
      $(
        '[class*="about"], [class*="bio"], #about, [id*="about"], [class*="propos"], [id*="propos"]'
      )
        .text()
        .substring(0, 600)
    );

    // Main body text (cleaned, limited)
    const bodyText = cleanText($("main, article, .content, body").text()).substring(0, 2000);

    // Dedicated pricing extractor — scan full text for price patterns
    // Captures prices the bodyText limit would otherwise miss
    const fullText = cleanText($("body").text());
    const priceRegex = /\d[\d\s.,]*\s*[€$£]/g;
    const priceMatches: string[] = [];
    let match;
    while ((match = priceRegex.exec(fullText)) !== null) {
      const price = match[0].trim();
      if (!priceMatches.includes(price)) {
        // Get ~40 chars of context after the price
        const ctx = fullText.substring(match.index, match.index + 60).replace(/\s+/g, " ").trim();
        priceMatches.push(ctx);
      }
      if (priceMatches.length >= 8) break;
    }
    // Also try CSS-class-based pricing sections
    const pricingSection = cleanText(
      $('[class*="price"], [class*="pricing"], [class*="tarif"], [class*="plan-"], [id*="price"], [id*="tarif"]').text()
    ).substring(0, 300);
    const pricingText = pricingSection || priceMatches.join(" | ").substring(0, 400);

    return {
      title,
      metaDescription,
      h1,
      h2,
      bodyText,
      ctaTexts,
      testimonials,
      navigationItems,
      hasContactForm,
      hasTestimonials: testimonials.length > 0,
      hasCaseStudies,
      servicesText,
      aboutText,
      pricingText,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Return partial data with error flag instead of throwing
    return {
      title: "",
      metaDescription: "",
      h1: [],
      h2: [],
      bodyText: "",
      ctaTexts: [],
      testimonials: [],
      navigationItems: [],
      hasContactForm: false,
      hasTestimonials: false,
      hasCaseStudies: false,
      servicesText: "",
      aboutText: "",
      pricingText: "",
      error: `Impossible d'accéder au site : ${errorMessage}`,
    };
  }
}
