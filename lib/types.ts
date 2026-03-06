export interface AxisResult {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  working: string[];
  blocking: string[];
  quickAction: string;
}

export interface QuickWin {
  title: string;
  description: string;
  effort: "faible" | "moyen" | "élevé";
  impact: "fort" | "moyen" | "faible";
}

export type HeroLevel = "fuite" | "confuse" | "convainc";

export interface PreviousScore {
  score: number;
  level: HeroLevel;
  analyzedAt: string;
}

export interface HeroRewrite {
  headline: string;
  subheadline: string;
  rationale: string;
}

export interface AnalysisResult {
  url: string;
  totalScore: number;
  level: HeroLevel;
  verdict: string;
  axes: AxisResult[];
  quickWins: QuickWin[];
  heroRewrite?: HeroRewrite;
  heroOriginal?: { headline: string; subheadline: string };
  analyzedAt: string;
  previousScore?: PreviousScore | null;
  fromCache?: boolean;
  scrapingWarnings?: Record<string, string>;
}

export interface ScrapedContent {
  // Meta
  title: string;
  metaDescription: string;

  // Hero-specific content
  heroHeadline: string;
  heroSubheadline: string;
  heroCTAs: string[];
  hasHeroImage: boolean;
  hasHeroVideo: boolean;

  // Trust signals in hero
  trustSignals: string[];
  heroLogos: number;
  heroNumbers: string[];
  heroMicroTestimonial: string;

  // Navigation (above the fold)
  navigationItems: string[];

  // Raw hero text for context
  heroRawText: string;

  // Error handling
  error?: string;
}
