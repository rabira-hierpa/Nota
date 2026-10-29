import type { Messages } from "@/lib/i18n/en";
import { DESKTOP_ERRORS } from "@/lib/desktop";
import { amharicMessages, ENGINE_MESSAGES, HANDLER_ERRORS, MODEL_NAMES } from "@shared/messages";
import type { LocalModelMessage } from "@shared/messages";
import type { LocalModelId } from "@shared/types/engine";

/*
 * The interface in Amharic. Buttons and menu items are short commands
 * (ቅዳ, ለጥፍ, ደርድር), as in Amharic software; sentences that speak to the
 * user are polite (ይጻፉ, ይሞክሩ). Product and file names stay as they are.
 */

const HANDLER_AM: Record<keyof typeof HANDLER_ERRORS, string> = {
  invalid: "ጥያቄው ትክክል አልነበረም።",
  notFound: "ያ ማስታወሻ ከአሁን በኋላ የለም።",
  state: "ይህን አሁን በዚህ ማስታወሻ ላይ ማድረግ አይቻልም።",
  locked: "የተቆለፉ ማስታወሻዎች የይለፍ ቃልዎን ይፈልጋሉ። ይክፈቷቸውና እንደገና ይሞክሩ።",
  wrongPassword: "ያ የይለፍ ቃል ትክክል አይደለም።",
  noModel: "ያ የንግግር ሞዴል አይገኝም። ሌላ ይምረጡ።",
  setupRunning: "አንድ ማዋቀር አስቀድሞ እየሰራ ነው። እስኪጨርስ ይጠብቁ።",
  tooLarge: "ያ ፋይል ወደ ጽሑፍ ለመቀየር በጣም ትልቅ ነው። 30 ደቂቃ ወይም ከዚያ ያነሰ ቅጂ ይምረጡ።",
  generic: "የሆነ ችግር ተፈጥሯል። እንደገና ይሞክሩ።",
};

const ENGINE_AM: Record<keyof typeof ENGINE_MESSAGES, string> = {
  notRunning: "VoiceStudio እየሰራ አይደለም። VoiceStudioን ይክፈቱ፣ ሞተሩ እስኪጀምር ይጠብቁ፣ ከዚያ እንደገና ይሞክሩ።",
  timedOut: "VoiceStudio ለመመለስ በጣም ዘገየ። አጭር ቅጂ ይሞክሩ።",
  noModel: "VoiceStudio የንግግር ማወቂያ ሞዴል አልተጫነለትም። ከModel Catalogue አንዱን ይጫኑ።",
  badKey: "VoiceStudio የAPI ቁልፉን አልተቀበለም። OMNIVOICE_API_KEYን ያረጋግጡ።",
  licence:
    "VoiceStudio መጀመሪያ የዚህን የንግግር ሞዴል ፈቃድ እንዲቀበሉ ይፈልጋል። በVoiceStudio ውስጥ Model Catalogueን ከፍተው ይቀበሉት፣ ከዚያ «ወደ ጽሑፍ ቀይር»ን እንደገና ይጫኑ።",
  unexpected: "VoiceStudio ይህ መተግበሪያ የማይረዳውን ምላሽ ልኳል።",
};

function modelAm(name: string): Record<LocalModelMessage, string> {
  return {
    notSetUp: `${name} ገና አልተዘጋጀም። ቅንብሮችን፣ ከዚያ የማዋቀሪያ መመሪያውን ከፍተው ያዘጋጁት።`,
    failedToStart: `${name} መጀመር አልቻለም። በቅንብሮች ውስጥ ካለው የማዋቀሪያ መመሪያ እንደገና ያዘጋጁት።`,
    failed: `${name} ይህን ቅጂ ወደ ጽሑፍ መቀየር አልቻለም። እንደገና ይሞክሩ።`,
    stopped: `${name} ሳይጠበቅ ቆመ። እንደገና ይሞክሩ።`,
    timedOut: `${name} በጣም ዘገየ። አጭር ቅጂ ይሞክሩ።`,
  };
}

const DESKTOP_AM: Record<keyof typeof DESKTOP_ERRORS, string> = {
  missing: "ይህ ገጽ የሚሰራው በዴስክቶፕ መተግበሪያው ውስጥ ብቻ ነው። በ`npm run dev` ያስጀምሩት።",
  unresponsive: "የዴስክቶፕ መተግበሪያው ምላሽ አልሰጠም። እንደገና ይሞክሩ።",
};

