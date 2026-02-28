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

    // Testimonials — détection large (CSS + headings + cite)
    const testimonialCssSelectors = [
      '[class*="testimonial"]', '[class*="testimonials"]',
      '[class*="review"]',      '[class*="reviews"]',
      '[class*="avis"]',        '[class*="temoignage"]',
      '[class*="témoignage"]',  '[class*="recommandation"]',
      '[class*="quote"]',       '[class*="client-say"]',
      '[class*="client-word"]', '[class*="feedback"]',
      '[class*="social-proof"]','[class*="trust-"]',
      '[class*="what-client"]', '[class*="what-people"]',
      "blockquote",             "cite",
    ].join(", ");

    const selectorBased = $(testimonialCssSelectors)
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t.length > 30);

    // Fallback : chercher les sections proches de headings "avis / témoignages / clients"
    const testimonialKeywords = ["avis", "témoignage", "temoignage", "client", "recommandation", "disent", "parlent", "confiance", "ils nous font", "ce que disent"];
    const headingBased: string[] = [];
    $("h1, h2, h3, h4").each((_, heading) => {
      const headingText = $(heading).text().toLowerCase();
      if (testimonialKeywords.some((kw) => headingText.includes(kw))) {
        // Remonter jusqu'à la section englobante et prendre son texte
        const section = $(heading).closest("section, [class*='section'], [class*='block'], [class*='container']");
        const target = section.length ? section : $(heading).parent();
        const txt = cleanText(target.text());
        if (txt.length > 40) headingBased.push(txt.substring(0, 800));
      }
    });

    const testimonials = [...selectorBased, ...headingBased]
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
