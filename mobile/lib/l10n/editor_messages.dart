import 'common_messages.dart';

/// The note screen: the editor, its actions, dictation, note info, links,
/// and Summarize & organize.
class EditorMessages {
  const EditorMessages({
    required this.label,
    required this.hint,
    required this.transcribing,
    required this.pending,
    required this.saveFailed,
    required this.tooLong,
    required this.trashBanner,
    required this.archiveBanner,
    required this.restore,
    required this.deleteForever,
    required this.confirmDelete,
    required this.actions,
    required this.pin,
    required this.unpin,
    required this.addFavorite,
    required this.removeFavorite,
    required this.archive,
    required this.unarchive,
    required this.trash,
    required this.shareText,
    required this.shareRecording,
    required this.shareFailed,
    required this.dictateHint,
    required this.stopDictating,
    required this.dictateStarting,
    required this.dictateFinishing,
    required this.hideKeyboard,
    required this.info,
    required this.created,
    required this.modified,
    required this.recording,
    required this.paragraphs,
    required this.wordsLabel,
    required this.characters,
    required this.withoutSpaces,
    required this.linksTo,
    required this.linkedFrom,
    required this.noLinks,
    required this.linkTip,
    required this.linkMissing,
    required this.createLinked,
    required this.assist,
    required this.assistSubtitle,
    required this.summary,
    required this.keySentences,
    required this.addSummary,
    required this.tooShort,
    required this.paragraphsHeading,
    required this.canSplit,
    required this.split,
    required this.noSplit,
    required this.suggestedTags,
    required this.fromLibrary,
    required this.fromKeyword,
    required this.newTag,
    required this.noTags,
    required this.addTag,
    required this.added,
  });

  static final en = EditorMessages(
    label: 'Note',
    hint: 'Write, or press the microphone and speak',
    transcribing: 'Transcribing your recording…',
    pending: "This recording hasn't been transcribed yet. Press Transcribe below, or type.",
    saveFailed: "Couldn't save your edit",
    tooLong: 'Too long to save. Split it into two notes.',
    trashBanner: 'This note is in the Trash.',
    archiveBanner: 'This note is in the Archive.',
    restore: 'Restore',
    deleteForever: 'Delete for good',
    confirmDelete: "Delete this note for good? Its recording goes too. This can't be undone.",
    actions: 'Note actions',
    pin: 'Pin to top',
    unpin: 'Unpin',
    addFavorite: 'Add to Favorites',
    removeFavorite: 'Remove from Favorites',
    archive: 'Archive',
    unarchive: 'Move out of the Archive',
    trash: 'Move to Trash',
    shareText: 'Share the text',
    shareRecording: 'Share the recording (WAV)',
    shareFailed: "Couldn't share this note. Try again.",
    dictateHint: 'Dictate: speak, and the text appears after each pause',
    stopDictating: 'Stop dictating',
    dictateStarting: 'Starting…',
    dictateFinishing: 'Finishing…',
    hideKeyboard: 'Hide keyboard',
    info: 'Note info',
    created: 'Created',
    modified: 'Modified',
    recording: 'Recording',
    paragraphs: (n) => pluralEn(n, 'Paragraph', 'Paragraphs'),
    wordsLabel: (n) => pluralEn(n, 'Word', 'Words'),
    characters: (n) => pluralEn(n, 'Character', 'Characters'),
    withoutSpaces: (count) => '$count characters without spaces',
    linksTo: 'Links to',
    linkedFrom: 'Linked from',
    noLinks: 'No links yet.',
    linkTip: 'Write [[a note title]] to link to another note.',
    linkMissing: (title) => 'No note is titled “$title”.',
    createLinked: 'Create it',
    assist: 'Summarize and organize',
    assistSubtitle: 'Worked out on this phone, offline. Nothing is rewritten.',
    summary: 'Summary',
    keySentences: 'Key sentences',
    addSummary: 'Add under the title',
    tooShort: 'Too short to summarize: it needs three sentences or more.',
    paragraphsHeading: 'Paragraphs',
    canSplit: (n) => n == 1
        ? 'A long paragraph can be cut where the topic changes.'
        : '$n long paragraphs can be cut where the topic changes.',
    split: 'Split into paragraphs',
    noSplit: 'No paragraph is long enough to need splitting.',
    suggestedTags: 'Suggested tags',
    fromLibrary: 'Notes like this one carry this tag',
    fromKeyword: 'This note keeps coming back to this word',
    newTag: '(new tag)',
    noTags: 'Nothing to suggest yet. Tags come from notes like this one and the words it repeats.',
    addTag: (tag) => 'Add #$tag',
    added: 'Added.',
  );