function pairs<K extends string>(english: Record<K, string>, amharic: Record<K, string>): [string, string][] {
  return (Object.keys(english) as K[]).map((key) => [english[key], amharic[key]]);
}

const LOCAL_MODELS: readonly LocalModelId[] = ["hohe", "buzzasr"];

/** Messages that arrive as English text (from the main process), by their English wording. */
const ARRIVING: ReadonlyMap<string, string> = new Map([
  ...pairs(HANDLER_ERRORS, HANDLER_AM),
  ...pairs(ENGINE_MESSAGES, ENGINE_AM),
  ...pairs(DESKTOP_ERRORS, DESKTOP_AM),
  ...LOCAL_MODELS.flatMap((model) => pairs(amharicMessages(model), modelAm(MODEL_NAMES[model]))),
]);

const HTTP_ANSWER = /^VoiceStudio answered with HTTP (\d{3})\.$/;

function translate(text: string): string {
  const known = ARRIVING.get(text);
  if (known) return known;
  const status = HTTP_ANSWER.exec(text)?.[1];
  return status ? `VoiceStudio በHTTP ${status} መለሰ።` : text;
}

export const am: Messages = {
  translate,
  common: {
    cancel: "ይቅር",
    close: "ዝጋ",
    back: "ተመለስ",
    next: "ቀጣይ",
    retry: "እንደገና ሞክር",
    tryAgain: "እንደገና ሞክር",
    dismiss: "ዝጋ",
    untitled: "ርዕስ የሌለው",
    copied: "ተቀድቷል",
    copyCommand: "ትዕዛዙን ቅዳ",
  },
  app: {
    errorTitle: "የሆነ ችግር ተፈጥሯል",
    errorBody: "ማስታወሻዎችዎ በኮምፒውተሩ ላይ በደህና ተቀምጠዋል። ገጹን እንደገና ለመጫን ይሞክሩ።",
  },
  errors: {
    noModel: "እስካሁን የንግግር ሞዴል የለም። በጎን አሞሌው ግርጌ ያለውን ሁኔታ ይመልከቱ።",
    setupFailed: "ማዋቀሩ ሳይጠናቀቅ ቆሟል። ምክንያቱ ከላይ ባሉት መስመሮች ተገልጿል፤ ያንን አስተካክለው እንደገና ይሞክሩ።",
    notAudio: "ይህ ቅጂ አይደለም። m4a፣ mp3፣ wav፣ ogg ወይም opus ፋይል ይጣሉ።",
    recordingTooShort: "ቅጂው በጣም አጭር ነበር። እንደገና ይሞክሩ።",
    recordingFailed: "ቅጂውን ማስኬድ አልተቻለም። እንደገና ይሞክሩ።",
    clipFailed: (detail: string) => `ከተናገሩት ከፊሉን ወደ ጽሑፍ መቀየር አልተቻለም። ${translate(detail)}`,
    microphone: {
      blocked:
        "ማይክሮፎን መጠቀም ታግዷል። በSystem Settings → Privacy & Security → Microphone ውስጥ ይፍቀዱት፣ ከዚያ እንደገና ይሞክሩ።",
      notFound: "ማይክሮፎን አልተገኘም። አንዱን ያገናኙና እንደገና ይሞክሩ።",
      inUse: "ማይክሮፎኑን ሌላ መተግበሪያ እየተጠቀመበት ነው።",
      gone: "ያ ማይክሮፎን ከአሁን በኋላ አልተገናኘም። ሌላ ይምረጡ።",
      failed: "መቅረጽ መጀመር አልተቻለም። እንደገና ይሞክሩ።",
      silentFrom: (label: string) => `ከ«${label}» ምንም ድምፅ አልመጣም። ሌላ ማይክሮፎን መርጠው እንደገና ይሞክሩ።`,
      silent: "ምንም ድምፅ አልተቀረጸም። ማይክሮፎንዎን አረጋግጠው እንደገና ይሞክሩ።",
    },
    import: {
      tooLong: (length: string, max: string) =>
        `ቅጂው ${length} ይረዝማል። Nota በአንድ ጊዜ እስከ ${max} ድረስ ብቻ ወደ ጽሑፍ ይቀይራል፤ መጀመሪያ ይክፈሉት።`,
      tooShort: "ቅጂው ወደ ጽሑፍ ለመቀየር በጣም አጭር ነው።",
      silent: "ቅጂው ጸጥ ያለ ነው፤ ወደ ጽሑፍ የሚቀየር ነገር የለም።",
      unreadable: (name: string) => `«${name}»ን ማንበብ አልተቻለም። m4a፣ mp3፣ wav፣ ogg ወይም opus ቅጂ ይምረጡ።`,
    },
  },
  dates: {
    today: "ዛሬ",
    yesterday: "ትናንት",
    gregorianLocale: "am",
    comma: "፣ ",
  },
  sections: {
    all: "ማስታወሻዎች",
    today: "ዛሬ",
    todo: "የሚሠሩ",
    favorites: "ተወዳጆች",
    untagged: "መለያ የሌላቸው",
    voice: "የድምፅ ማስታወሻዎች",
    archive: "ማህደር",
    trash: "መጣያ",
  },
  sidebar: {
    label: "የጎን አሞሌ",
    library: "ቤተ መጻሕፍት",
    hide: "የጎን አሞሌውን ደብቅ (⌘⌥S)",
    show: "የጎን አሞሌውን አሳይ (⌘⌥S)",
    tags: "መለያዎች",
    tagHintBefore: "በማስታወሻ ውስጥ",
    tagHintAfter: "ብለው ይጻፉ፤ እዚህ ይመደባል።",
    expandTag: (path: string) => `#${path} ዘርጋ`,
    collapseTag: (path: string) => `#${path} ሰብስብ`,
  },
  list: {
    region: "ማስታወሻዎች",
    notesIn: (section: string) => `${section} ዝርዝር`,
    newNote: "አዲስ ማስታወሻ (⌘N)",
    transcribeRecording: "ቅጂን ወደ ጽሑፍ ቀይር (⌘⇧O)",
    readingRecording: "ቅጂውን በማንበብ ላይ…",
    emptyTrash: "መጣያውን አጽዳ",
    confirmEmptyTrash: (count: number) =>
      count === 1
        ? "በመጣያው ያለው ማስታወሻ ለዘለቄታው ይሰረዝ? ይህ ሊቀለበስ አይችልም።"
        : `በመጣያው ያሉት ${count} ማስታወሻዎች በሙሉ ለዘለቄታው ይሰረዙ? ይህ ሊቀለበስ አይችልም።`,
    dropRecording: "ወደ ጽሑፍ ለመቀየር ቅጂውን እዚህ ይጣሉ",
    noMatchBefore: (section: string) => `በ${section} ውስጥ «`,
    noMatchAfter: "» የሚል ምንም የለም።",
    searchAll: "በሁሉም ማስታወሻዎች ውስጥ ፈልግ",
    empty: {
      all: "እስካሁን ማስታወሻ የለም። በ⌘N ይጻፉ፣ ወይም በማይክሮፎኑ ይናገሩ።",
      today: "ዛሬ የተጻፈ ወይም የተቀየረ ነገር እስካሁን የለም።",
      todo: "ያልተጠናቀቀ የማረጋገጫ ንጥል የለም። በማረጋገጫ ዝርዝር ቁልፉ አንዱን ያክሉ።",
      archive: "ሊያቆዩዋቸው የሚፈልጉትን፣ ግን በየቀኑ ማየት የማይፈልጉትን ማስታወሻዎች ወደ ማህደር ያስገቡ።",
      favorites: "ማስታወሻ እዚህ እንዲቀመጥ በኮከብ ምልክት ያድርጉበት።",
      untagged: "ሁሉም ማስታወሻዎች መለያ አላቸው።",
      voice: "በማይክሮፎን የሚቀርጿቸው ወይም ወደ ጽሑፍ የሚቀይሯቸው ቅጂዎች እዚህ ይሰበሰባሉ።",
      trash: "መጣያው ባዶ ነው።",
      tag: (path: string) => `#${path} የሚል መለያ ያለው ማስታወሻ የለም።`,
    },
  },
  search: {
    label: "ማስታወሻዎችን ፈልግ",
    placeholder: "ማስታወሻ ወይም #መለያ ይፈልጉ",
    clear: "ፍለጋውን አጽዳ",
  },
  sort: {
    label: "ማስታወሻዎችን ደርድር በ",
    edited: "የተቀየረበት ቀን",
    created: "የተፈጠረበት ቀን",
    title: "ርዕስ",
    sortedBy: (order: string) => `በ${order} ደርድር`,
  },
  item: {
    transcribing: "ወደ ጽሑፍ በመቀየር ላይ…",
    voiceNote: "የድምፅ ማስታወሻ",
    newNote: "አዲስ ማስታወሻ",
    pinned: "የተሰካ",
    favorite: "ተወዳጅ",
    locked: "የተቆለፈ",
    unlocked: "የተከፈተ",
    hasRecording: "ቅጂ አለው",
  },
  record: {
    start: "የድምፅ ማስታወሻ ቅረጽ",
    stop: "መቅረጽ አቁም",
    starting: "ማይክሮፎኑን በማስጀመር ላይ…",
    saving: "በማስቀመጥ ላይ…",
  },
  microphone: {
    label: "ማይክሮፎን",
    none: "ማይክሮፎን አልተገኘም",
  },
  header: {
    edited: (when: string) => `የተቀየረው ${when}`,
    words: (count: string, n: number) => `${count} ${n === 1 ? "ቃል" : "ቃላት"}`,
    infoHint: "የማስታወሻ መረጃ (⌘⇧I)",
    infoSuffix: "፦ የማስታወሻ መረጃ",
    pinned: "የተሰካ።",
    locked: "የተቆለፈ።",
    saving: "በማስቀመጥ ላይ…",
    saved: "ተቀምጧል",
    saveFailed: "ለውጥዎን ማስቀመጥ አልተቻለም",
    tooLong: "ለማስቀመጥ በጣም ረጅም ነው። ለሁለት ማስታወሻዎች ይክፈሉት።",
    zen: "የትኩረት ሁነታ (⌘⇧F)",
    leaveZen: "ከትኩረት ሁነታ ውጣ (Esc)",
    addFavorite: "ወደ ተወዳጆች አክል",
    removeFavorite: "ከተወዳጆች አስወግድ",
  },
  dictate: {
    start: "በድምፅ ጻፍ",
    hint: "በድምፅ ጻፍ፦ ይናገሩ፤ ጽሑፉ ከእያንዳንዱ ቆም ማለት በኋላ ይታያል",
    stop: "በድምፅ መጻፍ አቁም",
    starting: "በማስጀመር ላይ…",
    finishing: "በማጠናቀቅ ላይ…",
  },
  menu: {
    more: "ተጨማሪ ድርጊቶች",
    label: "የማስታወሻ ድርጊቶች",
    pin: "ከላይ ሰካ",
    unpin: "ንቀል",
    archive: "ወደ ማህደር አስገባ",
    unarchive: "ከማህደር አውጣ",
    lock: "ማስታወሻውን ቆልፍ",
    unlock: "ቁልፉን አንሳ",
    trash: "ወደ መጣያ ውሰድ",
    export: "ወደ ውጭ ላክ",
    markdown: "Markdown",
    html: "ድረ-ገጽ (HTML)",
    text: "ተራ ጽሑፍ",
    exported: "ተልኳል።",
  },
  info: {
    title: "የማስታወሻ መረጃ",
    created: "የተፈጠረው",
    modified: "የተቀየረው",
    recording: "ቅጂ",
    paragraphs: (n: number) => (n === 1 ? "አንቀጽ" : "አንቀጾች"),
    words: (n: number) => (n === 1 ? "ቃል" : "ቃላት"),
    characters: (n: number) => (n === 1 ? "ፊደል" : "ፊደላት"),
    withoutSpaces: (count: string) => `ክፍተቶች ሳይቆጠሩ ${count} ፊደላት`,
  },
  assist: {
    button: "አጠቃልል እና አደራጅ",
    title: "አጠቃልል እና አደራጅ",
    subtitle: "በዚህ ኮምፒውተር ላይ፣ ያለ ኢንተርኔት የተሰራ። ምንም ቃል አልተቀየረም።",
    summary: "ማጠቃለያ",
    keySentences: "ዋና ዓረፍተ ነገሮች",
    addSummary: "ከርዕሱ ስር አክል",
    tooShort: "ለማጠቃለል በጣም አጭር ነው፤ ሦስት ወይም ከዚያ በላይ ዓረፍተ ነገሮች ያስፈልጋሉ።",
    paragraphs: "አንቀጾች",
    canSplit: (n: number) =>
      n === 1 ? "አንድ ረጅም አንቀጽ ርዕሱ በሚቀየርበት ቦታ ሊከፈል ይችላል።" : `${n} ረጅም አንቀጾች ርዕሱ በሚቀየርበት ቦታ ሊከፈሉ ይችላሉ።`,
    split: "በአንቀጾች ከፋፍል",
    noSplit: "መከፈል የሚያስፈልገው ረጅም አንቀጽ የለም።",
    tags: "የሚጠቆሙ መለያዎች",
    fromLibrary: "እንደዚህ ያሉ ማስታወሻዎች ይህን መለያ ይዘዋል",
    fromKeyword: "ይህ ማስታወሻ ይህን ቃል ደጋግሞ ይጠቅሳል",
    newTag: "(አዲስ መለያ)",
    noTags: "እስካሁን የሚጠቆም የለም። መለያዎች ከተመሳሳይ ማስታወሻዎች እና ማስታወሻው ከሚደጋግማቸው ቃላት ይመጣሉ።",
  },
  editor: {
    label: "ማስታወሻ",
    titlePlaceholder: "ርዕስ",
    transcribing: "ቅጂዎን ወደ ጽሑፍ በመቀየር ላይ…",
    pending: "ይህ ቅጂ ገና ወደ ጽሑፍ አልተቀየረም። ከታች «ወደ ጽሑፍ ቀይር»ን ይጫኑ፣ ወይም ይጻፉ።",
    write: "ይጻፉ፣ ወይም «በድምፅ ጻፍ»ን ተጭነው ይናገሩ",
  },
  toolbar: {
    label: "ቅርጸት",
    font: "የፊደል አይነት",
    defaultFont: "መደበኛ",
    style: "የጽሑፍ ዘይቤ",
    blocks: { paragraph: "መደበኛ ጽሑፍ", h1: "ርዕስ 1", h2: "ርዕስ 2", h3: "ርዕስ 3" },
    fontGroups: { "Sans serif": "ሳንስ ሰሪፍ", Serif: "ሰሪፍ", Monospace: "እኩል ስፋት", Amharic: "አማርኛ" },
    bold: "ደማቅ (⌘B)",
    italic: "ሰያፍ (⌘I)",
    underline: "ከስር አስምር (⌘U)",
    strike: "በላይ ሰርዝ",
    highlight: "አድምቅ",
    bulletList: "ነጥብ ያለው ዝርዝር",
    orderedList: "ቁጥር ያለው ዝርዝር",
    taskList: "የማረጋገጫ ዝርዝር",
    quote: "ጥቅስ",
    codeBlock: "የኮድ ክፍል",
    divider: "መለያ መስመር",
  },
  audio: {
    play: "አጫውት",
    pause: "ለአፍታ አቁም",
    position: "የማጫወቻ ቦታ",
    by: (name: string) => `በ${name}`,
    transcribe: "ወደ ጽሑፍ ቀይር",
    transcribeAgain: "እንደገና ወደ ጽሑፍ ቀይር",
    confirmReplace: "የዚህ ማስታወሻ ጽሑፍ በቅጂው አዲስ ግልባጭ ይተካ?",
    badges: { transcribing: "በመቀየር ላይ…", pending: "ወደ ጽሑፍ አልተቀየረም", done: "ወደ ጽሑፍ ተቀይሯል", error: "አልተሳካም" },
  },
  trash: {
    banner: "ይህ ማስታወሻ መጣያ ውስጥ ነው።",
    restore: "መልስ",
    deleteForever: "ለዘለቄታው ሰርዝ",
    confirmDelete: "ይህ ማስታወሻ ለዘለቄታው ይሰረዝ? ቅጂውም አብሮ ይሰረዛል። ይህ ሊቀለበስ አይችልም።",
  },
  backlinks: { title: "ወደዚህ የሚያገናኙ" },
  emptyNote: {
    body: "ማስታወሻ ይጻፉ፣ ወይም በአማርኛ ይናገሩ፦ ይቅረጹት፣ ወይም በድምፅ ይጻፉና ቃላቱ ሲታዩ ይመልከቱ።",
    newNote: "አዲስ ማስታወሻ",
  },
  lock: {
    lockedNote: "የተቆለፈ ማስታወሻ",
    isLocked: "ይህ ማስታወሻ ተቆልፏል።",
    password: "የይለፍ ቃል",
    unlock: "ማስታወሻዎችን ክፈት",
    unlocking: "በመክፈት ላይ…",
    hint: "እንደገና እስኪቆልፏቸው ወይም ማክ እስኪተኛ ድረስ ሁሉንም የተቆለፉ ማስታወሻዎች ይከፍታል።",
    elsewhere: "ይህ ማስታወሻ በዚህ ማክ ላይ በሌለ የይለፍ ቃል ስለተቆለፈ እዚህ ሊከፈት አይችልም።",
    enterPassword: "የይለፍ ቃልዎን ያስገቡ።",
  },
  setPassword: {
    title: "ለተቆለፉ ማስታወሻዎች የይለፍ ቃል ያዘጋጁ",
    body: "የተቆለፉ ማስታወሻዎች በዚህ የይለፍ ቃል ይመሰጠራሉ። ከረሱት፣ እርስዎን ጨምሮ ማንም ሊከፍታቸው አይችልም።",
    password: "የይለፍ ቃል",
    again: "እንደገና ይጻፉት",
    understood: "የተረሳ የይለፍ ቃል መመለስ እንደማይቻል ተረድቻለሁ።",
    setAndLock: "የይለፍ ቃሉን አዘጋጅና ቆልፍ",
    set: "የይለፍ ቃሉን አዘጋጅ",
    minLength: (n: number) => `ቢያንስ ${n} ፊደላት ይጠቀሙ።`,
    tick: "መረዳትዎን ለማረጋገጥ ይህን ምልክት ያድርጉ።",
    mismatch: "የይለፍ ቃሎቹ አይመሳሰሉም።",
  },
  settings: {
    button: "ቅንብሮች",
    hint: "ቅንብሮች (⌘,)",
    language: "ቋንቋ",
    appearance: "ገጽታ",
    system: "ሲስተም",
    light: "ብርሃን",
    dark: "ጨለማ",
    dates: "ቀኖች",
    gregorian: "ግሪጎሪያን",
    ethiopian: "ኢትዮጵያ",
    both: "ሁለቱም",
    today: "ዛሬ፦",
    lockedNotes: "የተቆለፉ ማስታወሻዎች",
    noPassword: "እስካሁን የይለፍ ቃል የለም፤ ማስታወሻዎችን ለመቆለፍ አንድ ያዘጋጁ።",
    unlocked: "የተቆለፉ ማስታወሻዎች እስኪቆልፏቸው ድረስ ክፍት ናቸው።",
    closed: "የተቆለፉ ማስታወሻዎች ዝግ ናቸው።",
    lockAll: "ሁሉንም ማስታወሻዎች አሁን ቆልፍ",
    setPassword: "የይለፍ ቃል ያዘጋጁ",
    shortcuts: "የቁልፍ ሰሌዳ አቋራጮች",
    guide: "የንግግር ማዋቀሪያ መመሪያ",
  },
  models: {
    label: "የንግግር ሞዴል",
    notSetUp: " (አልተዘጋጀም)",
    hohe: { option: "Hohe · ፈጣን (wav2vec2-BERT)", online: "Hohe ዝግጁ ነው", offline: "Hohe አልተዘጋጀም" },
    buzzasr: { option: "BuzzASR · Whisper large-v3", online: "BuzzASR ዝግጁ ነው", offline: "BuzzASR አልተዘጋጀም" },
    voicestudio: { option: "VoiceStudio", online: "VoiceStudio ተገናኝቷል", offline: "VoiceStudio አልተገናኘም" },
  },
  engine: {
    checking: "ንግግርን በማጣራት ላይ…",
    unavailable: "ንግግር አይገኝም",
    none: "የንግግር ሞዴል የለም",
  },
  shortcuts: { title: "የቁልፍ ሰሌዳ አቋራጮች" },
  onboarding: {
    guide: "የማዋቀሪያ መመሪያ",
    stepsLabel: "ደረጃዎች",
    steps: { welcome: "እንኳን ደህና መጡ", speech: "ከመስመር ውጭ ንግግር", microphone: "ማይክሮፎን", writing: "መጻፍ" },
    skip: "መመሪያውን ዝለል",
    start: "መጻፍ ጀምር",
    welcome: {
      title: "እንኳን ወደ Nota በደህና መጡ",
      points: [
        "በአማርኛ ወይም በእንግሊዝኛ ማስታወሻ ይጻፉ፤ በMarkdown ቅርጸት፣ በመለያዎች እና በአገናኞች።",
        "ከመተየብ ይልቅ ይናገሩ፦ የድምፅ ማስታወሻ ይቅረጹ፣ ወይም በድምፅ ይጻፉና ቃላቱ ሲታዩ ይመልከቱ።",
        "ሁሉም ነገር በዚህ ኮምፒውተር ላይ ይቀራል። ከአንድ ጊዜ ማዋቀር በኋላ ንግግርም ያለ ኢንተርኔት ይሰራል።",
      ],
    },
    speech: {
      voicestudio: "ይህ Nota ለንግግር VoiceStudioን እንዲጠቀም ስለተዘጋጀ እዚህ የሚዘጋጅ ነገር የለም።",
      introBefore: "Nota ንግግርን ወደ ጽሑፍ የሚቀይረው በ",
      introAfter:
        " ነው፤ ይህ በዚህ ኮምፒውተር ላይ የሚሰራ የአማርኛ የንግግር ሞዴል ነው። አንድ ጊዜ ማውረድ ያስፈልገዋል (ሞዴሉ 2.4 GB፣ የPython ማስኬጃው 0.6 GB ገደማ)። ከዚያ በኋላ ኢንተርኔት አያስፈልግም።",
      ready: "Hohe ዝግጁ ነው። ንግግር ያለ ኢንተርኔት ይሰራል።",
      running: "Hohe በመዘጋጀት ላይ…",
      notSetUp: "Hohe ገና አልተዘጋጀም።",
      setUp: "Hohe አዘጋጅ",
      needs: "Python 3.10 ወይም ከዚያ በላይ፣ ወይም uv ያስፈልጋል።",
      progress: "የማዋቀሩ ሂደት",
      terminalBefore: "ተርሚናል ይመርጣሉ? ከፕሮጀክቱ አቃፊ ውስጥ",
      terminalAfter: " ያስኪዱ። ይህን ዘልለው አሁን ማስታወሻ መጻፍም ይችላሉ፤ ንግግርን በኋላ ከቅንብሮች ማዘጋጀት ይቻላል።",
    },
    microphone: {
      intro: "የሚናገሩበትን ማይክሮፎን ይምረጡ። ለመጀመሪያ ጊዜ ሲቀርጹ ወይም በድምፅ ሲጽፉ Nota ፈቃድ ይጠይቃል።",
      record: "ቅረጽ",
      recordHint: " (ከማስታወሻ ዝርዝሩ በላይ ያለው ማይክሮፎን፣ ⌘⇧R)፦ የድምፅ ማስታወሻ፤ ሲያቆሙ ወደ ጽሑፍ ይቀየራል።",
      dictate: "በድምፅ ጻፍ",
      dictateHint: " (በማስታወሻ ውስጥ፣ ⌘⇧D)፦ ከእያንዳንዱ ቆም ማለት በኋላ ቃላቱ ጠቋሚው ባለበት ይታያሉ።",
    },
    writing: {
      intro: "Markdown ሲጽፉ ወዲያው ወደ ቅርጸት ይቀየራል፦",
      keys: {
        heading: "ርዕስ (## እና ### ለትናንሽ ርዕሶች)",
        bullet: "ነጥብ ያለው ዝርዝር",
        numbered: "ቁጥር ያለው ዝርዝር",
        check: "የማረጋገጫ ንጥል",
        quote: "ጥቅስ",
        codeBlock: "የኮድ ክፍል",
        bold: "ደማቅ",
        italic: "ሰያፍ",
        strike: "በላይ ሰርዝ",
        highlight: "አድምቅ",
        code: "በመስመር ውስጥ ኮድ",
        divider: "መለያ መስመር",
        tag: "ማስታወሻውን በመለያ ስር ያስቀምጣል",
        link: "ከሌላ ማስታወሻ ጋር ያገናኛል",
      },
      outro: "⌘⇧F ሌላ ምንም ነገር በማያ ገጹ ላይ ሳይኖር ለመጻፍ ወይም በድምፅ ለመጻፍ የትኩረት ሁነታን ይከፍታል። ⌘/ ሁሉንም አቋራጮች ያሳያል።",
    },
  },
};
