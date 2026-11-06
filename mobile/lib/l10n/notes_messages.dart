import 'common_messages.dart';

/// The drawer: sections, tags, and how many notes each holds.
class SectionsMessages {
  const SectionsMessages({
    required this.label,
    required this.all,
    required this.today,
    required this.todo,
    required this.favorites,
    required this.untagged,
    required this.voice,
    required this.archive,
    required this.trash,
    required this.library,
    required this.tags,
    required this.tagHintBefore,
    required this.tagHintExample,
    required this.tagHintAfter,
    required this.expandTag,
    required this.collapseTag,
    required this.noteCount,
  });

  static final en = SectionsMessages(
    label: 'Sections',
    all: 'Notes',
    today: 'Today',
    todo: 'Todo',
    favorites: 'Favorites',
    untagged: 'Untagged',
    voice: 'Voice notes',
    archive: 'Archive',
    trash: 'Trash',
    library: 'Library',
    tags: 'Tags',
    tagHintBefore: 'Type',
    tagHintExample: '#tag',
    tagHintAfter: 'in a note to file it here.',
    expandTag: (path) => 'Expand #$path',
    collapseTag: (path) => 'Collapse #$path',
    noteCount: (n) => '$n ${pluralEn(n, 'note', 'notes')}',
  );

  static final am = SectionsMessages(
    label: 'ክፍሎች',
    all: 'ማስታወሻዎች',
    today: 'ዛሬ',
    todo: 'የሚሠሩ',
    favorites: 'ተወዳጆች',
    untagged: 'መለያ የሌላቸው',
    voice: 'የድምፅ ማስታወሻዎች',
    archive: 'ማህደር',
    trash: 'መጣያ',
    library: 'ቤተ መጻሕፍት',
    tags: 'መለያዎች',
    tagHintBefore: 'በማስታወሻ ውስጥ',
    tagHintExample: '#መለያ',
    tagHintAfter: 'ብለው ይጻፉ፤ እዚህ ይመደባል።',
    expandTag: (path) => '#$path ዘርጋ',
    collapseTag: (path) => '#$path ሰብስብ',
    noteCount: (n) => n == 1 ? '1 ማስታወሻ' : '$n ማስታወሻዎች',
  );

  /// The drawer, for screen readers.
  final String label;
  final String all;

  /// Notes written or changed today.
  final String today;

  /// Notes with an open checklist item ("- [ ]").
  final String todo;
  final String favorites;
  final String untagged;
  final String voice;
  final String archive;
  final String trash;

  /// Heading over the sections.
  final String library;

  /// Heading over the tags.
  final String tags;

  /// Shown when there are no tags yet: before, the example tag, after.
  final String tagHintBefore;
  final String tagHintExample;
  final String tagHintAfter;
  final String Function(String path) expandTag;
  final String Function(String path) collapseTag;
  final String Function(int count) noteCount;
}

/// The note list: search, sort, empty states, the first-launch intro, the
/// marks on each row, and what list actions report.
class NotesMessages {
  const NotesMessages({
    required this.newNote,
    required this.search,
    required this.searchPlaceholder,
    required this.clearSearch,
    required this.noMatch,
    required this.searchAll,
    required this.sortLabel,
    required this.sortEdited,
    required this.sortCreated,
    required this.sortTitle,
    required this.emptyAll,
    required this.emptyToday,
    required this.emptyTodo,
    required this.emptyFavorites,
    required this.emptyUntagged,
    required this.emptyVoice,
    required this.emptyArchive,
    required this.emptyTrash,
    required this.emptyTag,
    required this.emptyTrashAction,
    required this.confirmEmptyTrash,
    required this.voiceNote,
    required this.pinned,
    required this.favorite,
    required this.hasRecording,
    required this.movedToTrash,
    required this.archived,
    required this.unarchived,
    required this.restored,
    required this.deletedForever,
    required this.trashEmptied,
    required this.loadFailed,
    required this.deleteFailed,
    required this.introTitle,
    required this.introPoints,
    required this.introSpeech,
    required this.introWrite,
    required this.introSetUpSpeech,
    required this.introDismiss,
  });

