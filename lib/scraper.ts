import type { ScrapedContent } from "./types";

const TIMEOUT_MS = 5000;
const PLAYWRIGHT_TIMEOUT_MS = 20000;
const VIEWPORT_HEIGHT = 900;
const VIEWPORT_WIDTH = 1280;

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Scrape uniquement la hero section (above-the-fold, viewport 1280x900).
// Utilise Browserless (remote) si BROWSERLESS_API_KEY est défini, sinon Playwright local.
async function scrapeHeroWithPlaywright(url: string): Promise<ScrapedContent> {
  const { chromium } = await import("playwright-core");
  const browserlessKey = process.env.BROWSERLESS_API_KEY;

  let browser;
  if (browserlessKey) {
    // Vercel: remote browser via Browserless
    browser = await chromium.connect(`wss://chrome.browserless.io?token=${browserlessKey}`);
  } else {
    // Local / Render: launch local Chromium
    const execPath = process.env.CHROME_PATH || undefined;
    browser = await chromium.launch({ headless: true, executablePath: execPath });
  }

  try {
    const ctx = await browser.newContext({
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8" },
    });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: PLAYWRIGHT_TIMEOUT_MS });
      await page.waitForTimeout(1500);

      const heroData = await page.evaluate((vpHeight: number) => {
        const VH = vpHeight;

        const clean = (text: string): string => text.replace(/\s+/g, " ").trim();

        const isInViewport = (el: Element): boolean => {
          const rect = el.getBoundingClientRect();
          return rect.top < VH && rect.bottom > 0 && rect.height > 0 && rect.width > 0;
        };

        const toArray = (nl: NodeListOf<Element>): Element[] =>
          Array.prototype.slice.call(nl) as Element[];

        // 1. Hero headline — H1 in viewport, fallback to largest text element
        let heroHeadline = "";
        const h1s = toArray(document.querySelectorAll("h1"));
        for (let i = 0; i < h1s.length; i++) {
          if (isInViewport(h1s[i])) {
            heroHeadline = clean(h1s[i].textContent || "");
            break;
          }
        }
        if (!heroHeadline) {
          let maxSize = 0;
          const candidates = toArray(document.querySelectorAll("h1, h2, h3, p, span, div"));
          for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i];
            if (!isInViewport(el)) continue;
            const text = clean(el.textContent || "");
            if (text.length < 3 || text.length > 200) continue;
            if (el.children.length > 3) continue;
            const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
            if (fontSize > maxSize) {
              maxSize = fontSize;
              heroHeadline = text;
            }
          }
        }

        // 2. Hero subheadline
        let heroSubheadline = "";
        const subCandidates = toArray(document.querySelectorAll("h2, h3, p, [class*='subtitle'], [class*='subheadline'], [class*='description']"));
        for (let i = 0; i < subCandidates.length; i++) {
          const el = subCandidates[i];
          if (!isInViewport(el)) continue;
          const text = clean(el.textContent || "");
          if (text.length < 10 || text.length > 300) continue;
          if (text === heroHeadline) continue;
          if (el.closest("nav") || el.closest("header nav")) continue;
          heroSubheadline = text;
          break;
        }

        // 3. CTAs in viewport
        // Phase A: explicit selectors (class-based + href-based)
        const ctaSelectors = 'a[href*="contact"], a[href*="calendly"], a[href*="book"], a[href*="devis"], a[href*="projet"], a[href*="rdv"], a[href*="appel"], a[href*="demo"], a[href*="essai"], a[href*="signup"], a[href*="register"], a[href*="pricing"], a[href*="tarif"], button, [role="button"], .cta, [class*="cta"], [class*="btn"], a.button, [class*="button"]';
        const ctaElements = toArray(document.querySelectorAll(ctaSelectors));
        const heroCTAs: string[] = [];
        const seenCTA = new Set<string>();
        for (let i = 0; i < ctaElements.length; i++) {
          const el = ctaElements[i];
          if (!isInViewport(el)) continue;
          if (el.closest("nav")) continue;
          const text = clean(el.textContent || "");
          if (text.length > 0 && text.length < 80 && !seenCTA.has(text.toLowerCase())) {
            seenCTA.add(text.toLowerCase());
            heroCTAs.push(text);
          }
        }
        // Phase B: detect <a> tags that visually look like buttons
        if (heroCTAs.length === 0) {
          const allLinks = toArray(document.querySelectorAll("a"));
          for (let i = 0; i < allLinks.length; i++) {
            const el = allLinks[i];
            if (!isInViewport(el)) continue;
            if (el.closest("nav")) continue;
            const text = clean(el.textContent || "");
            if (text.length < 2 || text.length > 80) continue;
            if (seenCTA.has(text.toLowerCase())) continue;
            const cs = window.getComputedStyle(el);
            const bg = cs.backgroundColor || "";
            const hasBg = bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== "";
            const hasBorder = cs.borderStyle !== "none" && cs.borderWidth !== "0px";
            const hasPadding = parseFloat(cs.paddingLeft) >= 10 || parseFloat(cs.paddingRight) >= 10;
            const hasRadius = parseFloat(cs.borderRadius) >= 4;
            const hasPillRadius = parseFloat(cs.borderRadius) >= 20;
            const hasShadow = cs.boxShadow !== "none" && cs.boxShadow !== "";
            // Looks like a button: bg+padding, border+padding+radius, pill-shape+padding, or shadow+padding
            if ((hasBg && hasPadding) || (hasBorder && hasPadding && hasRadius) || (hasPillRadius && hasPadding) || (hasShadow && hasPadding && hasRadius)) {
              seenCTA.add(text.toLowerCase());
              heroCTAs.push(text);
            }
          }
        }

        // 4. Navigation items
        const navItems: string[] = [];
        const navLinks = toArray(document.querySelectorAll("nav a, header a, [role='navigation'] a"));
        const seenNav = new Set<string>();
        for (let i = 0; i < navLinks.length; i++) {
          const text = clean(navLinks[i].textContent || "");
          if (text.length > 0 && text.length < 60 && !seenNav.has(text)) {
            seenNav.add(text);
            navItems.push(text);
          }
        }

        // 5. Trust signals — logos
        let heroLogos = 0;
        const images = toArray(document.querySelectorAll("img"));
        for (let i = 0; i < images.length; i++) {
          const img = images[i] as HTMLImageElement;
          if (!isInViewport(img)) continue;
          const src = (img.src || "").toLowerCase();
          const cls = (img.className || "").toLowerCase();
          const alt = (img.alt || "").toLowerCase();
          if (src.includes("logo") || cls.includes("logo") || alt.includes("logo") ||
              cls.includes("client") || cls.includes("partner") || cls.includes("partenaire") ||
              alt.includes("client") || alt.includes("partner")) {
            heroLogos++;
          }
        }

        // 6. Numbers/stats in viewport
        const heroNumbers: string[] = [];
        const numberPattern = /\d[\d\s.,]*\+?\s*(clients?|projets?|ans?|years?|entreprises?|marques?|sites?|freelances?|utilisateurs?|users?|countries|pays)/gi;
        const allElements = toArray(document.querySelectorAll("*"));
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (!isInViewport(el)) continue;
          if (el.children.length > 2) continue;
          const text = clean(el.textContent || "");
          if (text.length > 100) continue;
          const matches = text.match(numberPattern);
          if (matches) {
            for (let j = 0; j < matches.length; j++) {
              const cleaned = matches[j].trim();
              if (!heroNumbers.includes(cleaned)) heroNumbers.push(cleaned);
            }
          }
        }

        // 7. Trust signals (badges, reviews, stars)
        const trustSignals: string[] = [];
        const trustSelectors = '[class*="trust"], [class*="badge"], [class*="partner"], [class*="partenaire"], [class*="client-logo"], [class*="social-proof"], [class*="rating"], [class*="review"], [class*="avis"], [class*="star"]';
        const trustEls = toArray(document.querySelectorAll(trustSelectors));
        for (let i = 0; i < trustEls.length; i++) {
          const el = trustEls[i];
          if (!isInViewport(el)) continue;
          const text = clean(el.textContent || "");
          if (text.length > 5 && text.length < 200 && !trustSignals.includes(text)) {
            trustSignals.push(text);
          }
        }

        // 8. Micro-testimonial in hero
        let heroMicroTestimonial = "";
        const allText = toArray(document.querySelectorAll("p, span, blockquote, q, [class*='testimonial'], [class*='quote'], [class*='avis']"));
        for (let i = 0; i < allText.length; i++) {
          const el = allText[i];
          if (!isInViewport(el)) continue;
          const text = clean(el.textContent || "");
          if (text.length > 20 && text.length < 300 && /^[\u201C\u201D\u00AB\u00BB"'\u2018\u2019]/.test(text)) {
            heroMicroTestimonial = text;
            break;
          }
        }

        // 9. Image/video presence in hero
        let hasHeroImage = false;
        let hasHeroVideo = false;
        const imgCandidates = toArray(document.querySelectorAll("img, picture, [style]"));
        for (let i = 0; i < imgCandidates.length; i++) {
          const el = imgCandidates[i];
          if (!isInViewport(el)) continue;
          if (el.tagName === "IMG" || el.tagName === "PICTURE") {
            const rect = el.getBoundingClientRect();
            if (rect.width > 80 && rect.height > 80) {
              hasHeroImage = true;
              break;
            }
          }
          const style = window.getComputedStyle(el);
          if (style.backgroundImage && style.backgroundImage !== "none") {
            hasHeroImage = true;
            break;
          }
        }
        const vidCandidates = toArray(document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="loom"]'));
        for (let i = 0; i < vidCandidates.length; i++) {
          if (isInViewport(vidCandidates[i])) {
            hasHeroVideo = true;
            break;
          }
        }

        // 10. All visible text in viewport (heroRawText)
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        const visibleTexts: string[] = [];
        let totalLen = 0;
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const parent = node.parentElement;
          if (!parent) continue;
          if (parent.tagName === "SCRIPT" || parent.tagName === "STYLE" || parent.tagName === "NOSCRIPT") continue;
          if (!isInViewport(parent)) continue;
          const t = (node.textContent || "").trim();
          if (t.length > 0) {
            visibleTexts.push(t);
            totalLen += t.length;
            if (totalLen > 2000) break;
          }
        }
        const heroRawText = visibleTexts.join(" ").substring(0, 1500);

        // 11. Meta
        const title = document.title || "";
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ||
                         document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";

        return {
          title: clean(title),
          metaDescription: clean(metaDesc),
          heroHeadline,
          heroSubheadline,
          heroCTAs: heroCTAs.slice(0, 8),
          hasHeroImage,
          hasHeroVideo,
          trustSignals: trustSignals.slice(0, 5),
          heroLogos,
          heroNumbers: heroNumbers.slice(0, 5),
          heroMicroTestimonial,
          navigationItems: navItems.slice(0, 10),
          heroRawText,
        };
      }, VIEWPORT_HEIGHT);

      return heroData;
    } finally {
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

// Fallback: fetch HTTP statique + parsing heuristique (pas de viewport)
async function scrapeHeroFallback(url: string): Promise<ScrapedContent> {
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
    const html = await response.text();

    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    $("script, style, noscript, svg").remove();

    const title = cleanText($("title").text());
    const metaDescription =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") || "";

    const heroHeadline = cleanText($("h1").first().text()) || "";
    const heroSubheadline = cleanText($("h2").first().text()) || cleanText($("h1 + p, h1 ~ p").first().text()) || "";

    const heroCTAs: string[] = [];
    $('a[href*="contact"], a[href*="calendly"], a[href*="book"], a[href*="devis"], button[type="submit"], .cta, [class*="cta"], [class*="btn"]')
      .each((_, el) => {
        const text = cleanText($(el).text());
        if (text.length > 0 && text.length < 80) heroCTAs.push(text);
      });

    const navigationItems: string[] = [];
    $("nav a, header a").each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length > 0 && text.length < 60) navigationItems.push(text);
    });

    const heroRawText = cleanText($("body").text()).substring(0, 1500);

    return {
      title,
      metaDescription: cleanText(metaDescription),
      heroHeadline,
      heroSubheadline,
      heroCTAs: heroCTAs.slice(0, 8),
      hasHeroImage: $("img").length > 0,
      hasHeroVideo: $("video, iframe[src*='youtube'], iframe[src*='vimeo']").length > 0,
      trustSignals: [],
      heroLogos: 0,
      heroNumbers: [],
      heroMicroTestimonial: "",
      navigationItems: navigationItems.slice(0, 10),
      heroRawText,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function scrapeWebsite(rawUrl: string): Promise<ScrapedContent> {
  const url = normalizeUrl(rawUrl);

  try {
    return await scrapeHeroWithPlaywright(url);
  } catch (e) {
    console.log("[scraper] Playwright indisponible, fallback fetch statique:", (e as Error).message.substring(0, 80));
    try {
      return await scrapeHeroFallback(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        title: "",
        metaDescription: "",
        heroHeadline: "",
        heroSubheadline: "",
        heroCTAs: [],
        hasHeroImage: false,
        hasHeroVideo: false,
        trustSignals: [],
        heroLogos: 0,
        heroNumbers: [],
        heroMicroTestimonial: "",
        navigationItems: [],
        heroRawText: "",
        error: `Impossible d'accéder au site : ${errorMessage}`,
      };
    }
  }
}
