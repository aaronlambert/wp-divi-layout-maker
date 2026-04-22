import { z } from "zod";
import { getOpenAIClient } from "./openai";
import { GeneratedArtifacts, ModuleSpec, PageSection, PageSpec } from "./types";

const moduleSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "image", "button", "menu", "form", "blog", "video", "icon", "social", "divider"]),
  adminLabel: z.string(),
  content: z.record(z.string()).optional().default({}),
  styles: z.record(z.string()).optional().default({})
});

const regionSchema = z.object({
  adminLabel: z.string(),
  layout: z.object({
    desktop: z.string(),
    tablet: z.string(),
    phone: z.string()
  }),
  modules: z.array(moduleSchema).default([]),
  styles: z.record(z.string()).default({}),
  notes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1)
});

const pageSectionSchema = regionSchema.extend({
  id: z.string(),
  type: z.enum([
    "hero",
    "feature_cards",
    "about",
    "services",
    "blog",
    "events",
    "quick_info",
    "cta_band",
    "testimonials",
    "contact",
    "custom"
  ])
});

const pageSpecSchema = z.object({
  pageType: z.literal("homepage"),
  globalRegions: z.object({
    header: regionSchema,
    footer: regionSchema
  }),
  brand: z.object({
    colors: z.array(z.string()).default([]),
    typography: z.array(z.string()).default([]),
    styleNotes: z.array(z.string()).default([])
  }),
  sections: z.array(pageSectionSchema).default([]),
  warnings: z.array(z.string()).default([])
});

const visionPrompt = `Analyze this homepage mockup image and return JSON only.\n
Requirements:\n- Detect and classify global header, hero, main sections, and global footer.\n- Do not skip header/footer even if ambiguous; include best-effort notes and confidence.\n- Include responsive behavior assumptions for desktop/tablet/phone.\n- Use stable section/module abstractions suitable for Divi.\n- Use placeholder content where text is unclear.\n
Return EXACT schema:\n{
  "pageType": "homepage",
  "globalRegions": {
    "header": { "adminLabel": "", "layout": { "desktop": "", "tablet": "", "phone": "" }, "modules": [], "styles": {}, "notes": [], "confidence": 0.0 },
    "footer": { "adminLabel": "", "layout": { "desktop": "", "tablet": "", "phone": "" }, "modules": [], "styles": {}, "notes": [], "confidence": 0.0 }
  },
  "brand": { "colors": [], "typography": [], "styleNotes": [] },
  "sections": [
    { "id": "", "type": "hero|feature_cards|about|services|blog|events|quick_info|cta_band|testimonials|contact|custom", "adminLabel": "", "layout": { "desktop": "", "tablet": "", "phone": "" }, "modules": [], "styles": {}, "notes": [], "confidence": 0.0 }
  ],
  "warnings": []
}`;

function toDiviModule(module: ModuleSpec): Record<string, unknown> {
  return {
    type: module.type,
    admin_label: module.adminLabel,
    attrs: {
      ...module.content,
      ...module.styles
    }
  };
}

function toDiviSection(section: PageSection): Record<string, unknown> {
  return {
    type: "section",
    admin_label: section.adminLabel,
    css_class: `od-${section.id}`,
    layout: section.layout,
    styles: section.styles,
    notes: section.notes,
    rows: [
      {
        type: "row",
        admin_label: `${section.adminLabel} Row`,
        columns: [
          {
            type: "column",
            modules: section.modules.map(toDiviModule)
          }
        ]
      }
    ]
  };
}

export async function analyzeMockupImage(imageDataUrl: string): Promise<unknown> {
  const client = getOpenAIClient();

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: visionPrompt },
          { type: "input_image", image_url: imageDataUrl, detail: "high" }
        ]
      }
    ],
    text: {
      format: {
        type: "json_object"
      }
    }
  });

  const raw = response.output_text || "{}";
  return JSON.parse(raw);
}

export function normalizePageSpec(raw: unknown): PageSpec {
  const parsed = pageSpecSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  const fallback: PageSpec = {
    pageType: "homepage",
    globalRegions: {
      header: {
        adminLabel: "Global Header",
        layout: { desktop: "1/3 + 2/3", tablet: "stacked", phone: "stacked" },
        modules: [],
        styles: {},
        notes: ["Fallback header created due to malformed AI output."],
        confidence: 0.2
      },
      footer: {
        adminLabel: "Global Footer",
        layout: { desktop: "1/2 + 1/2", tablet: "stacked", phone: "stacked" },
        modules: [],
        styles: {},
        notes: ["Fallback footer created due to malformed AI output."],
        confidence: 0.2
      }
    },
    brand: { colors: [], typography: [], styleNotes: [] },
    sections: [],
    warnings: ["The AI response was malformed. Generated a fallback editable page specification."]
  };

  return fallback;
}

