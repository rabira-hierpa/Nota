/// Speech: the Speech models screen (status, import, download, copying over
/// USB, delete) and what transcription reports. Sizes, file names and folders
/// arrive formatted, so the wording never guesses them.
class SpeechMessages {
  const SpeechMessages({
    required this.title,
    required this.intro,
    required this.status,
    required this.checking,
    required this.loading,
    required this.ready,
    required this.notSetUp,
    required this.missingFiles,
    required this.damaged,
    required this.cantStart,
    required this.files,
    required this.fileReady,
    required this.fileMissing,
    required this.fileWrong,
    required this.importFiles,
    required this.importHint,
    required this.importHintIos,
    required this.copying,
    required this.checkingFile,
    required this.imported,
    required this.notModelFile,
    required this.wrongFile,
    required this.importFailed,
    required this.noSpace,
    required this.downloadHeading,
    required this.downloadHint,
    required this.download,
    required this.downloading,
    required this.stopDownload,
    required this.downloadStopped,
    required this.downloadFailed,
    required this.downloadNoMatch,
    required this.usbHeading,
    required this.usbAndroid,
    required this.usbIos,
    required this.usbThen,
    required this.checkAgain,
    required this.copyFolder,
    required this.delete,
    required this.confirmDelete,
    required this.deleted,
    required this.deleteFailed,
    required this.licences,
    required this.memory,
    required this.opening,
    required this.deleting,
    required this.folder,
    required this.adbIntro,
    required this.copyCommand,
    required this.transcribingPercent,
    required this.confirmAppend,
    required this.credit,
    required this.noModel,
    required this.queued,
    required this.failed,
    required this.outOfMemory,
    required this.nothingHeard,
    required this.clipFailed,
    required this.interrupted,
    required this.tooLong,
  });

  static final en = SpeechMessages(
    title: 'Speech models',
    intro: (size) =>
        'Nota transcribes with Hohe, an Amharic speech model that runs on this phone, and adds full stops '
        'with a punctuation model. Their files ($size) are added once; after that, no internet is needed.',
    status: 'Status',
    checking: 'Checking speech…',
    loading: 'Loading the speech model…',
    ready: 'Hohe is ready. Speech works offline.',
    notSetUp: "Hohe isn't set up yet.",
    missingFiles: (n) => n == 1 ? 'One file is still missing.' : '$n files are still missing.',
    damaged: "A model file is damaged or isn't the right one. Delete it and add it again.",
    cantStart: "Hohe couldn't start on this phone. Restart Nota, then try again.",
    files: 'Files',
    fileReady: 'Ready',
    fileMissing: 'Missing',
    fileWrong: 'Wrong or damaged',
    importFiles: 'Import files',
    importHint: (names) => 'Pick the model files from this phone, a memory card or a USB drive: $names.',
    importHintIos: (names) =>
        'Pick the model files in the Files app (on this device, iCloud Drive or a USB drive): $names.',
    copying: (name) => 'Copying $name…',
    checkingFile: (name) => 'Checking $name…',
    imported: (n) => n == 1 ? 'Added 1 file.' : 'Added $n files.',
    notModelFile: (name) => '“$name” isn’t one of the speech model files.',
    wrongFile: (name) => '“$name” doesn’t match the expected file. It may be damaged or a different version.',
    importFailed: "Couldn't copy the file. Try again.",
    noSpace: (size) => 'Not enough free space on this phone: the model needs $size.',
    downloadHeading: 'Download',
    downloadHint: (size) => 'Or download the files ($size). Use Wi-Fi if you can.',
    download: (size) => 'Download ($size)',
    downloading: (done, total) => 'Downloading… $done of $total',
    stopDownload: 'Stop download',
    downloadStopped: 'Download stopped.',
    downloadFailed: 'The download stopped. Check the connection and try again.',
    downloadNoMatch: "A downloaded file didn't match the expected one. Try again.",
    usbHeading: 'Copy from a computer',
    usbAndroid: (folder) =>
        'Connect the phone to a computer with a USB cable, choose File transfer on the phone, '
        'and copy the files into $folder.',
    usbIos:
        'Connect the iPhone to a computer. In Finder on a Mac (or the Apple Devices app on Windows), open the '
        'iPhone, go to Files, and drop the four files on Nota. Nota moves them into its models folder, which '
        'the Files app shows under On My iPhone › Nota › models.',
    usbThen: 'Then come back and press Check again.',
    checkAgain: 'Check again',
    copyFolder: 'Copy the folder path',
    delete: 'Delete the model files',
    confirmDelete: (size) =>
        'Delete the speech model files ($size)? Your notes and recordings stay. '
        'Speech stops working until you add the files again.',
    deleted: 'Model files deleted.',
    deleteFailed: "Couldn't delete the model files. Try again.",
    licences: 'Model licences',
    memory:
        'Transcribing needs about 3 GB of free memory. On a phone with 4 GB or less, close other apps '
        'before a long recording.',
    opening: 'Opening the files…',
    deleting: 'Deleting…',
    folder: 'Folder',
    adbIntro: "Or, with Android's adb tool, run this in the folder that holds the files:",
    copyCommand: 'Copy the command',
    transcribingPercent: (percent) => 'Transcribing… $percent%',
    confirmAppend:
        'Transcribe the recording again? The new text is added after what the note already says; '
        'nothing is replaced.',
    credit:
        'Hohe by Chapi and the Dataset.ET contributors, Snapwre (CC BY 4.0); '
        'punctuation by 1-800-BAD-CODE (Apache-2.0).',
    noModel: 'No speech model is available yet. Add it in Speech models.',
    queued: 'Waiting to be transcribed…',
    failed: "Hohe couldn't transcribe this recording. Try again.",
    outOfMemory: 'The phone ran out of memory. Close other apps, or try a shorter recording.',
    nothingHeard: 'No words were heard in the recording.',
    clipFailed: "Some of what you said couldn't be transcribed.",
    interrupted: 'Transcription stopped when Nota closed. Transcribe it again.',
    tooLong: (length, max) => 'That recording is $length long. Nota transcribes up to $max at a time: split it first.',
  );