  static final en = NotesMessages(
    newNote: 'New note',
    search: 'Search notes',
    searchPlaceholder: 'Search notes or #tags',
    clearSearch: 'Clear search',
    noMatch: (section, query) => 'Nothing in $section matches “$query”.',
    searchAll: 'Search all notes',
    sortLabel: 'Sort notes by',
    sortEdited: 'Date edited',
    sortCreated: 'Date created',
    sortTitle: 'Title',
    emptyAll: 'No notes yet. Write one with the pencil button, or speak one with the microphone.',
    emptyToday: 'Nothing written or changed today yet.',
    emptyTodo: 'No open checklist items. Start a line with “- [ ]” to add one.',
    emptyFavorites: 'Star a note to keep it here.',
    emptyUntagged: 'Every note has a tag.',
    emptyVoice: 'Notes you record or dictate with the microphone gather here.',
    emptyArchive: 'Archive notes you want to keep but not see every day.',
    emptyTrash: 'The Trash is empty.',
    emptyTag: (path) => 'No notes are tagged #$path.',
    emptyTrashAction: 'Empty Trash',
    confirmEmptyTrash: (n) => n == 1
        ? "Delete the note in the Trash for good? This can't be undone."
        : "Delete all $n notes in the Trash for good? This can't be undone.",
    voiceNote: 'Voice note',
    pinned: 'Pinned',
    favorite: 'Favorite',
    hasRecording: 'Has a recording',
    movedToTrash: 'Moved to the Trash.',
    archived: 'Archived.',
    unarchived: 'Moved out of the Archive.',
    restored: 'Restored.',
    deletedForever: 'Deleted for good.',
    trashEmptied: 'The Trash is empty now.',
    loadFailed: "Couldn't read your notes. Try again.",
    deleteFailed: "Couldn't delete the note. Try again.",
    introTitle: 'Welcome to Nota',
    introPoints: const [
      'Write notes in Amharic or English, with #tags, [[links]] to other notes and # headings.',
      'Speak instead of typing: record a voice note, or dictate and watch the words appear.',
      'Everything stays on this phone, and speech works offline too.',
    ],
    introSpeech: 'To speak notes, add the speech model first. You only do this once.',
    introWrite: 'Write a note',
    introSetUpSpeech: 'Set up speech',
    introDismiss: 'Got it',
  );