export function validatePageSpec(spec: PageSpec): { spec: PageSpec; warnings: string[] } {
  const warnings = [...spec.warnings];

  if (!spec.globalRegions.header) {
    warnings.push("Header region was missing and has been injected.");
  }

  if (!spec.globalRegions.footer) {
    warnings.push("Footer region was missing and has been injected.");
  }

  if (!spec.sections.some((section) => section.type === "hero")) {
    warnings.push("No hero section detected. Added a placeholder hero section.");
    spec.sections.unshift({
      id: "hero",
      type: "hero",
      adminLabel: "Hero",
      layout: { desktop: "1/2 + 1/2", tablet: "stacked", phone: "stacked" },
      modules: [
        {
          id: "hero-heading",
          type: "text",
          adminLabel: "Hero Heading",
          content: { title: "Placeholder heading", body: "Update this with your real homepage message." },
          styles: {}
        }
      ],
      styles: {},
      notes: ["Placeholder hero inserted by validator."],
      confidence: 0.15
    });
  }

  spec.sections = spec.sections.map((section, index) => ({
    ...section,
    id: section.id || `section-${index + 1}`,
    modules: section.modules.length > 0 ? section.modules : [
      {
        id: `${section.id || `section-${index + 1}`}-text`,
        type: "text",
        adminLabel: `${section.adminLabel} Text`,
        content: { body: "Placeholder content" },
        styles: {}
      }
    ]
  }));

  return { spec: { ...spec, warnings }, warnings };
}

export function generateDiviHeaderJson(spec: PageSpec): Record<string, unknown> {
  return {
    template: "global_header",
    generated_at: new Date().toISOString(),
    content: toDiviSection({
      id: "header",
      type: "custom",
      ...spec.globalRegions.header
    })
  };
}

export function generateDiviBodyJson(spec: PageSpec): Record<string, unknown> {
  return {
    template: "homepage_body",
    generated_at: new Date().toISOString(),
    sections: spec.sections.map(toDiviSection)
  };
}

export function generateDiviFooterJson(spec: PageSpec): Record<string, unknown> {
  return {
    template: "global_footer",
    generated_at: new Date().toISOString(),
    content: toDiviSection({
      id: "footer",
      type: "custom",
      ...spec.globalRegions.footer
    })
  };
}

export function generateCompanionCss(spec: PageSpec): string {
  const cssLines = [
    "/* OpenDraft Divi companion stylesheet */",
    ".od-header { position: relative; }",
    ".od-hero { padding-block: clamp(3rem, 8vw, 7rem); }",
    ".od-feature-card, .od-feature_cards { border-radius: 12px; }",
    ".od-footer { padding-top: 3rem; }",
    "@media (max-width: 980px) {",
    "  .od-hero .et_pb_button { width: 100%; margin-bottom: 0.75rem; }",
    "}"
  ];

  spec.sections.forEach((section) => {
    cssLines.push(`.od-${section.id} {}`);
  });

  return cssLines.join("\n");
}

export function buildExportBundle(spec: PageSpec): GeneratedArtifacts {
  const header = generateDiviHeaderJson(spec);
  const body = generateDiviBodyJson(spec);
  const footer = generateDiviFooterJson(spec);
  const css = generateCompanionCss(spec);

  const summary = [
    "Generated Divi-ready draft from interpreted mockup.",
    `Header confidence: ${spec.globalRegions.header.confidence.toFixed(2)}`,
    `Footer confidence: ${spec.globalRegions.footer.confidence.toFixed(2)}`,
    `Detected ${spec.sections.length} main body sections.`,
    "This draft is intended for manual refinement inside Divi Builder."
  ].join(" ");

  return {
    pageSpec: spec,
    divi: { header, body, footer },
    css,
    summary,
    warnings: spec.warnings
  };
}

export async function generateFromImage(imageDataUrl: string): Promise<GeneratedArtifacts> {
  const analyzed = await analyzeMockupImage(imageDataUrl);
  const normalized = normalizePageSpec(analyzed);
  const { spec } = validatePageSpec(normalized);
  return buildExportBundle(spec);
}