  static final am = EditorMessages(
    label: 'ማስታወሻ',
    hint: 'ይጻፉ፣ ወይም ማይክሮፎኑን ተጭነው ይናገሩ',
    transcribing: 'ቅጂዎን ወደ ጽሑፍ በመቀየር ላይ…',
    pending: 'ይህ ቅጂ ገና ወደ ጽሑፍ አልተቀየረም። ከታች «ወደ ጽሑፍ ቀይር»ን ይጫኑ፣ ወይም ይጻፉ።',
    saveFailed: 'ለውጥዎን ማስቀመጥ አልተቻለም',
    tooLong: 'ለማስቀመጥ በጣም ረጅም ነው። ለሁለት ማስታወሻዎች ይክፈሉት።',
    trashBanner: 'ይህ ማስታወሻ መጣያ ውስጥ ነው።',
    archiveBanner: 'ይህ ማስታወሻ ማህደር ውስጥ ነው።',
    restore: 'መልስ',
    deleteForever: 'ለዘለቄታው ሰርዝ',
    confirmDelete: 'ይህ ማስታወሻ ለዘለቄታው ይሰረዝ? ቅጂውም አብሮ ይሰረዛል። ይህ ሊቀለበስ አይችልም።',
    actions: 'የማስታወሻ ድርጊቶች',
    pin: 'ከላይ ሰካ',
    unpin: 'ንቀል',
    addFavorite: 'ወደ ተወዳጆች አክል',
    removeFavorite: 'ከተወዳጆች አስወግድ',
    archive: 'ወደ ማህደር አስገባ',
    unarchive: 'ከማህደር አውጣ',
    trash: 'ወደ መጣያ ውሰድ',
    shareText: 'ጽሑፉን አጋራ',
    shareRecording: 'ቅጂውን አጋራ (WAV)',
    shareFailed: 'ይህን ማስታወሻ ማጋራት አልተቻለም። እንደገና ይሞክሩ።',
    dictateHint: 'በድምፅ ጻፍ፦ ይናገሩ፤ ጽሑፉ ከእያንዳንዱ ቆም ማለት በኋላ ይታያል',
    stopDictating: 'በድምፅ መጻፍ አቁም',
    dictateStarting: 'በማስጀመር ላይ…',
    dictateFinishing: 'በማጠናቀቅ ላይ…',
    hideKeyboard: 'የቁልፍ ሰሌዳውን ደብቅ',
    info: 'የማስታወሻ መረጃ',
    created: 'የተፈጠረው',
    modified: 'የተቀየረው',
    recording: 'ቅጂ',
    paragraphs: (n) => n == 1 ? 'አንቀጽ' : 'አንቀጾች',
    wordsLabel: (n) => n == 1 ? 'ቃል' : 'ቃላት',
    characters: (n) => n == 1 ? 'ፊደል' : 'ፊደላት',
    withoutSpaces: (count) => 'ክፍተቶች ሳይቆጠሩ $count ፊደላት',
    linksTo: 'የሚያገናኛቸው',
    linkedFrom: 'ወደዚህ የሚያገናኙ',
    noLinks: 'እስካሁን አገናኝ የለም።',
    linkTip: 'ከሌላ ማስታወሻ ጋር ለማገናኘት [[የማስታወሻ ርዕስ]] ብለው ይጻፉ።',
    linkMissing: (title) => '«$title» የሚል ርዕስ ያለው ማስታወሻ የለም።',
    createLinked: 'ፍጠረው',
    assist: 'አጠቃልል እና አደራጅ',
    assistSubtitle: 'በዚህ ስልክ ላይ፣ ያለ ኢንተርኔት የተሰራ። ምንም ቃል አልተቀየረም።',
    summary: 'ማጠቃለያ',
    keySentences: 'ዋና ዓረፍተ ነገሮች',
    addSummary: 'ከርዕሱ ስር አክል',
    tooShort: 'ለማጠቃለል በጣም አጭር ነው፤ ሦስት ወይም ከዚያ በላይ ዓረፍተ ነገሮች ያስፈልጋሉ።',
    paragraphsHeading: 'አንቀጾች',
    canSplit: (n) => n == 1 ? 'አንድ ረጅም አንቀጽ ርዕሱ በሚቀየርበት ቦታ ሊከፈል ይችላል።' : '$n ረጅም አንቀጾች ርዕሱ በሚቀየርበት ቦታ ሊከፈሉ ይችላሉ።',
    split: 'በአንቀጾች ከፋፍል',
    noSplit: 'መከፈል የሚያስፈልገው ረጅም አንቀጽ የለም።',
    suggestedTags: 'የሚጠቆሙ መለያዎች',
    fromLibrary: 'እንደዚህ ያሉ ማስታወሻዎች ይህን መለያ ይዘዋል',
    fromKeyword: 'ይህ ማስታወሻ ይህን ቃል ደጋግሞ ይጠቅሳል',
    newTag: '(አዲስ መለያ)',
    noTags: 'እስካሁን የሚጠቆም የለም። መለያዎች ከተመሳሳይ ማስታወሻዎች እና ማስታወሻው ከሚደጋግማቸው ቃላት ይመጣሉ።',
    addTag: (tag) => '#$tag አክል',
    added: 'ታክሏል።',
  );

