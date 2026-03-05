import * as cheerio from "cheerio";
import type { ScrapedContent } from "./types";

const TIMEOUT_MS = 5000;
const PLAYWRIGHT_TIMEOUT_MS = 20000;

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Récupère le HTML rendu — deux fetches en parallèle :
// 1. Sans JS (Playwright, JS désactivé) → capture le HTML pré-rendu SSR complet (toutes les slides)
// 2. Avec JS (Playwright, JS activé) → capture le contenu dynamique post-hydratation
// Les deux résultats sont fusionnés pour maximiser la couverture.
// Fallback : fetch HTTP statique si Playwright est indisponible.
async function fetchRenderedHtml(url: string): Promise<string> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const [ssrHtml, dynamicHtml] = await Promise.all([
        // Contexte sans JS : HTML pré-rendu SSR (Framer/Next.js exposent toutes les slides ici)
        (async () => {
          const ctx = await browser.newContext({
            javaScriptEnabled: false,
            extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8" },
          });
          const page = await ctx.newPage();
          try {
            await page.goto(url, { waitUntil: "commit", timeout: PLAYWRIGHT_TIMEOUT_MS });
            return await page.content();
          } finally {
            await ctx.close();
          }
        })(),
        // Contexte avec JS : contenu dynamique + navigation des sliders
        (async () => {
          const ctx = await browser.newContext({
            viewport: { width: 1280, height: 900 },
            extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8" },
          });
          const page = await ctx.newPage();
          try {
            await page.goto(url, { waitUntil: "networkidle", timeout: PLAYWRIGHT_TIMEOUT_MS });
            await page.waitForTimeout(1500);

            let combinedBody = await page.evaluate(() => document.body.innerHTML);

            // Cherche le bouton "suivant" du slider en cliquant les petits éléments interactifs
            // jusqu'à trouver celui qui change le témoignage affiché.
            const getQuoteKey = () => page.evaluate(() => {
              const paras = document.querySelectorAll("p");
              for (const p of paras) {
                const t = (p.textContent || "").replace(/\s+/g, " ").trim();
                if (/^["""«\u201C\u00AB'']/.test(t) && t.length > 40) return t.substring(0, 60);
              }
              return "";
            });

            const q0 = await getQuoteKey();
            let nextBtnSel = "";

            // Phase 1 : trouve le bouton qui avance le slider
            if (q0) {
              const candidates = await page.$$("[class*='framer'], button, [role='button']");
              for (const el of candidates) {
                try {
                  const txt = ((await el.textContent()) || "").trim();
                  if (txt.length > 5) continue; // ignore les éléments avec du texte visible
                  const box = await el.boundingBox();
                  if (!box || box.width < 5 || box.height < 5) continue;
                  await el.click({ timeout: 400 });
                  await page.waitForTimeout(400);
                  const q1 = await getQuoteKey();
                  if (q1 && q1 !== q0) {
                    nextBtnSel = await el.evaluate((e) => {
                      const cls = e.className?.toString() || "";
                      return cls ? `[class="${cls}"]` : "";
                    });
                    combinedBody += await page.evaluate(() => document.body.innerHTML);
                    break;
                  }
                } catch { /* skip */ }
              }
            }

            // Phase 2 : si trouvé, continue à cliquer pour capturer les slides restants
            if (nextBtnSel) {
              const MAX_SLIDES = 10;
              const seenKeys = new Set([q0, await getQuoteKey()]);
              for (let i = 0; i < MAX_SLIDES; i++) {
                try {
                  const btn = page.locator(nextBtnSel).first();
                  if (!(await btn.isVisible())) break;
                  await btn.click();
                  await page.waitForTimeout(400);
                  const key = await getQuoteKey();
                  if (!key || seenKeys.has(key)) break;
                  seenKeys.add(key);
                  combinedBody += await page.evaluate(() => document.body.innerHTML);
                } catch { break; }
              }
            }

            return `<html><body>${combinedBody}</body></html>`;
          } finally {
            await ctx.close();
          }
        })(),
      ]);

      // Extrait le <body> du HTML pré-rendu et l'appende au HTML dynamique comme supplément.
      // Le parseur cheerio verra les deux et la déduplication par clé de citation fera le reste.
      const ssrBodyMatch = ssrHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const ssrBody = ssrBodyMatch ? ssrBodyMatch[1] : ssrHtml;
      return dynamicHtml + `<div id="ssr-supplement" style="display:none">${ssrBody}</div>`;
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.log("[scraper] Playwright indisponible, fallback fetch statique:", (e as Error).message.substring(0, 80));
    // Fallback : fetch HTTP classique
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
        },
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export async function scrapeWebsite(rawUrl: string): Promise<ScrapedContent> {
  const url = normalizeUrl(rawUrl);

  try {
    const html = await fetchRenderedHtml(url);
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

    // ── Témoignages — deux passes complémentaires + fallbacks ───────────────────
    //
    // Passe A : scan conteneur — cherche un div/li/article dont les enfants directs
    //           contiennent une citation (guillemet) + une attribution (texte court majuscule).
    //           Fiable sur sites bien structurés (Framer, Webflow, custom HTML).
    //
    // Passe B : scan feuille — cherche tout <p> qui commence par un guillemet,
    //           puis l'attribution dans les siblings / parent / grand-parent.
    //           Rattrape les structures plus profondes non couvertes par Passe A.
    //
    // Fallback CSS  : si les deux passes trouvent 0, utilise des sélecteurs class/id.
    // Fallback heading : si tout échoue, remonte la section entière depuis un heading.

    const seenQuoteKeys = new Set<string>();
    const patternBased: string[] = [];

    const navExact = new Set(["suivant", "précédent", "previous", "next", "voir plus", "load more"]);

    function isAttrib(t: string): boolean {
      return (
        t.length > 2 &&
        t.length < 100 &&
        /^[A-ZÉÀÈÙÂ]/.test(t) &&
        !/^["""«\u201C\u00AB'']/.test(t)
      );
    }

    function registerTestimonial(quote: string, attribParts: string[]): void {
      const key = quote.substring(0, 60);
      if (seenQuoteKeys.has(key)) return;
      seenQuoteKeys.add(key);
      const parts = [quote, ...attribParts.filter(Boolean)];
      const combined = parts.join(" — ");
      if (combined.length > 60 && combined.length < 900) {
        patternBased.push(combined);
      }
    }

    // ── Passe A : enfants directs d'un conteneur ─────────────────────────────────
    $("div, li, article").each((_, container) => {
      const children = $(container).children().toArray();
      if (children.length < 2 || children.length > 8) return;

      const childTexts = children
        .map((c) => cleanText($(c).text()))
        .filter((t) => t.length > 0);

      // Exclure les wrappers avec un bouton de navigation exact (sliders)
      if (childTexts.some((t) => navExact.has(t.toLowerCase()))) return;

      const quoteTexts = childTexts.filter(
        (t) => t.length > 40 && /^["""«\u201C\u00AB'']/.test(t)
      );
      const attribTexts = childTexts.filter(isAttrib);

      if (quoteTexts.length > 0 && attribTexts.length > 0) {
        registerTestimonial(quoteTexts[0], attribTexts);
      }
    });

    // ── Passe B : scan feuille — <p> avec guillemet + attribution dans le voisinage ──
    // Rattrape les structures à nesting plus profond où Passe A n'a pas matché.
    $("p").each((_, el) => {
      const txt = cleanText($(el).text());
      if (txt.length < 40 || txt.length > 600) return;
      if (!/^["""«\u201C\u00AB'']/.test(txt)) return;

      const key = txt.substring(0, 60);
      if (seenQuoteKeys.has(key)) return; // déjà capturé par Passe A

      const $el = $(el);
      let attrib = "";

      // 1. Siblings directs du <p>
      $el.siblings().each((_, sib) => {
        const t = cleanText($(sib).text());
        if (isAttrib(t)) { attrib = t; return false; }
      });

      // 2. Autres enfants du parent (siblings via le parent)
      if (!attrib) {
        $el.parent().children().each((_, sib) => {
          if (sib === el) return;
          const t = cleanText($(sib).text());
          if (isAttrib(t)) { attrib = t; return false; }
        });
      }

      // 3. Siblings du parent (structure : div.quote + div.attrib dans un wrapper commun)
      if (!attrib) {
        $el.parent().siblings().each((_, sib) => {
          const t = cleanText($(sib).text());
          if (isAttrib(t) && t.length < 80) { attrib = t; return false; }
        });
      }

      registerTestimonial(txt, attrib ? [attrib] : []);
    });

    // ── Fallback CSS/ID ───────────────────────────────────────────────────────────
    // Activé seulement si les deux passes n'ont rien trouvé.
    const testimonialCssSelectors = [
      '[class*="testimonial"]', '[class*="testimonials"]',
      '[class*="review"]',      '[class*="reviews"]',
      '[class*="avis"]',        '[class*="temoignage"]',
      '[class*="témoignage"]',  '[class*="recommandation"]',
      '[class*="quote"]',       '[class*="client-say"]',
      '[class*="client-word"]', '[class*="feedback"]',
      '[class*="social-proof"]','[class*="trust-"]',
      '[class*="what-client"]', '[class*="what-people"]',
      '[id*="testimonial"]',    '[id*="testimonials"]',
      '[id*="temoignage"]',     '[id*="témoignage"]',
      '[id*="review"]',         '[id*="avis"]',
      '[id*="social-proof"]',
    ].join(", ");

    function deduplicateByContainment(texts: string[]): string[] {
      return texts.filter((t, i) =>
        !texts.some((other, j) => i !== j && other.length > t.length * 1.5 && other.includes(t))
      );
    }

    const selectorBased = patternBased.length === 0
      ? deduplicateByContainment(
          $(testimonialCssSelectors)
            .map((_, el) => cleanText($(el).text()))
            .get()
            .filter((t) => t.length > 30)
        )
      : [];

    // ── Fallback heading ──────────────────────────────────────────────────────────
    // Dernier recours : section entière à partir d'un heading avec mots-clés témoignage.
    const testimonialKeywords = ["avis", "témoignage", "temoignage", "client", "recommandation", "disent", "parlent", "confiance", "ils nous font", "ce que disent"];
    const headingBased: string[] = [];
    if (patternBased.length === 0 && selectorBased.length === 0) {
      $("h1, h2, h3, h4").each((_, heading) => {
        const headingText = $(heading).text().toLowerCase();
        if (testimonialKeywords.some((kw) => headingText.includes(kw))) {
          const headingLen = cleanText($(heading).text()).length;
          let target = $(heading).parent();
          for (let i = 0; i < 5; i++) {
            const parent = target.parent();
            if (!parent.length) break;
            const parentLen = cleanText(parent.text()).length;
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
    }

    const testimonials = [...patternBased, ...selectorBased, ...headingBased]
      .filter((t, i, arr) => arr.indexOf(t) === i) // dédoublonnage exact (garde-fou)
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