  static final am = SpeechMessages(
    title: 'የንግግር ሞዴሎች',
    intro: (size) =>
        'Nota ንግግርን ወደ ጽሑፍ የሚቀይረው በዚህ ስልክ ላይ በሚሰራው Hohe በተባለ የአማርኛ የንግግር ሞዴል ነው፤ '
        'ሙሉ ማቆሚያዎችን ደግሞ በሥርዓተ ነጥብ ሞዴል ያክላል። ፋይሎቻቸው ($size) አንድ ጊዜ ብቻ ይጨመራሉ፤ ከዚያ በኋላ ኢንተርኔት አያስፈልግም።',
    status: 'ሁኔታ',
    checking: 'ንግግርን በማጣራት ላይ…',
    loading: 'የንግግር ሞዴሉን በመጫን ላይ…',
    ready: 'Hohe ዝግጁ ነው። ንግግር ያለ ኢንተርኔት ይሰራል።',
    notSetUp: 'Hohe ገና አልተዘጋጀም።',
    missingFiles: (n) => n == 1 ? 'አንድ ፋይል ገና ይቀራል።' : '$n ፋይሎች ገና ይቀራሉ።',
    damaged: 'ከሞዴሉ ፋይሎች አንዱ ተበላሽቷል ወይም ትክክለኛው አይደለም። ሰርዘው እንደገና ያክሉት።',
    cantStart: 'Hohe በዚህ ስልክ ላይ መጀመር አልቻለም። Notaን እንደገና ያስጀምሩ፣ ከዚያ እንደገና ይሞክሩ።',
    files: 'ፋይሎች',
    fileReady: 'ዝግጁ',
    fileMissing: 'የለም',
    fileWrong: 'የተሳሳተ ወይም የተበላሸ',
    importFiles: 'ፋይሎችን አስገባ',
    importHint: (names) => 'የሞዴሉን ፋይሎች ከዚህ ስልክ፣ ከሚሞሪ ካርድ ወይም ከUSB ይምረጡ፦ $names።',
    importHintIos: (names) => 'የሞዴሉን ፋይሎች በFiles መተግበሪያ ውስጥ (በዚህ መሣሪያ፣ በiCloud Drive ወይም በUSB) ይምረጡ፦ $names።',
    copying: (name) => '$name በመቅዳት ላይ…',
    checkingFile: (name) => '$name በማረጋገጥ ላይ…',
    imported: (n) => n == 1 ? '1 ፋይል ታክሏል።' : '$n ፋይሎች ታክለዋል።',
    notModelFile: (name) => '«$name» ከንግግር ሞዴሉ ፋይሎች አንዱ አይደለም።',
    wrongFile: (name) => '«$name» ከሚጠበቀው ፋይል ጋር አይመሳሰልም። ተበላሽቶ ወይም የተለየ ስሪት ሊሆን ይችላል።',
    importFailed: 'ፋይሉን መቅዳት አልተቻለም። እንደገና ይሞክሩ።',
    noSpace: (size) => 'በዚህ ስልክ ላይ በቂ ባዶ ቦታ የለም፤ ሞዴሉ $size ያስፈልገዋል።',
    downloadHeading: 'ማውረድ',
    downloadHint: (size) => 'ወይም ፋይሎቹን ያውርዱ ($size)። ከተቻለ Wi-Fi ይጠቀሙ።',
    download: (size) => 'አውርድ ($size)',
    downloading: (done, total) => 'በማውረድ ላይ… ከ$total ውስጥ $done',
    stopDownload: 'ማውረዱን አቁም',
    downloadStopped: 'ማውረዱ ቆሟል።',
    downloadFailed: 'ማውረዱ ተቋርጧል። ግንኙነቱን አረጋግጠው እንደገና ይሞክሩ።',
    downloadNoMatch: 'የወረደው ፋይል ከሚጠበቀው ጋር አልተመሳሰለም። እንደገና ይሞክሩ።',
    usbHeading: 'ከኮምፒውተር ይቅዱ',
    usbAndroid: (folder) => 'ስልኩን በUSB ገመድ ከኮምፒውተር ጋር ያገናኙ፣ በስልኩ ላይ «File transfer»ን ይምረጡ፣ ከዚያ ፋይሎቹን ወደ $folder ይቅዱ።',
    usbIos:
        'iPhoneን ከኮምፒውተር ጋር ያገናኙ። በMac ላይ Finderን (በWindows ላይ Apple Devices መተግበሪያን) ከፍተው iPhoneን ይምረጡ፣ '
        'ወደ Files ይሂዱ፣ አራቱንም ፋይሎች Nota ላይ ይጣሉ። Nota ፋይሎቹን ወደ models አቃፊው ያዛውራቸዋል፤ '
        'አቃፊው በFiles መተግበሪያ ውስጥ On My iPhone › Nota › models ስር ይታያል።',
    usbThen: 'ከዚያ ተመልሰው «እንደገና አረጋግጥ»ን ይጫኑ።',
    checkAgain: 'እንደገና አረጋግጥ',
    copyFolder: 'የአቃፊውን መንገድ ቅዳ',
    delete: 'የሞዴሉን ፋይሎች ሰርዝ',
    confirmDelete: (size) => 'የንግግር ሞዴሉ ፋይሎች ($size) ይሰረዙ? ማስታወሻዎችዎ እና ቅጂዎችዎ ይቀራሉ። ፋይሎቹን እንደገና እስኪያክሉ ድረስ ንግግር አይሰራም።',
    deleted: 'የሞዴሉ ፋይሎች ተሰርዘዋል።',
    deleteFailed: 'የሞዴሉን ፋይሎች መሰረዝ አልተቻለም። እንደገና ይሞክሩ።',
    licences: 'የሞዴሎቹ ፈቃዶች',
    memory: 'ወደ ጽሑፍ መቀየር 3 GB ያህል ነፃ ማህደረ ትውስታ ይፈልጋል። ስልክዎ 4 GB ወይም ያነሰ ካለው ረጅም ቅጂ ከመቀየርዎ በፊት ሌሎች መተግበሪያዎችን ይዝጉ።',
    opening: 'ፋይሎቹን በመክፈት ላይ…',
    deleting: 'በመሰረዝ ላይ…',
    folder: 'አቃፊ',
    adbIntro: 'ወይም በAndroid adb መሣሪያ፣ ፋይሎቹ ባሉበት አቃፊ ውስጥ ይህን ያስኪዱ፦',
    copyCommand: 'ትዕዛዙን ቅዳ',
    transcribingPercent: (percent) => 'በመቀየር ላይ… $percent%',
    confirmAppend: 'ቅጂው እንደገና ወደ ጽሑፍ ይቀየር? አዲሱ ጽሑፍ ማስታወሻው አሁን ካለው ጽሑፍ በኋላ ይታከላል፤ ምንም አይተካም።',
    credit: 'Hohe በChapi እና በDataset.ET አበርካቾች፣ Snapwre (CC BY 4.0)፤ የሥርዓተ ነጥብ ሞዴሉ በ1-800-BAD-CODE (Apache-2.0)።',
    noModel: 'እስካሁን የንግግር ሞዴል የለም። በ«የንግግር ሞዴሎች» ውስጥ ያክሉት።',
    queued: 'ወደ ጽሑፍ ለመቀየር በመጠበቅ ላይ…',
    failed: 'Hohe ይህን ቅጂ ወደ ጽሑፍ መቀየር አልቻለም። እንደገና ይሞክሩ።',
    outOfMemory: 'የስልኩ ማህደረ ትውስታ አልበቃም። ሌሎች መተግበሪያዎችን ይዝጉ፣ ወይም አጭር ቅጂ ይሞክሩ።',
    nothingHeard: 'በቅጂው ውስጥ ምንም ቃል አልተሰማም።',
    clipFailed: 'ከተናገሩት ከፊሉን ወደ ጽሑፍ መቀየር አልተቻለም።',
    interrupted: 'Nota ሲዘጋ ወደ ጽሑፍ መቀየሩ ቆሟል። እንደገና ወደ ጽሑፍ ይቀይሩት።',
    tooLong: (length, max) => 'ቅጂው $length ይረዝማል። Nota በአንድ ጊዜ እስከ $max ድረስ ብቻ ወደ ጽሑፍ ይቀይራል፤ መጀመሪያ ይክፈሉት።',
  );