  static final am = NotesMessages(
    newNote: 'አዲስ ማስታወሻ',
    search: 'ማስታወሻዎችን ፈልግ',
    searchPlaceholder: 'ማስታወሻ ወይም #መለያ ይፈልጉ',
    clearSearch: 'ፍለጋውን አጽዳ',
    noMatch: (section, query) => 'በ$section ውስጥ «$query» የሚል ምንም የለም።',
    searchAll: 'በሁሉም ማስታወሻዎች ውስጥ ፈልግ',
    sortLabel: 'ማስታወሻዎችን ደርድር በ',
    sortEdited: 'የተቀየረበት ቀን',
    sortCreated: 'የተፈጠረበት ቀን',
    sortTitle: 'ርዕስ',
    emptyAll: 'እስካሁን ማስታወሻ የለም። በእርሳስ ቁልፉ ይጻፉ፣ ወይም በማይክሮፎኑ ይናገሩ።',
    emptyToday: 'ዛሬ የተጻፈ ወይም የተቀየረ ነገር እስካሁን የለም።',
    emptyTodo: 'ያልተጠናቀቀ የማረጋገጫ ንጥል የለም። አንዱን ለማከል መስመሩን በ«- [ ]» ይጀምሩ።',
    emptyFavorites: 'ማስታወሻ እዚህ እንዲቀመጥ በኮከብ ምልክት ያድርጉበት።',
    emptyUntagged: 'ሁሉም ማስታወሻዎች መለያ አላቸው።',
    emptyVoice: 'በማይክሮፎን የሚቀርጿቸው ወይም በድምፅ የሚጽፏቸው ማስታወሻዎች እዚህ ይሰበሰባሉ።',
    emptyArchive: 'ሊያቆዩዋቸው የሚፈልጉትን፣ ግን በየቀኑ ማየት የማይፈልጉትን ማስታወሻዎች ወደ ማህደር ያስገቡ።',
    emptyTrash: 'መጣያው ባዶ ነው።',
    emptyTag: (path) => '#$path የሚል መለያ ያለው ማስታወሻ የለም።',
    emptyTrashAction: 'መጣያውን አጽዳ',
    confirmEmptyTrash: (n) => n == 1
        ? 'በመጣያው ያለው ማስታወሻ ለዘለቄታው ይሰረዝ? ይህ ሊቀለበስ አይችልም።'
        : 'በመጣያው ያሉት $n ማስታወሻዎች በሙሉ ለዘለቄታው ይሰረዙ? ይህ ሊቀለበስ አይችልም።',
    voiceNote: 'የድምፅ ማስታወሻ',
    pinned: 'የተሰካ',
    favorite: 'ተወዳጅ',
    hasRecording: 'ቅጂ አለው',
    movedToTrash: 'ወደ መጣያ ተወስዷል።',
    archived: 'ወደ ማህደር ገብቷል።',
    unarchived: 'ከማህደር ወጥቷል።',
    restored: 'ተመልሷል።',
    deletedForever: 'ለዘለቄታው ተሰርዟል።',
    trashEmptied: 'መጣያው አሁን ባዶ ነው።',
    loadFailed: 'ማስታወሻዎችዎን ማንበብ አልተቻለም። እንደገና ይሞክሩ።',
    deleteFailed: 'ማስታወሻውን መሰረዝ አልተቻለም። እንደገና ይሞክሩ።',
    introTitle: 'እንኳን ወደ Nota በደህና መጡ',
    introPoints: const [
      'በአማርኛ ወይም በእንግሊዝኛ ማስታወሻ ይጻፉ፤ በ#መለያዎች፣ ወደ ሌሎች ማስታወሻዎች በሚወስዱ [[አገናኞች]] እና በ# ርዕሶች።',
      'ከመተየብ ይልቅ ይናገሩ፦ የድምፅ ማስታወሻ ይቅረጹ፣ ወይም በድምፅ ይጻፉና ቃላቱ ሲታዩ ይመልከቱ።',
      'ሁሉም ነገር በዚህ ስልክ ላይ ይቀራል፤ ንግግርም ያለ ኢንተርኔት ይሰራል።',
    ],
    introSpeech: 'ማስታወሻ በድምፅ ለመፍጠር መጀመሪያ የንግግር ሞዴሉን ያክሉ። ይህን የሚያደርጉት አንድ ጊዜ ብቻ ነው።',
    introWrite: 'ማስታወሻ ይጻፉ',
    introSetUpSpeech: 'ንግግርን አዘጋጅ',
    introDismiss: 'ገባኝ',
  );

  final String newNote;

  /// The search button and field label.
  final String search;
  final String searchPlaceholder;
  final String clearSearch;
  final String Function(String section, String query) noMatch;

  /// Offered when a search in one section finds nothing.
  final String searchAll;
  final String sortLabel;
  final String sortEdited;
  final String sortCreated;
  final String sortTitle;
  final String emptyAll;
  final String emptyToday;
  final String emptyTodo;
  final String emptyFavorites;
  final String emptyUntagged;
  final String emptyVoice;
  final String emptyArchive;
  final String emptyTrash;
  final String Function(String path) emptyTag;
  final String emptyTrashAction;
  final String Function(int count) confirmEmptyTrash;

  /// Title of a voice note that has no text yet.
  final String voiceNote;
  final String pinned;
  final String favorite;

  /// The mic mark on a row, for screen readers.
  final String hasRecording;
  final String movedToTrash;
  final String archived;
  final String unarchived;
  final String restored;
  final String deletedForever;
  final String trashEmptied;
  final String loadFailed;
  final String deleteFailed;

  /// The first-launch intro, shown in the empty list.
  final String introTitle;
  final List<String> introPoints;
  final String introSpeech;
  final String introWrite;
  final String introSetUpSpeech;
  final String introDismiss;
}
