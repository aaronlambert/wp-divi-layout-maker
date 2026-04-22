export type DeviceLayout = {
  desktop: string;
  tablet: string;
  phone: string;
};

export type SectionType =
  | "hero"
  | "feature_cards"
  | "about"
  | "services"
  | "blog"
  | "events"
  | "quick_info"
  | "cta_band"
  | "testimonials"
  | "contact"
  | "custom";

export type ModuleSpec = {
  id: string;
  type: "text" | "image" | "button" | "menu" | "form" | "blog" | "video" | "icon" | "social" | "divider";
  adminLabel: string;
  content?: Record<string, string>;
  styles?: Record<string, string>;
};

export type PageSection = {
  id: string;
  type: SectionType;
  adminLabel: string;
  layout: DeviceLayout;
  modules: ModuleSpec[];
  styles: Record<string, string>;
  notes: string[];
  confidence: number;
};

export type GlobalRegion = {
  adminLabel: string;
  layout: DeviceLayout;
  modules: ModuleSpec[];
  styles: Record<string, string>;
  notes: string[];
  confidence: number;
};

export type PageSpec = {
  pageType: "homepage";
  globalRegions: {
    header: GlobalRegion;
    footer: GlobalRegion;
  };
  brand: {
    colors: string[];
    typography: string[];
    styleNotes: string[];
  };
  sections: PageSection[];
  warnings: string[];
};

export type GeneratedArtifacts = {
  pageSpec: PageSpec;
  divi: {
    header: Record<string, unknown>;
    body: Record<string, unknown>;
    footer: Record<string, unknown>;
  };
  css: string;
  summary: string;
  warnings: string[];
};
