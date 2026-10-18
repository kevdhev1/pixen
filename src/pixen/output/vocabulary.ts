/* Closed vocabulary of section tags */
export const SECTION_LABELS = [
  // HTML semantic elements
  "header",
  "nav",
  "main",
  "section",
  "article",
  "aside",
  "footer",

  // Common landing page patterns
  "hero",
  "features",
  "pricing",
  "testimonials",
  "gallery",
  "cta",
  "form",
  "faq",
  "contact",

  // Fallback
  "unknown",
] as const;

/* Array-derived type */
export type SectionLabel = (typeof SECTION_LABELS)[number];

/* Type guard */
export function isSectionLabel(value: string): value is SectionLabel {
  return (SECTION_LABELS as readonly string[]).includes(value);
}
