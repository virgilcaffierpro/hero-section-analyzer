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

    // Testimonials
    const testimonialSelectors = [
      '[class*="testimonial"]',
      '[class*="review"]',
      '[class*="avis"]',
      '[class*="temoignage"]',
      "blockquote",
      '[class*="quote"]',
      '[class*="client-say"]',
    ].join(", ");

    const testimonials = $(testimonialSelectors)
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t.length > 20 && t.length < 500)
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
      error: `Impossible d'accéder au site : ${errorMessage}`,
    };
  }
}
