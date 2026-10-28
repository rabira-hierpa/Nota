import {
  Abyssinica_SIL,
  Inter,
  JetBrains_Mono,
  Lato,
  Lora,
  Merriweather,
  Montserrat,
  Noto_Sans_Ethiopic,
  Noto_Serif_Ethiopic,
  Open_Sans,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Roboto,
  Source_Serif_4,
} from "next/font/google";

// Every face is self-hosted by next/font, so the app never reaches Google.
// The interface font and the default Ge'ez face load up front; the editor's
// other choices load the first time a note uses them. The CSS variable names
// are what EDITOR_FONTS (features/notes/lib/editor-fonts.ts) refers to.

/** Interface font (ui-ux-pro-max's pick for productivity tools). */
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

// Latin faces have no Ge'ez glyphs; Amharic falls through to these.
const notoEthiopic = Noto_Sans_Ethiopic({ variable: "--font-noto-ethiopic", subsets: ["ethiopic"], display: "swap" });
const notoSerifEthiopic = Noto_Serif_Ethiopic({
  variable: "--font-noto-serif-ethiopic",
  subsets: ["ethiopic"],
  display: "swap",
  preload: false,
});
const abyssinica = Abyssinica_SIL({
  variable: "--font-abyssinica",
  weight: "400",
  subsets: ["ethiopic"],
  display: "swap",
  preload: false,
});

// next/font reads these options at build time, so each call spells them out.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap", preload: false });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], display: "swap", preload: false });
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"], display: "swap", preload: false });
const lato = Lato({ variable: "--font-lato", weight: ["400", "700"], subsets: ["latin"], display: "swap", preload: false });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], display: "swap", preload: false });
const poppins = Poppins({ variable: "--font-poppins", weight: ["400", "600", "700"], subsets: ["latin"], display: "swap", preload: false });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap", preload: false });
const merriweather = Merriweather({ variable: "--font-merriweather", subsets: ["latin"], display: "swap", preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], display: "swap", preload: false });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], display: "swap", preload: false });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap", preload: false });

/** Class names that define every font variable; put them on <html>. */
export const fontVariables = [
  jakarta,
  notoEthiopic,
  notoSerifEthiopic,
  abyssinica,
  inter,
  roboto,
  openSans,
  lato,
  montserrat,
  poppins,
  lora,
  merriweather,
  playfair,
  sourceSerif,
  jetbrainsMono,
]
  .map((font) => font.variable)
  .join(" ");
