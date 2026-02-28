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

export interface ActionPlan {
  week1: string[];
  week2_3: string[];
  week4: string[];
}

export type PortfolioLevel = "vitrine" | "transition" | "vend";

export interface PreviousScore {
  score: number;
  level: PortfolioLevel;
  analyzedAt: string;
}

export interface AnalysisResult {
  url: string;
  totalScore: number;
  level: PortfolioLevel;
  verdict: string;
  axes: AxisResult[];
  quickWins: QuickWin[];
  plan30Days: ActionPlan;
  analyzedAt: string;
  previousScore?: PreviousScore | null;
  fromCache?: boolean;
}

export interface ScrapedContent {
  title: string;
  metaDescription: string;
  h1: string[];
  h2: string[];
  bodyText: string;
  ctaTexts: string[];
  testimonials: string[];
  navigationItems: string[];
  hasContactForm: boolean;
  hasTestimonials: boolean;
  hasCaseStudies: boolean;
  servicesText: string;
  aboutText: string;
  error?: string;
}