  /// The text field, for screen readers.
  final String label;

  /// Placeholder in an empty note.
  final String hint;
  final String transcribing;
  final String pending;
  final String saveFailed;
  final String tooLong;
  final String trashBanner;
  final String archiveBanner;
  final String restore;
  final String deleteForever;
  final String confirmDelete;

  /// The note's action menu, for screen readers.
  final String actions;
  final String pin;
  final String unpin;
  final String addFavorite;
  final String removeFavorite;
  final String archive;
  final String unarchive;
  final String trash;
  final String shareText;
  final String shareRecording;
  final String shareFailed;
  final String dictateHint;
  final String stopDictating;
  final String dictateStarting;
  final String dictateFinishing;

  /// Puts the keyboard away: an iPhone has no key for it in a note.
  final String hideKeyboard;

  /// Note info: its title, then the labels of its rows.
  final String info;
  final String created;
  final String modified;
  final String recording;
  final String Function(int n) paragraphs;
  final String Function(int n) wordsLabel;
  final String Function(int n) characters;
  final String Function(String count) withoutSpaces;

  /// Notes this one links to with [[title]], and notes that link to it.
  final String linksTo;
  final String linkedFrom;
  final String noLinks;
  final String linkTip;
  final String Function(String title) linkMissing;

  /// Makes a note with the missing link's title.
  final String createLinked;

  /// Summarize & organize: the action, then the sheet.
  final String assist;
  final String assistSubtitle;
  final String summary;
  final String keySentences;
  final String addSummary;
  final String tooShort;
  final String paragraphsHeading;
  final String Function(int n) canSplit;
  final String split;
  final String noSplit;
  final String suggestedTags;
  final String fromLibrary;
  final String fromKeyword;
  final String newTag;
  final String noTags;
  final String Function(String tag) addTag;
  final String added;
}
