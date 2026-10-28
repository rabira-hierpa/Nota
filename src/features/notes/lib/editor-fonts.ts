export type FontGroup = "Sans serif" | "Serif" | "Monospace" | "Amharic";

export interface EditorFont {
  id: string;
  label: string;
  group: FontGroup;
  /** The CSS font-family the editor stores on the text. */
  family: string;
}

// The variables come from src/lib/fonts.ts (next/font). Each Latin face is
// followed by a Ge'ez face of the same feel, because Latin fonts have no
// Amharic glyphs.
const ETHIOPIC_SANS = "var(--font-noto-ethiopic)";
const ETHIOPIC_SERIF = "var(--font-noto-serif-ethiopic)";

function font(id: string, label: string, group: FontGroup, variable: string, fallback: string): EditorFont {
  return { id, label, group, family: `var(${variable}), ${fallback}` };
}

export const FONT_GROUPS: readonly FontGroup[] = ["Sans serif", "Serif", "Monospace", "Amharic"];

export const EDITOR_FONTS: readonly EditorFont[] = [
  font("inter", "Inter", "Sans serif", "--font-inter", `${ETHIOPIC_SANS}, sans-serif`),
  font("roboto", "Roboto", "Sans serif", "--font-roboto", `${ETHIOPIC_SANS}, sans-serif`),
  font("open-sans", "Open Sans", "Sans serif", "--font-open-sans", `${ETHIOPIC_SANS}, sans-serif`),
  font("lato", "Lato", "Sans serif", "--font-lato", `${ETHIOPIC_SANS}, sans-serif`),
  font("montserrat", "Montserrat", "Sans serif", "--font-montserrat", `${ETHIOPIC_SANS}, sans-serif`),
  font("poppins", "Poppins", "Sans serif", "--font-poppins", `${ETHIOPIC_SANS}, sans-serif`),
  font("jakarta", "Plus Jakarta Sans", "Sans serif", "--font-jakarta", `${ETHIOPIC_SANS}, sans-serif`),
  font("lora", "Lora", "Serif", "--font-lora", `${ETHIOPIC_SERIF}, serif`),
  font("merriweather", "Merriweather", "Serif", "--font-merriweather", `${ETHIOPIC_SERIF}, serif`),
  font("playfair", "Playfair Display", "Serif", "--font-playfair", `${ETHIOPIC_SERIF}, serif`),
  font("source-serif", "Source Serif", "Serif", "--font-source-serif", `${ETHIOPIC_SERIF}, serif`),
  font("jetbrains-mono", "JetBrains Mono", "Monospace", "--font-jetbrains-mono", `${ETHIOPIC_SANS}, monospace`),
  font("noto-ethiopic", "Noto Sans Ethiopic", "Amharic", "--font-noto-ethiopic", "sans-serif"),
  font("noto-serif-ethiopic", "Noto Serif Ethiopic", "Amharic", "--font-noto-serif-ethiopic", "serif"),
  font("abyssinica", "Abyssinica SIL", "Amharic", "--font-abyssinica", `${ETHIOPIC_SERIF}, serif`),
];

/** The editor's own font: Noto Sans Ethiopic for Ge'ez, the interface font for Latin. */
export const DEFAULT_FONT_LABEL = "Default";

const FIRST_VARIABLE = /var\(\s*(--[\w-]+)\s*\)/;

/**
 * Which option a stored font-family is, or null for the default. Matched on
 * its first variable, since the browser may respace the value.
 */
export function editorFontOf(family: string | null | undefined): EditorFont | null {
  const variable = family?.match(FIRST_VARIABLE)?.[1];
  if (!variable) return null;
  return EDITOR_FONTS.find((option) => option.family.startsWith(`var(${variable})`)) ?? null;
}