  /// The Speech models screen, and its entry in the drawer and Settings.
  final String title;

  /// What the model is and how big its files are, e.g. "840 MB".
  final String Function(String size) intro;
  final String status;
  final String checking;
  final String loading;
  final String ready;
  final String notSetUp;
  final String Function(int count) missingFiles;
  final String damaged;
  final String cantStart;

  /// The list of model files, and the state shown beside each one.
  final String files;
  final String fileReady;
  final String fileMissing;
  final String fileWrong;

  /// Picking the model files with the system file picker.
  final String importFiles;
  final String Function(String names) importHint;

  /// iPhones have no memory card: the places the Files app offers instead.
  final String Function(String names) importHintIos;
  final String Function(String name) copying;
  final String Function(String name) checkingFile;
  final String Function(int count) imported;
  final String Function(String name) notModelFile;
  final String Function(String name) wrongFile;
  final String importFailed;
  final String Function(String size) noSpace;

  /// The optional download (the only time Nota goes online).
  final String downloadHeading;
  final String Function(String size) downloadHint;
  final String Function(String size) download;
  final String Function(String done, String total) downloading;
  final String stopDownload;
  final String downloadStopped;
  final String downloadFailed;
  final String downloadNoMatch;

  /// Copying the files over a cable: Android names the app's folder, iOS uses Files.
  final String usbHeading;
  final String Function(String folder) usbAndroid;
  final String usbIos;
  final String usbThen;
  final String checkAgain;
  final String copyFolder;
  final String delete;
  final String Function(String size) confirmDelete;
  final String deleted;
  final String deleteFailed;
  final String licences;

  /// Phones need room in memory while Hohe runs.
  final String memory;

  /// The system picker is copying the picked files before Nota sees them.
  final String opening;
  final String deleting;
  final String folder;

  /// Pushing the files with adb; the command itself is shown as it is.
  final String adbIntro;
  final String copyCommand;

  /// A recording being transcribed, with the share done.
  final String Function(int percent) transcribingPercent;

  /// Transcribing a note's recording again adds its text after the note's.
  final String confirmAppend;
  final String credit;

  /// Why a transcription or dictation failed. These may be stored with a
  /// note (in English), so [storable] lists them for translating back.
  final String noModel;
  final String queued;
  final String failed;
  final String outOfMemory;
  final String nothingHeard;
  final String clipFailed;
  final String interrupted;

  /// A recording longer than one transcription can take: its length, then the limit.
  final String Function(String length, String max) tooLong;

  /// Failures a note may keep in `TranscriptionFailed.message`, and those
  /// dictation reports, in a fixed order: the same index in each language is
  /// the same message. Append only.
  List<String> get storable => [noModel, failed, outOfMemory, nothingHeard, cantStart, interrupted, clipFailed];
}
