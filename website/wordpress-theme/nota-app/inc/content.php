<?php
/**
 * Every word on the landing page, in English and Amharic.
 *
 * This table is the single source for the page's copy: the templates read from
 * it through nota_t(), and customizer.php turns each entry into an English and
 * an Amharic field under Appearance, Customize. A saved field overrides the
 * default here. An emptied field hides that piece of text.
 *
 * No "%s" in a default: get_theme_mod() runs sprintf on defaults and puts the
 * theme's URL there.
 *
 * Everything claimed here comes from the repository's README.md,
 * mobile/README.md or the release notes. Keep it that way.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sections of editable copy, in page order.
 *
 * @return array<string, array{title: string, fields: array<string, array<string, string>>}>
 */
function nota_content_sections() {
	static $sections = null;
	if ( null !== $sections ) {
		return $sections;
	}

	$sections = array(
		'nav'       => array(
			'title'  => 'Top menu',
			'fields' => array(
				'nav_speech'  => array(
					'label' => 'Link to the speech section',
					'en'    => 'Speech',
					'am'    => 'ንግግር',
				),
				'nav_anywhere' => array(
					'label' => 'Link to the any-app section',
					'en'    => 'Any app',
					'am'    => 'በማንኛውም መተግበሪያ',
				),
				'nav_notes'   => array(
					'label' => 'Link to the features section',
					'en'    => 'Features',
					'am'    => 'ባህሪያት',
				),
				'nav_privacy' => array(
					'label' => 'Link to the privacy section',
					'en'    => 'Privacy',
					'am'    => 'ግላዊነት',
				),
				'nav_devices' => array(
					'label' => 'Link to the desktop and phone section',
					'en'    => 'Devices',
					'am'    => 'መሣሪያዎች',
				),
				'nav_faq'     => array(
					'label' => 'Link to the questions section',
					'en'    => 'Questions',
					'am'    => 'ጥያቄዎች',
				),
				'cta_download' => array(
					'label' => 'Download button, everywhere on the page',
					'en'    => 'Download Nota',
					'am'    => 'Notaን ያውርዱ',
				),
			),
		),
		'hero'      => array(
			'title'  => 'Top of the page',
			'fields' => array(
				'hero_news'      => array(
					'label' => 'Small link above the headline, to the any-app section (empty to hide)',
					'en'    => 'Coming next: speak Amharic into any app',
					'am'    => 'በቅርቡ፦ በማንኛውም መተግበሪያ ውስጥ በአማርኛ ይናገሩ',
				),
				'hero_title'     => array(
					'label' => 'Headline',
					'en'    => 'Amharic notes you can write or speak.',
					'am'    => 'የአማርኛ ማስታወሻ፣ በመጻፍም በመናገርም።',
				),
				'hero_text'      => array(
					'label' => 'Text under the headline',
					'type'  => 'textarea',
					'en'    => 'Nota turns your voice into Amharic text on your own computer. No account, no internet, nothing leaves your device.',
					'am'    => 'Nota ድምፅዎን በራስዎ ኮምፒውተር ላይ ወደ አማርኛ ጽሑፍ ይቀይራል። አካውንት አያስፈልግም፣ ኢንተርኔት አያስፈልግም፣ ምንም ነገር ከመሣሪያዎ አይወጣም።',
				),
				'hero_secondary' => array(
					'label' => 'Second button',
					'en'    => 'See how it works',
					'am'    => 'እንዴት እንደሚሠራ ይመልከቱ',
				),
				'hero_alt'       => array(
					'label' => 'Screenshot description, for screen readers',
					'type'  => 'textarea',
					'en'    => "Nota's window: sections and tags on the left, the list of notes, and an open Amharic note with a highlight, a checklist and a link to another note.",
					'am'    => 'የNota መስኮት፦ በግራ ክፍሎችና መለያዎች፣ የማስታወሻዎች ዝርዝር፣ እና ማድመቂያ፣ የማረጋገጫ ዝርዝርና ወደ ሌላ ማስታወሻ የሚወስድ አገናኝ ያለው የተከፈተ የአማርኛ ማስታወሻ።',
				),
			),
		),
		'ticker'    => array(
			'title'  => 'Moving band under the top',
			'fields' => array(
				'ticker_items' => array(
					'label' => 'Short phrases, one per line (empty to hide the band)',
					'type'  => 'textarea',
					'en'    => "Speak Amharic, get text\nይናገሩ፣ Nota ይጽፋል\nWorks offline\nNo account\nFree and open source\nmacOS · Windows · Linux\nAndroid · iOS\nThe Ethiopian calendar\nHohe, made for Amharic",
					'am'    => "በአማርኛ ይናገሩ፣ ጽሑፍ ያግኙ\nSpeak Amharic, get text\nያለ ኢንተርኔት ይሠራል\nአካውንት አያስፈልግም\nነፃና ክፍት ምንጭ\nmacOS · Windows · Linux\nAndroid · iOS\nየኢትዮጵያ ዘመን አቆጣጠር\nለአማርኛ የተሠራው Hohe",
				),
			),
		),
		'proof'     => array(
			'title'  => 'Why a model made for Amharic',
			'fields' => array(
				'proof_title'     => array(
					'label' => 'Headline',
					'en'    => 'Whisper learned almost no Amharic. Hohe was made for it.',
					'am'    => 'Whisper አማርኛን ለመማር አልቻለም ማለት ይቻላል። Hohe የተሠራው ለአማርኛ ነው።',
				),
				'proof_good'      => array(
					'label' => 'First number',
					'en'    => '6.8%',
					'am'    => '6.8%',
				),
				'proof_good_text' => array(
					'label' => 'What the first number means',
					'type'  => 'textarea',
					'en'    => 'of characters wrong, for the copy of Hohe inside Nota, on the first 150 clips of FLEURS Amharic, a standard test.',
					'am'    => 'የፊደላት ስህተት፣ በNota ውስጥ ላለው የHohe ቅጂ፣ በFLEURS የአማርኛ ሙከራ የመጀመሪያዎቹ 150 ቅጂዎች ላይ።',
				),
				'proof_bad'       => array(
					'label' => 'Second number',
					'en'    => '~193%',
					'am'    => '~193%',
				),
				'proof_bad_text'  => array(
					'label' => 'What the second number means',
					'type'  => 'textarea',
					'en'    => 'of characters wrong, for stock Whisper on FLEURS Amharic. Above 100% means more mistakes than the sentence has characters.',
					'am'    => 'የፊደላት ስህተት፣ ለተለመደው Whisper በFLEURS አማርኛ ላይ። ከ100% በላይ ማለት ስህተቶቹ ዓረፍተ ነገሩ ካለው የፊደላት ብዛት ይበልጣሉ ማለት ነው።',
				),
				'proof_note'      => array(
					'label' => 'Small print',
					'type'  => 'textarea',
					'en'    => 'Hohe is weakest on fast, spontaneous conversation, and it spells numbers out as words. Every transcript is a note you can edit.',
					'am'    => 'Hohe በፈጣንና ድንገተኛ ውይይት ላይ ደካማ ነው፤ ቁጥሮችንም በፊደል ይጽፋል። እያንዳንዱ ጽሑፍ ሊያርሙት የሚችሉት ማስታወሻ ነው።',
				),
				'proof_link'      => array(
					'label' => 'Link to the numbers',
					'en'    => 'See the models and how they compare',
					'am'    => 'ሞዴሎቹንና ንጽጽራቸውን ይመልከቱ',
				),
			),
		),
		'speech'    => array(
			'title'  => 'Speech',
			'fields' => array(
				'speech_title'   => array(
					'label' => 'Headline',
					'en'    => 'Speak in Amharic. Nota writes it.',
					'am'    => 'በአማርኛ ይናገሩ፤ Nota ይጽፈዋል።',
				),
				'dictate_title'  => array(
					'label' => 'Dictation: title',
					'en'    => 'Dictate',
					'am'    => 'በድምፅ ጻፍ',
				),
				'dictate_text'   => array(
					'label' => 'Dictation: text',
					'type'  => 'textarea',
					'en'    => 'Talk into the open note. Your words appear at the cursor after each pause, while you keep talking.',
					'am'    => 'በተከፈተው ማስታወሻ ላይ ይናገሩ። ከእያንዳንዱ ቆም ማለት በኋላ ቃላትዎ ጠቋሚው ባለበት ይታያሉ፤ እርስዎም መናገርዎን ይቀጥላሉ።',
				),
				'dictate_alt'    => array(
					'label' => 'Dictation: clip description, for screen readers',
					'type'  => 'textarea',
					'en'    => 'A note in Nota with two Amharic sentences typed at the cursor by dictation.',
					'am'    => 'በድምፅ መጻፍ ጠቋሚው ባለበት ሁለት የአማርኛ ዓረፍተ ነገሮችን የጻፈበት የNota ማስታወሻ።',
				),
				'voice_title'    => array(
					'label' => 'Voice notes: title',
					'en'    => 'Voice notes',
					'am'    => 'የድምፅ ማስታወሻዎች',
				),
				'voice_text'     => array(
					'label' => 'Voice notes: text',
					'type'  => 'textarea',
					'en'    => 'Record, and the transcript becomes a note you can edit, with its full stops and question marks put back. Play the recording any time, or transcribe it again.',
					'am'    => 'ይቅረጹ፤ የተቀየረው ጽሑፍ ሊያርሙት የሚችሉት ማስታወሻ ይሆናል፤ ሙሉ ማቆሚያዎቹና የጥያቄ ምልክቶቹም ይመለሱለታል። ቅጂውን በፈለጉ ጊዜ ያዳምጡ፣ ወይም እንደገና ወደ ጽሑፍ ይቀይሩት።',
				),
				'voice_alt'      => array(
					'label' => 'Voice notes: screenshot description, for screen readers',
					'type'  => 'textarea',
					'en'    => 'A voice note in Nota: the Amharic transcript as a note, with a player for the recording below it.',
					'am'    => 'የድምፅ ማስታወሻ በNota፦ የአማርኛ ጽሑፉ እንደ ማስታወሻ፣ ከሥሩ የቅጂው ማጫወቻ።',
				),
				'import_title'   => array(
					'label' => 'Recordings: title',
					'en'    => 'Any recording you already have',
					'am'    => 'ያለዎት ማንኛውም ቅጂ',
				),
				'import_text'    => array(
					'label' => 'Recordings: text',
					'type'  => 'textarea',
					'en'    => 'A voice memo from your phone or a Telegram voice message: drop it on the note list and get the Amharic text, up to 30 minutes at a time.',
					'am'    => 'ከስልክዎ የድምፅ ቅጂ ወይም የቴሌግራም የድምፅ መልዕክት፦ በማስታወሻ ዝርዝሩ ላይ ይጣሉት፤ የአማርኛ ጽሑፉን ያገኛሉ። በአንድ ጊዜ እስከ 30 ደቂቃ።',
				),
			),
		),
		'anywhere'  => array(
			'title'  => 'Dictate into any app',
			'fields' => array(
				'anywhere_badge'         => array(
					'label' => 'Badge above the headline (change or empty it once the version is out)',
					'en'    => 'Coming in the next version',
					'am'    => 'በሚቀጥለው ስሪት ይመጣል',
				),
				'anywhere_title'         => array(
					'label' => 'Headline',
					'en'    => 'Speak Amharic into any app.',
					'am'    => 'በማንኛውም መተግበሪያ ውስጥ በአማርኛ ይናገሩ።',
				),
				'anywhere_text'          => array(
					'label' => 'Text under the headline',
					'type'  => 'textarea',
					'en'    => 'Mail, a browser, a chat: wherever your cursor is, Nota types what you say. It transcribes on your own device, and the audio never leaves it.',
					'am'    => 'ኢሜይል፣ አሳሽ፣ የመልዕክት መተግበሪያ፦ ጠቋሚዎ ባለበት ሁሉ Nota የሚናገሩትን ይጽፋል። ወደ ጽሑፍ የሚቀይረው በራስዎ መሣሪያ ላይ ነው፤ ድምፁም ከመሣሪያው አይወጣም።',
				),
				'step_1_title'           => array(
					'label' => 'Step 1: title',
					'en'    => 'Hold',
					'am'    => 'ይያዙ',
				),
				'step_1_text'            => array(
					'label' => 'Step 1: text',
					'type'  => 'textarea',
					'en'    => 'Hold fn on a Mac, or press the shortcut. On Android, hold or tap the floating mic.',
					'am'    => 'በማክ ላይ fn ይያዙ፣ ወይም አቋራጩን ይጫኑ። በAndroid ላይ ተንሳፋፊውን ማይክ ይያዙ ወይም ይንኩ።',
				),
				'step_2_title'           => array(
					'label' => 'Step 2: title',
					'en'    => 'Speak',
					'am'    => 'ይናገሩ',
				),
				'step_2_text'            => array(
					'label' => 'Step 2: text',
					'type'  => 'textarea',
					'en'    => 'Say it in Amharic, for as long as you need: up to 10 minutes on a computer, 5 on a phone.',
					'am'    => 'በአማርኛ የፈለጉትን ያህል ይናገሩ፦ በኮምፒውተር እስከ 10 ደቂቃ፣ በስልክ እስከ 5 ደቂቃ።',
				),
				'step_3_title'           => array(
					'label' => 'Step 3: title',
					'en'    => 'Let go',
					'am'    => 'ይልቀቁ',
				),
				'step_3_text'            => array(
					'label' => 'Step 3: text',
					'type'  => 'textarea',
					'en'    => 'Let go, or press the shortcut again. The words appear at your cursor, with full stops and question marks.',
					'am'    => 'ይልቀቁ፣ ወይም አቋራጩን እንደገና ይጫኑ። ቃላቱ ጠቋሚዎ ባለበት ይገባሉ፤ ሙሉ ማቆሚያዎችና የጥያቄ ምልክቶችም አብረው።',
				),
				'anywhere_desktop_title' => array(
					'label' => 'Computer: title',
					'en'    => 'On your computer',
					'am'    => 'በኮምፒውተርዎ ላይ',
				),
				'anywhere_desktop_text'  => array(
					'label' => 'Computer: text',
					'type'  => 'textarea',
					'en'    => 'Hold fn in any app, speak, and let go. For longer dictation, press ⌘⇧Space to start and again to stop (Ctrl+Shift+Space on Windows and Linux). A small pill shows it listening; Escape cancels.',
					'am'    => 'በማንኛውም መተግበሪያ ውስጥ fn ይያዙ፣ ይናገሩና ይልቀቁ። ለረጅም ጊዜ ለመናገር ⌘⇧Space ይጫኑ፣ ለማቆም እንደገና ይጫኑ (በWindows እና Linux ላይ Ctrl+Shift+Space)። ትንሽ ምልክት ማዳመጡን ያሳያል፤ Escape ይሰርዘዋል።',
				),
				'anywhere_desktop_small' => array(
					'label' => 'Computer: small print',
					'type'  => 'textarea',
					'en'    => 'Choose the key to hold (fn or a right-hand ⌘, ⌥, ⌃ or ⇧) and the shortcut in Settings, or keep each dictation as a voice note. On a Mac, typing into other apps needs Accessibility access; holding a key works on macOS only.',
					'am'    => 'የሚይዙትን ቁልፍ (fn ወይም የቀኝ ⌘፣ ⌥፣ ⌃ ወይም ⇧) እና አቋራጩን በቅንብሮች ውስጥ ይምረጡ፤ ወይም እያንዳንዱን የድምፅ ጽሑፍ እንደ የድምፅ ማስታወሻ ያስቀምጡ። በማክ ላይ ወደ ሌሎች መተግበሪያዎች ለመጻፍ የAccessibility ፈቃድ ያስፈልጋል፤ ቁልፍ ይዞ መናገር የሚሠራው በmacOS ላይ ብቻ ነው።',
				),
				'anywhere_phone_title'   => array(
					'label' => 'Android: title',
					'en'    => 'On Android: the floating mic',
					'am'    => 'በAndroid ላይ፦ ተንሳፋፊው ማይክ',
				),
				'anywhere_phone_text'    => array(
					'label' => 'Android: text',
					'type'  => 'textarea',
					'en'    => 'While you type in any app, a round mic floats at the edge of the screen. Tap it to start and again to stop, or hold it while you speak. Drag it to the side that suits you.',
					'am'    => 'በማንኛውም መተግበሪያ ሲጽፉ ክብ ማይክ በማያ ገጹ ጠርዝ ላይ ይንሳፈፋል። ለመጀመር ይንኩት፣ ለማቆም እንደገና ይንኩት፤ ወይም እየተናገሩ ተጭነው ይያዙት። ወደሚመችዎ ጎን ይጎትቱት።',
				),
				'anywhere_phone_small'   => array(
					'label' => 'Android: small print',
					'type'  => 'textarea',
					'en'    => 'Turn it on in the app\'s Settings, Floating mic. Android asks you to allow it in Accessibility settings; it uses that only to find the text box and type into it. iPhones let no app float over others, so iOS has none.',
					'am'    => 'በመተግበሪያው ቅንብሮች ውስጥ «ተንሳፋፊ ማይክ»ን ያብሩ። Android በAccessibility ቅንብሮች ውስጥ እንዲፈቅዱለት ይጠይቃል፤ ይህን የሚጠቀመው የጽሑፍ ሳጥኑን ለማግኘትና በውስጡ ለመጻፍ ብቻ ነው። iPhone ማንኛውም መተግበሪያ በሌሎች ላይ እንዲንሳፈፍ ስለማይፈቅድ በiOS ላይ የለም።',
				),
				'anywhere_sample'        => array(
					'label' => 'Sentence in the pictures of the pill and the mic',
					'en'    => 'ነገ ጠዋት ስብሰባው በሦስት ሰዓት ይጀምራል።',
					'am'    => 'ነገ ጠዋት ስብሰባው በሦስት ሰዓት ይጀምራል።',
				),
				'anywhere_listening'     => array(
					'label' => 'Word in the picture of the pill',
					'en'    => 'Listening',
					'am'    => 'እያዳመጠ ነው',
				),
			),
		),
		'notes'     => array(
			'title'  => 'Features',
			'fields' => array(
				'notes_title'    => array(
					'label' => 'Headline',
					'en'    => 'A proper notes app, in your calendar and your script.',
					'am'    => 'በዘመን አቆጣጠርዎና በፊደልዎ የሚሠራ የማስታወሻ መተግበሪያ።',
				),
				'tags_title'     => array(
					'label' => 'Tags and links: title',
					'en'    => 'Tags and links',
					'am'    => 'መለያዎችና አገናኞች',
				),
				'tags_text'      => array(
					'label' => 'Tags and links: text',
					'type'  => 'textarea',
					'en'    => 'Type <code>#work/meetings</code> anywhere in a note and it is filed, with nested tags in the sidebar. Type <code>[[a note\'s title]]</code> to link two notes, with backlinks.',
					'am'    => 'በማስታወሻ ውስጥ በማንኛውም ቦታ <code>#ስራ/ስብሰባ</code> ብለው ይጻፉ፤ ማስታወሻው ይመደባል፤ መለያዎቹም በጎን አሞሌው ውስጥ በተዋረድ ይታያሉ። ሁለት ማስታወሻዎችን ለማገናኘት <code>[[የማስታወሻ ርዕስ]]</code> ብለው ይጻፉ።',
				),
				'tags_alt'       => array(
					'label' => 'Tags and links: screenshot description, for screen readers',
					'type'  => 'textarea',
					'en'    => "Nota's sidebar: sections, then tags in Amharic and English with a nested tag opened.",
					'am'    => 'የNota የጎን አሞሌ፦ ክፍሎች፣ ከዚያም በአማርኛና በእንግሊዝኛ ያሉ መለያዎች፣ አንዱ የተዋረድ መለያ ተከፍቶ።',
				),
				'calendar_title' => array(
					'label' => 'Calendar: title',
					'en'    => 'The Ethiopian calendar',
					'am'    => 'የኢትዮጵያ ዘመን አቆጣጠር',
				),
				'calendar_text'  => array(
					'label' => 'Calendar: text',
					'type'  => 'textarea',
					'en'    => 'See every date in the Ethiopian calendar, the Gregorian, or both side by side.',
					'am'    => 'እያንዳንዱን ቀን በኢትዮጵያ ዘመን አቆጣጠር፣ በግሪጎሪያን፣ ወይም በሁለቱም ጎን ለጎን ይመልከቱ።',
				),
				'calendar_today' => array(
					'label' => 'Calendar: label above today\'s date',
					'en'    => 'Today',
					'am'    => 'ዛሬ',
				),
				'calendar_alt'   => array(
					'label' => 'Calendar: screenshot description, for screen readers',
					'type'  => 'textarea',
					'en'    => "A note's information panel, with its dates in both calendars and its counts of words and characters.",
					'am'    => 'የማስታወሻ መረጃ ሰሌዳ፤ ቀኖቹ በሁለቱም አቆጣጠሮች፣ ከቃላትና ከፊደላት ብዛት ጋር።',
				),
				'zen_title'      => array(
					'label' => 'Zen mode: title',
					'en'    => 'Zen mode',
					'am'    => 'የትኩረት ሁነታ',
				),
				'zen_text'       => array(
					'label' => 'Zen mode: text',
					'type'  => 'textarea',
					'en'    => 'Only the note on screen, for writing or dictating without distractions.',
					'am'    => 'በማያ ገጹ ላይ ማስታወሻው ብቻ፤ ያለ ምንም መረበሽ ለመጻፍ ወይም በድምፅ ለመጻፍ።',
				),
				'zen_alt'        => array(
					'label' => 'Zen mode: screenshot description, for screen readers',
					'type'  => 'textarea',
					'en'    => 'Nota in Zen mode, showing only an Amharic note.',
					'am'    => 'Nota በትኩረት ሁነታ፣ የአማርኛ ማስታወሻ ብቻ እያሳየ።',
				),
				'write_title'    => array(
					'label' => 'Markdown: title',
					'en'    => 'Markdown as you type',
					'am'    => 'ሲጽፉ የሚሠራ Markdown',
				),
				'write_text'     => array(
					'label' => 'Markdown: text',
					'type'  => 'textarea',
					'en'    => 'Headings, lists, checklists, quotes and highlights turn into formatting as you write.',
					'am'    => 'ርዕሶች፣ ዝርዝሮች፣ የማረጋገጫ ዝርዝሮች፣ ጥቅሶችና ማድመቂያዎች ሲጽፉ ወደ ቅርጸት ይቀየራሉ።',
				),
				'fonts_title'    => array(
					'label' => 'Fonts: title',
					'en'    => '15 fonts, Amharic first',
					'am'    => '15 ፊደሎች፣ አማርኛ ቅድሚያ',
				),
				'fonts_text'     => array(
					'label' => 'Fonts: text',
					'type'  => 'textarea',
					'en'    => 'Noto Sans Ethiopic, Noto Serif Ethiopic and Abyssinica SIL ship with the app, and every Latin font falls back to a Ge\'ez face, so Amharic never shows as boxes.',
					'am'    => 'Noto Sans Ethiopic፣ Noto Serif Ethiopic እና Abyssinica SIL ከመተግበሪያው ጋር ይመጣሉ። እያንዳንዱ የላቲን ፊደል የግዕዝ አማራጭ ስላለው አማርኛ እንደ ሳጥን አይታይም።',
				),
				'assist_title'   => array(
					'label' => 'Summarize: title',
					'en'    => 'Summarize and organize',
					'am'    => 'አጠቃልል እና አደራጅ',
				),
				'assist_text'    => array(
					'label' => 'Summarize: text',
					'type'  => 'textarea',
					'en'    => 'A note\'s key sentences, a long transcript cut into paragraphs, and tags that file it with notes like it. Worked out on your computer, with no model and no download.',
					'am'    => 'የማስታወሻው ዋና ዋና ዓረፍተ ነገሮች፣ በአንቀጾች የተከፋፈለ ረጅም ጽሑፍ፣ እና ከተመሳሳይ ማስታወሻዎች ጋር የሚመድቡ መለያዎች። በኮምፒውተርዎ ላይ፣ ያለ ሞዴልና ያለ ማውረድ ይሠራል።',
				),
				'notes_more'     => array(
					'label' => 'One line under the features',
					'type'  => 'textarea',
					'en'    => 'Also: search in Amharic or English, pinning and an Archive, export to Markdown, a web page or plain text, and the whole interface in either language.',
					'am'    => 'ሌሎችም፦ በአማርኛ ወይም በእንግሊዝኛ ፍለጋ፣ መሰካትና ማህደር፣ ወደ Markdown፣ ድረ ገጽ ወይም ተራ ጽሑፍ ማስወጣት፣ እና መላው በይነገጽ በሁለቱም ቋንቋዎች።',
				),
			),
		),
		'privacy'   => array(
			'title'  => 'Privacy',
			'fields' => array(
				'privacy_title'     => array(
					'label' => 'Headline',
					'en'    => 'Your notes stay on your device.',
					'am'    => 'ማስታወሻዎችዎ በመሣሪያዎ ላይ ይቆያሉ።',
				),
				'privacy_net_title' => array(
					'label' => 'Network: title',
					'en'    => 'No account, no network',
					'am'    => 'አካውንት የለም፣ ኢንተርኔት አያስፈልግም',
				),
				'privacy_net_text'  => array(
					'label' => 'Network: text',
					'type'  => 'textarea',
					'en'    => 'Nota makes no network requests while you use it. Fonts ship with the app, and speech runs on your machine.',
					'am'    => 'Nota በሚጠቀሙበት ጊዜ ምንም የኢንተርኔት ጥያቄ አያደርግም። ፊደሎቹ ከመተግበሪያው ጋር ይመጣሉ፤ ንግግርም በራስዎ መሣሪያ ላይ ይሠራል።',
				),
				'privacy_files_title' => array(
					'label' => 'Files: title',
					'en'    => 'Plain files you can see',
					'am'    => 'የሚታዩ ተራ ፋይሎች',
				),
				'privacy_files_text' => array(
					'label' => 'Files: text',
					'type'  => 'textarea',
					'en'    => 'One JSON file per note and a WAV beside each spoken note, in a folder on your computer. Export any note as Markdown, a web page or plain text.',
					'am'    => 'ለእያንዳንዱ ማስታወሻ አንድ JSON ፋይል፣ ከእያንዳንዱ የድምፅ ማስታወሻ ጎን አንድ WAV ፋይል፣ በኮምፒውተርዎ አቃፊ ውስጥ። ማንኛውንም ማስታወሻ እንደ Markdown፣ ድረ ገጽ ወይም ተራ ጽሑፍ ያስወጡ።',
				),
				'privacy_lock_title' => array(
					'label' => 'Locked notes: title',
					'en'    => 'Locked notes',
					'am'    => 'የተቆለፉ ማስታወሻዎች',
				),
				'privacy_lock_text' => array(
					'label' => 'Locked notes: text',
					'type'  => 'textarea',
					'en'    => 'Encrypt a note and its recording with a password: AES-256-GCM, with the key held in memory only while unlocked. There is no recovery, so keep the password safe.',
					'am'    => 'ማስታወሻንና ቅጂውን በይለፍ ቃል ያመስጥሩ፦ AES-256-GCM፤ ቁልፉ የሚቆየው ተከፍቶ ባለበት ጊዜ ብቻ በማህደረ ትውስታ ውስጥ ነው። የይለፍ ቃሉ ከጠፋ መመለሻ የለም፤ በደህና ያስቀምጡት።',
				),
				'privacy_code_title' => array(
					'label' => 'Open source: title',
					'en'    => 'Open source',
					'am'    => 'ክፍት ምንጭ',
				),
				'privacy_code_text' => array(
					'label' => 'Open source: text',
					'type'  => 'textarea',
					'en'    => 'Free, under the MIT License. You can read every line on GitHub, or build it yourself.',
					'am'    => 'በMIT ፈቃድ ነፃ ነው። እያንዳንዱን መስመር በGitHub ላይ ማንበብ፣ ወይም ራስዎ መገንባት ይችላሉ።',
				),
				'privacy_code_link' => array(
					'label' => 'Open source: link',
					'en'    => 'Nota on GitHub',
					'am'    => 'Nota በGitHub',
				),
			),
		),
		'devices'   => array(
			'title'  => 'Desktop and phone',
			'fields' => array(
				'devices_title'  => array(
					'label' => 'Headline',
					'en'    => 'On your computer, and on your phone.',
					'am'    => 'በኮምፒውተርዎና በስልክዎ ላይ።',
				),
				'desktop_title'  => array(
					'label' => 'Desktop: title',
					'en'    => 'macOS, Windows and Linux',
					'am'    => 'macOS፣ Windows እና Linux',
				),
				'desktop_text'   => array(
					'label' => 'Desktop: text',
					'type'  => 'textarea',
					'en'    => 'Hohe comes inside the download, so speech works from the first launch with nothing else to install.',
					'am'    => 'Hohe ከማውረጃው ጋር አብሮ ይመጣል፤ ስለዚህ ሌላ ነገር መጫን ሳያስፈልግ ንግግር ከመጀመሪያው ጀምሮ ይሠራል።',
				),
				'desktop_needs'  => array(
					'label' => 'Desktop: what speech needs',
					'type'  => 'textarea',
					'en'    => 'Built-in speech needs an Apple silicon Mac on macOS 14 or later, Windows or Linux, and about 3 GB of free memory while it transcribes a long recording. Intel Macs can write notes but have no speech.',
					'am'    => 'አብሮ የተካተተው ንግግር macOS 14 ወይም ከዚያ በኋላ ያለው Apple silicon ማክ፣ Windows ወይም Linux፣ እንዲሁም ረጅም ቅጂ ወደ ጽሑፍ ሲቀየር 3 ጊባ ያህል ነፃ ማህደረ ትውስታ ይፈልጋል። የIntel ማኮች ማስታወሻ መጻፍ ይችላሉ፤ ንግግር ግን የላቸውም።',
				),
				'phone_title'    => array(
					'label' => 'Phone: title',
					'en'    => 'Android and iOS',
					'am'    => 'Android እና iOS',
				),
				'phone_text'     => array(
					'label' => 'Phone: text',
					'type'  => 'textarea',
					'en'    => 'The same notes features and the same Hohe model, running on the phone itself. On Android, a floating mic types Amharic into any app, and notes stay out of cloud backups.',
					'am'    => 'ተመሳሳይ የማስታወሻ ባህሪያትና ተመሳሳይ የHohe ሞዴል፣ በስልኩ ላይ የሚሠራ። በAndroid ላይ ተንሳፋፊ ማይክ በማንኛውም መተግበሪያ ውስጥ አማርኛ ይጽፋል፤ ማስታወሻዎችም ወደ ደመና ምትኬ አይገቡም።',
				),
				'phone_caveat'   => array(
					'label' => 'Phone: how to get it today',
					'type'  => 'textarea',
					'en'    => 'Not in the app stores yet. For now you build the app from source (Android 7 or iOS 16 and later). The first time, the app downloads its speech models, 841 MB, on the Speech models screen; use Wi-Fi if you can. You can also copy them over from a computer. Transcribing needs about 2 GB of free memory.',
					'am'    => 'እስካሁን በመተግበሪያ መደብሮች ውስጥ የለም። ለጊዜው መተግበሪያውን ከምንጩ ኮድ ይገነባሉ (Android 7 ወይም iOS 16 እና ከዚያ በኋላ)። ለመጀመሪያ ጊዜ መተግበሪያው 841 ሜባ የሆኑትን የንግግር ሞዴሎች በ«የንግግር ሞዴሎች» ገጽ ላይ ያወርዳል፤ ከተቻለ Wi-Fi ይጠቀሙ። ሞዴሎቹን ከኮምፒውተርም መቅዳት ይችላሉ። ወደ ጽሑፍ መቀየር 2 ጊባ ያህል ነፃ ማህደረ ትውስታ ይፈልጋል።',
				),
				'phone_guide'    => array(
					'label' => 'Phone: link to the build guide',
					'en'    => 'Read the phone guide',
					'am'    => 'የስልክ መመሪያውን ያንብቡ',
				),
				'phone_notify'   => array(
					'label' => 'Phone: link to ask for news',
					'en'    => 'Email me when it is ready',
					'am'    => 'ሲዘጋጅ በኢሜይል አሳውቁኝ',
				),
				'phone_android'  => array(
					'label' => 'Phone: Android button (shows once you add its link)',
					'en'    => 'Get it for Android',
					'am'    => 'ለAndroid ያግኙት',
				),
				'phone_ios'      => array(
					'label' => 'Phone: iPhone button (shows once you add its link)',
					'en'    => 'Get it for iPhone',
					'am'    => 'ለiPhone ያግኙት',
				),
				'phone_home_alt' => array(
					'label' => 'Phone: list screenshot description, for screen readers',
					'type'  => 'textarea',
					'en'    => "Nota's list of notes on an Android phone, with a search box and a record button.",
					'am'    => 'በAndroid ስልክ ላይ የNota ማስታወሻዎች ዝርዝር፣ ከፍለጋ ሳጥንና ከመቅረጫ ቁልፍ ጋር።',
				),
				'phone_note_alt' => array(
					'label' => 'Phone: note screenshot description, for screen readers',
					'type'  => 'textarea',
					'en'    => 'A voice note open in Nota on an Android phone, with its Amharic transcript.',
					'am'    => 'በAndroid ስልክ ላይ በNota የተከፈተ የድምፅ ማስታወሻ፣ ከአማርኛ ጽሑፉ ጋር።',
				),
			),
		),
		'download'  => array(
			'title'  => 'Download',
			'fields' => array(
				'download_title'      => array(
					'label' => 'Headline',
					'en'    => 'Free, for your computer.',
					'am'    => 'ነፃ፣ ለኮምፒውተርዎ።',
				),
				'download_text'       => array(
					'label' => 'Text under the headline',
					'type'  => 'textarea',
					'en'    => 'Most files are about 0.9 GB because the speech model ships inside them, so there is nothing more to download.',
					'am'    => 'አብዛኞቹ ፋይሎች 0.9 ጊባ ያህል ናቸው፤ ምክንያቱም የንግግር ሞዴሉ በውስጣቸው አለ። ስለዚህ ሌላ የሚወርድ ነገር የለም።',
				),
				'download_version'    => array(
					'label' => 'Version label ({version} is the version number)',
					'en'    => 'Version {version}',
					'am'    => 'ስሪት {version}',
				),
				'download_notes'      => array(
					'label' => 'Link to that version\'s release notes ({version} is the version number)',
					'en'    => 'What\'s new in {version}',
					'am'    => 'የ{version} አዳዲስ ነገሮች',
				),
				'download_count'      => array(
					'label' => 'Download total, when Visits and downloads says to show it ({count} is the number)',
					'en'    => '{count} downloads so far',
					'am'    => 'እስካሁን {count} ጊዜ ወርዷል',
				),
				'dl_first_launch'     => array(
					'label' => 'Label for the first-launch help',
					'en'    => 'First launch',
					'am'    => 'የመጀመሪያ ጊዜ አከፋፈት',
				),
				'dl_mac_silicon'      => array(
					'label' => 'macOS: Apple silicon button',
					'en'    => 'Apple silicon (M1 and later)',
					'am'    => 'Apple silicon (M1 እና ከዚያ በኋላ)',
				),
				'dl_mac_silicon_meta' => array(
					'label' => 'macOS: Apple silicon file type and size',
					'en'    => '.dmg, about 0.9 GB',
					'am'    => '.dmg፣ 0.9 ጊባ ያህል',
				),
				'dl_mac_intel'        => array(
					'label' => 'macOS: Intel button',
					'en'    => 'Intel (writing only, no speech)',
					'am'    => 'Intel (መጻፍ ብቻ፣ ንግግር የለም)',
				),
				'dl_mac_intel_meta'   => array(
					'label' => 'macOS: Intel file type and size',
					'en'    => '.dmg, about 130 MB',
					'am'    => '.dmg፣ 130 ሜባ ያህል',
				),
				'dl_mac_note'         => array(
					'label' => 'macOS: first-launch help',
					'type'  => 'textarea',
					'en'    => 'Nota is not notarised by Apple yet, so macOS blocks its first launch. Drag Nota to Applications and open it once. When macOS blocks it, go to System Settings, Privacy & Security, choose Open Anyway, then open Nota again and confirm. Speech on macOS 13 needs a one-time setup that downloads the model.',
					'am'    => 'Nota እስካሁን በApple አልተረጋገጠም፤ ስለዚህ macOS የመጀመሪያውን አከፋፈት ይከለክላል። Notaን ወደ Applications ጎትተው አንድ ጊዜ ይክፈቱት። macOS ሲከለክለው System Settings፣ Privacy & Security ውስጥ ገብተው Open Anyway ይምረጡ፣ ከዚያ Notaን እንደገና ከፍተው ያረጋግጡ። በmacOS 13 ላይ ንግግር ሞዴሉን የሚያወርድ የአንድ ጊዜ ማዋቀር ይፈልጋል።',
				),
				'dl_win_x64'          => array(
					'label' => 'Windows: x64 button',
					'en'    => 'x64 (Intel or AMD)',
					'am'    => 'x64 (Intel ወይም AMD)',
				),
				'dl_win_x64_meta'     => array(
					'label' => 'Windows: x64 file type and size',
					'en'    => 'Installer, about 0.9 GB',
					'am'    => 'መጫኛ፣ 0.9 ጊባ ያህል',
				),
				'dl_win_arm'          => array(
					'label' => 'Windows: ARM64 button',
					'en'    => 'ARM64',
					'am'    => 'ARM64',
				),
				'dl_win_arm_meta'     => array(
					'label' => 'Windows: ARM64 file type and size',
					'en'    => 'Installer, about 0.9 GB',
					'am'    => 'መጫኛ፣ 0.9 ጊባ ያህል',
				),
				'dl_win_note'         => array(
					'label' => 'Windows: first-launch help',
					'type'  => 'textarea',
					'en'    => 'Nota is not signed yet. When Windows says it protected your PC, choose More info, then Run anyway. Speech also needs the Microsoft Visual C++ Redistributable: if Nota says Hohe could not start, install it and open Nota again.',
					'am'    => 'Nota እስካሁን አልተፈረመም። Windows ኮምፒውተርዎን እንደጠበቀ ሲናገር More info፣ ከዚያ Run anyway ይምረጡ። ንግግር Microsoft Visual C++ Redistributable ይፈልጋል፤ Nota Hohe መጀመር አልቻለም ካለ፣ ይህን ጭነው Notaን እንደገና ይክፈቱ።',
				),
				'dl_linux_x64'        => array(
					'label' => 'Linux: x86-64 button',
					'en'    => 'x86-64 (Intel or AMD)',
					'am'    => 'x86-64 (Intel ወይም AMD)',
				),
				'dl_linux_x64_meta'   => array(
					'label' => 'Linux: x86-64 file type and size',
					'en'    => 'AppImage, about 0.9 GB',
					'am'    => 'AppImage፣ 0.9 ጊባ ያህል',
				),
				'dl_linux_arm'        => array(
					'label' => 'Linux: ARM64 button',
					'en'    => 'ARM64',
					'am'    => 'ARM64',
				),
				'dl_linux_arm_meta'   => array(
					'label' => 'Linux: ARM64 file type and size',
					'en'    => 'AppImage, about 0.9 GB',
					'am'    => 'AppImage፣ 0.9 ጊባ ያህል',
				),
				'dl_linux_note'       => array(
					'label' => 'Linux: first-launch help',
					'type'  => 'textarea',
					'en'    => 'AppImages need FUSE 2: on Ubuntu 24.04 run <code>sudo apt install libfuse2t64</code> once (on 22.04, <code>libfuse2</code>). Make the file executable with <code>chmod +x</code> and run it. If it closes at once, add <code>--no-sandbox</code>.',
					'am'    => 'AppImage FUSE 2 ይፈልጋል፦ በUbuntu 24.04 ላይ አንድ ጊዜ <code>sudo apt install libfuse2t64</code> ያስኪዱ (በ22.04 ላይ <code>libfuse2</code>)። ፋይሉን በ<code>chmod +x</code> ተፈጻሚ አድርገው ያስኪዱት። ወዲያው ከተዘጋ <code>--no-sandbox</code> ይጨምሩ።',
				),
				'download_all'        => array(
					'label' => 'Link to all releases',
					'en'    => 'All versions, and the .zip and .tar.gz files',
					'am'    => 'ሁሉም ስሪቶች፣ እንዲሁም የ.zip እና የ.tar.gz ፋይሎች',
				),
				'download_tested'     => array(
					'label' => 'Note on what has been tested (empty it once the other builds are tried)',
					'type'  => 'textarea',
					'en'    => 'So far the Apple silicon build has been run from start to finish. The Intel Mac, Windows and Linux builds have not been run on those systems yet. If something goes wrong, please open an issue.',
					'am'    => 'እስካሁን ከመጀመሪያ እስከ መጨረሻ የተሞከረው የApple silicon ስሪት ነው። የIntel ማክ፣ የWindows እና የLinux ስሪቶች በእነዚያ ስርዓቶች ላይ ገና አልተሞከሩም። ችግር ካጋጠመዎት እባክዎ ሪፖርት ያድርጉ።',
				),
				'download_issue'      => array(
					'label' => 'Link to report a problem',
					'en'    => 'Report a problem',
					'am'    => 'ችግር ሪፖርት ያድርጉ',
				),
			),
		),
		'faq'       => array(
			'title'  => 'Questions',
			'fields' => array(
				'faq_title' => array(
					'label' => 'Headline',
					'en'    => 'Questions',
					'am'    => 'ጥያቄዎች',
				),
				'faq_1_q'   => array(
					'label' => 'Question 1',
					'en'    => 'Does Nota need the internet?',
					'am'    => 'Nota ኢንተርኔት ይፈልጋል?',
				),
				'faq_1_a'   => array(
					'label' => 'Answer 1',
					'type'  => 'textarea',
					'en'    => 'No. Notes, speech and fonts are all on your device. Speech goes online once in two cases: the phone app downloads its speech models the first time (or you copy them from a computer), and an Apple silicon Mac still on macOS 13 downloads the model in a one-time setup. After that, both work offline.',
					'am'    => 'አይፈልግም። ማስታወሻዎች፣ ንግግርና ፊደሎች ሁሉም በመሣሪያዎ ላይ ናቸው። ንግግር ኢንተርኔት የሚፈልገው በሁለት ሁኔታዎች አንድ ጊዜ ብቻ ነው፤ የስልኩ መተግበሪያ የንግግር ሞዴሎቹን ለመጀመሪያ ጊዜ ሲያወርድ (ከኮምፒውተርም መቅዳት ይቻላል)፣ እና በmacOS 13 ላይ ያለ Apple silicon ማክ በአንድ ጊዜ ማዋቀር ሞዴሉን ሲያወርድ። ከዚያ በኋላ ሁለቱም ያለ ኢንተርኔት ይሠራሉ።',
				),
				'faq_2_q'   => array(
					'label' => 'Question 2',
					'en'    => 'Is it free?',
					'am'    => 'ነፃ ነው?',
				),
				'faq_2_a'   => array(
					'label' => 'Answer 2',
					'type'  => 'textarea',
					'en'    => 'Yes. Nota is free and open source under the MIT License. The speech models it uses keep their own licences.',
					'am'    => 'አዎ። Nota በMIT ፈቃድ ነፃና ክፍት ምንጭ ነው። የሚጠቀማቸው የንግግር ሞዴሎች የራሳቸው ፈቃድ አላቸው።',
				),
				'faq_3_q'   => array(
					'label' => 'Question 3',
					'en'    => 'How accurate is the Amharic speech?',
					'am'    => 'የአማርኛ ንግግሩ ትክክለኛነት ምን ያህል ነው?',
				),
				'faq_3_a'   => array(
					'label' => 'Answer 3',
					'type'  => 'textarea',
					'en'    => 'On a standard Amharic test, the first 150 clips of FLEURS, the built-in model gets about 7 characters in 100 wrong. Expect more mistakes in fast, spontaneous conversation, and numbers written out as words. You can edit every transcript.',
					'am'    => 'በመደበኛ የአማርኛ ሙከራ፣ በFLEURS የመጀመሪያዎቹ 150 ቅጂዎች ላይ፣ አብሮ የተካተተው ሞዴል ከ100 ፊደላት 7 ያህሉን ይሳሳታል። በፈጣንና ድንገተኛ ውይይት ላይ ተጨማሪ ስህተት ይጠብቁ፤ ቁጥሮችም በፊደል ይጻፋሉ። እያንዳንዱን ጽሑፍ ማረም ይችላሉ።',
				),
				'faq_4_q'   => array(
					'label' => 'Question 4',
					'en'    => 'Does it add punctuation?',
					'am'    => 'ሥርዓተ ነጥብ ይጨምራል?',
				),
				'faq_4_a'   => array(
					'label' => 'Answer 4',
					'type'  => 'textarea',
					'en'    => 'A whole recording, and a dictation into another app, gets its full stops and question marks from a small punctuation model that ships with the app. Dictate inside a note types the words as Hohe hears them, so there you add the marks yourself.',
					'am'    => 'ሙሉ ቅጂም ሆነ ወደ ሌላ መተግበሪያ የሚገባ የድምፅ ጽሑፍ ከመተግበሪያው ጋር በሚመጣ ትንሽ የሥርዓተ ነጥብ ሞዴል ሙሉ ማቆሚያዎቹንና የጥያቄ ምልክቶቹን ያገኛል። በማስታወሻ ውስጥ በድምፅ መጻፍ ግን ቃላቱን Hohe እንደሰማቸው ይጽፋል፤ ስለዚህ ምልክቶቹን ራስዎ ይጨምራሉ።',
				),
				'faq_5_q'   => array(
					'label' => 'Question 5',
					'en'    => 'Can I use it in English?',
					'am'    => 'በእንግሊዝኛ መጠቀም እችላለሁ?',
				),
				'faq_5_a'   => array(
					'label' => 'Answer 5',
					'type'  => 'textarea',
					'en'    => 'Yes. The whole interface, menu bar included, comes in English or Amharic, and you can write notes in either. Speech is Amharic only.',
					'am'    => 'አዎ። መላው በይነገጽ፣ የምናሌ አሞሌውን ጨምሮ፣ በእንግሊዝኛ ወይም በአማርኛ ይገኛል፤ ማስታወሻዎችንም በሁለቱም መጻፍ ይችላሉ። ንግግር ግን በአማርኛ ብቻ ነው።',
				),
				'faq_6_q'   => array(
					'label' => 'Question 6',
					'en'    => 'What if I forget the password to a locked note?',
					'am'    => 'የተቆለፈ ማስታወሻ የይለፍ ቃል ቢጠፋብኝስ?',
				),
				'faq_6_a'   => array(
					'label' => 'Answer 6',
					'type'  => 'textarea',
					'en'    => 'Nobody can open that note, including you. The password is not stored anywhere, so there is no way to recover it.',
					'am'    => 'ያን ማስታወሻ ማንም፣ እርስዎንም ጨምሮ፣ መክፈት አይችልም። የይለፍ ቃሉ የትም ስለማይቀመጥ መልሶ ማግኘት አይቻልም።',
				),
				'faq_7_q'   => array(
					'label' => 'Question 7 (empty to hide)',
					'en'    => 'Can I dictate into other apps?',
					'am'    => 'ወደ ሌሎች መተግበሪያዎች በድምፅ መጻፍ እችላለሁ?',
				),
				'faq_7_a'   => array(
					'label' => 'Answer 7 (it says "from the next version": change that once it is out)',
					'type'  => 'textarea',
					'en'    => 'Yes, from the next version. On a computer, hold fn in any app (or press ⌘⇧Space, Ctrl+Shift+Space on Windows and Linux), speak, and Nota types the words where your cursor is. On Android, the floating mic does the same beside any text box. iPhones let no app float over others, so there is no floating mic on iOS.',
					'am'    => 'አዎ፣ ከሚቀጥለው ስሪት ጀምሮ። በኮምፒውተር ላይ በማንኛውም መተግበሪያ ውስጥ fn ይያዙ (ወይም ⌘⇧Space ይጫኑ፤ በWindows እና Linux ላይ Ctrl+Shift+Space)፣ ይናገሩ፤ Nota ቃላቱን ጠቋሚዎ ባለበት ይጽፋል። በAndroid ላይ ተንሳፋፊው ማይክ በማንኛውም የጽሑፍ ሳጥን አጠገብ እንዲሁ ያደርጋል። iPhone ማንኛውም መተግበሪያ በሌሎች ላይ እንዲንሳፈፍ ስለማይፈቅድ በiOS ላይ ተንሳፋፊ ማይክ የለም።',
				),
				'faq_8_q'   => array(
					'label' => 'Question 8 (empty to hide)',
					'en'    => 'What can the floating mic see?',
					'am'    => 'ተንሳፋፊው ማይክ ምን ማየት ይችላል?',
				),
				'faq_8_a'   => array(
					'label' => 'Answer 8',
					'type'  => 'textarea',
					'en'    => 'Android\'s accessibility access is used for two things only: knowing which text box has focus, and typing into it. Nothing else on screen is read, and the audio never leaves the phone.',
					'am'    => 'የAndroid የAccessibility ፈቃድ ለሁለት ነገሮች ብቻ ይውላል፦ የትኛው የጽሑፍ ሳጥን እንደተመረጠ ለማወቅና በውስጡ ለመጻፍ። በማያ ገጹ ላይ ያለ ሌላ ምንም ነገር አይነበብም፤ ድምፁም ከስልኩ አይወጣም።',
				),
			),
		),
		'closing'   => array(
			'title'  => 'Closing band, above the footer',
			'fields' => array(
				'closing_title' => array(
					'label' => 'Headline (empty to hide the band)',
					'en'    => 'Write Amharic with your voice.',
					'am'    => 'አማርኛን በድምፅዎ ይጻፉ።',
				),
				'closing_text'  => array(
					'label' => 'Text under the headline',
					'type'  => 'textarea',
					'en'    => 'Free for macOS, Windows and Linux, with the speech model inside. No account to make, and nothing leaves your device.',
					'am'    => 'ለmacOS፣ Windows እና Linux ነፃ፤ የንግግር ሞዴሉ ውስጡ አለ። አካውንት መክፈት አያስፈልግም፤ ምንም ነገር ከመሣሪያዎ አይወጣም።',
				),
			),
		),
		'footer'    => array(
			'title'  => 'Footer',
			'fields' => array(
				'footer_tagline' => array(
					'label' => 'One line about Nota',
					'en'    => 'Offline Amharic notes you can write or speak.',
					'am'    => 'በመጻፍም በመናገርም የሚሠራ፣ ያለ ኢንተርኔት የአማርኛ ማስታወሻ።',
				),
				'footer_contact' => array(
					'label' => 'Contact heading',
					'en'    => 'Contact',
					'am'    => 'አድራሻ',
				),
				'footer_credit'  => array(
					'label' => 'Credit for the speech models',
					'type'  => 'textarea',
					'en'    => 'Speech by <a href="https://huggingface.co/snapwre/hohe-asr-amharic">Hohe ASR</a>, by Chapi and the Dataset.ET contributors, licensed <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Made by Rz Codes.',
					'am'    => 'ንግግር በ<a href="https://huggingface.co/snapwre/hohe-asr-amharic">Hohe ASR</a>፣ በChapi እና በDataset.ET አስተዋጽኦ አድራጊዎች፣ በ<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> ፈቃድ። በRz Codes የተሠራ።',
				),
			),
		),
		'releases'  => array(
			'title'  => 'Release notes page',
			'fields' => array(
				'releases_title' => array(
					'label' => 'Heading',
					'en'    => 'Release notes',
					'am'    => 'የስሪት ማስታወሻዎች',
				),
				'releases_intro' => array(
					'label' => 'Text under the heading, also the description in search results',
					'type'  => 'textarea',
					'en'    => 'What changed in each version of Nota, from the notes published with it on GitHub.',
					'am'    => 'በእያንዳንዱ የNota ስሪት ምን እንደተቀየረ፣ ከስሪቱ ጋር በGitHub ላይ ከወጣው ማስታወሻ።',
				),
			),
		),
		'beta'      => array(
			'title'  => 'Beta sign-up page',
			'fields' => array(
				'beta_title'       => array(
					'label' => 'Heading',
					'en'    => 'Join the Nota beta',
					'am'    => 'የNota ሙከራ ቡድንን ይቀላቀሉ',
				),
				'beta_intro'       => array(
					'label' => 'Text under the heading, also the description in search results and when shared',
					'type'  => 'textarea',
					'en'    => 'Nota is a notes app made for Amharic: you speak, and it writes. Help test the newest builds on your own computer or phone, and tell us what to fix.',
					'am'    => 'Nota ለአማርኛ የተሠራ የማስታወሻ መተግበሪያ ነው፤ እርስዎ ይናገራሉ፣ እሱ ይጽፋል። አዳዲስ ስሪቶቹን በራስዎ ኮምፒውተር ወይም ስልክ ላይ ሞክረው፣ መስተካከል ያለበትን ይንገሩን።',
				),
				'beta_steps_title' => array(
					'label' => 'Heading above the steps',
					'en'    => 'How it works',
					'am'    => 'እንዴት ይሠራል?',
				),
				'beta_step_1'      => array(
					'label' => 'Step 1 (empty all three to hide the steps)',
					'en'    => 'Sign up here. It takes a minute.',
					'am'    => 'እዚህ ይመዝገቡ፤ አንድ ደቂቃ ብቻ ይወስዳል።',
				),
				'beta_step_2'      => array(
					'label' => 'Step 2',
					'en'    => 'We send you the newest build on Telegram or by email.',
					'am'    => 'አዲሱን ስሪት በቴሌግራም ወይም በኢሜይል እንልክልዎታለን።',
				),
				'beta_step_3'      => array(
					'label' => 'Step 3',
					'en'    => 'Use it for your own notes, and tell us what works and what doesn\'t.',
					'am'    => 'ለራስዎ ማስታወሻዎች ይጠቀሙበት፤ የሚሠራውንና የማይሠራውን ይንገሩን።',
				),
				'beta_submit'      => array(
					'label' => 'Button',
					'en'    => 'Sign up for the beta',
					'am'    => 'ለሙከራው ይመዝገቡ',
				),
				'beta_privacy'     => array(
					'label' => 'Note under the button',
					'type'  => 'textarea',
					'en'    => 'We use your details only to send you the beta and to ask how it went. We don\'t share them, and we delete them when you ask.',
					'am'    => 'መረጃዎን የምንጠቀመው የሙከራ ስሪቱን ለመላክና አጠቃቀሙ እንዴት እንደነበር ለመጠየቅ ብቻ ነው። ለማንም አናጋራውም፤ ሲጠይቁን እናጠፋዋለን።',
				),
				'beta_done_title'  => array(
					'label' => 'After signing up: heading',
					'en'    => 'You\'re on the list.',
					'am'    => 'ተመዝግበዋል።',
				),
				'beta_done_text'   => array(
					'label' => 'After signing up: text',
					'type'  => 'textarea',
					'en'    => 'Thank you. We\'ll send you the beta on Telegram or by email when there\'s a build for your device.',
					'am'    => 'እናመሰግናለን። ለመሣሪያዎ የሚሆን ስሪት ሲዘጋጅ በቴሌግራም ወይም በኢሜይል እንልክልዎታለን።',
				),
				'beta_closed'      => array(
					'label' => 'In place of the form while sign-ups are closed',
					'type'  => 'textarea',
					'en'    => 'The beta isn\'t taking sign-ups just now. Thank you for your interest.',
					'am'    => 'ለጊዜው አዲስ የሙከራ ምዝገባ አንቀበልም። ስለ ፍላጎትዎ እናመሰግናለን።',
				),
			),
		),
		'seo'       => array(
			'title'  => 'Search and sharing',
			'fields' => array(
				'seo_title'       => array(
					'label' => 'Page title in search results',
					'en'    => 'Nota: offline Amharic notes you can write or speak',
					'am'    => 'Nota፦ በመጻፍም በመናገርም የሚሠራ፣ ያለ ኢንተርኔት የአማርኛ ማስታወሻ',
				),
				'seo_description' => array(
					'label' => 'Description in search results and when shared',
					'type'  => 'textarea',
					'en'    => 'A free notes app made for Amharic. Speak and get text, tag and link your notes, use Ethiopian dates. Everything runs on your device, with no account needed.',
					'am'    => 'ለአማርኛ የተሠራ ነፃ የማስታወሻ መተግበሪያ። ይናገሩ፣ ጽሑፍ ያግኙ፤ ማስታወሻዎችዎን ይመድቡና ያገናኙ፤ የኢትዮጵያ ቀን መቁጠሪያ ይጠቀሙ። ሁሉም በመሣሪያዎ ላይ ይሠራል፤ አካውንት አያስፈልግም።',
				),
			),
		),
	);

	return $sections;
}

/**
 * All copy fields, flat, by key.
 *
 * @return array<string, array<string, string>>
 */
function nota_content_fields() {
	static $fields = null;
	if ( null === $fields ) {
		$fields = array();
		foreach ( nota_content_sections() as $section ) {
			$fields += $section['fields'];
		}
	}
	return $fields;
}

/**
 * Settings that are the same in both languages: links, the version, images.
 *
 * @return array<string, array<string, string>>
 */
function nota_link_fields() {
	return array(
		'github_url'    => array(
			'label'   => 'GitHub repository',
			'default' => 'https://github.com/rabira-hierpa/Nota',
		),
		'version'       => array(
			'label'       => 'Latest version',
			'type'        => 'text',
			'description' => 'Change this one field when you publish a release. Every download link follows it, as long as the files keep their names.',
			'default'     => '0.3.0',
		),
		'mac_silicon_url' => array(
			'label'       => 'Download link: macOS, Apple silicon',
			'description' => 'Leave empty to link to the GitHub release for the version above.',
			'default'     => '',
		),
		'mac_intel_url' => array(
			'label'   => 'Download link: macOS, Intel',
			'default' => '',
		),
		'win_x64_url'   => array(
			'label'   => 'Download link: Windows, x64',
			'default' => '',
		),
		'win_arm_url'   => array(
			'label'   => 'Download link: Windows, ARM64',
			'default' => '',
		),
		'linux_x64_url' => array(
			'label'   => 'Download link: Linux, x86-64',
			'default' => '',
		),
		'linux_arm_url' => array(
			'label'   => 'Download link: Linux, ARM64',
			'default' => '',
		),
		'android_url'   => array(
			'label'       => 'Android app link',
			'description' => 'Nothing is published for phones yet. Add a link here and the Android button appears.',
			'default'     => '',
		),
		'ios_url'       => array(
			'label'       => 'iPhone app link',
			'description' => 'Nothing is published for phones yet. Add a link here and the iPhone button appears.',
			'default'     => '',
		),
		'phone_guide_url' => array(
			'label'       => 'Phone build guide',
			'description' => 'The phone app is on the dev branch today. Point this at main once it is merged.',
			'default'     => 'https://github.com/rabira-hierpa/Nota/blob/dev/mobile/README.md',
		),
		'models_url'    => array(
			'label'   => 'Page that compares the speech models',
			'default' => 'https://github.com/rabira-hierpa/Nota#the-models',
		),
		'email'         => array(
			'label'   => 'Contact email',
			'type'    => 'email',
			'default' => 'rzcodes.biz@gmail.com',
		),
		'facebook_url'  => array(
			'label'   => 'Facebook',
			'default' => 'https://facebook.com/rzc0des',
		),
		'instagram_url' => array(
			'label'   => 'Instagram',
			'default' => 'https://instagram.com/rzc0des',
		),
		'tiktok_url'    => array(
			'label'   => 'TikTok',
			'default' => 'https://tiktok.com/@rzcodes',
		),
	);
}

/**
 * Words in the theme's own interface, which aren't marketing copy and so aren't
 * in the Customizer. Everywhere else on the site WordPress's language applies.
 *
 * @return array<string, array{en: string, am: string}>
 */
function nota_ui_strings() {
	return array(
		'skip'       => array(
			'en' => 'Skip to content',
			'am' => 'ወደ ይዘቱ እለፍ',
		),
		'menu'       => array(
			'en' => 'Menu',
			'am' => 'ምናሌ',
		),
		'main_nav'   => array(
			'en' => 'Main',
			'am' => 'ዋና ምናሌ',
		),
		'theme'      => array(
			'en' => 'Switch between light and dark',
			'am' => 'በብርሃንና በጨለማ ገጽታ መካከል ቀይር',
		),
		'language'   => array(
			'en' => 'Language',
			'am' => 'ቋንቋ',
		),
		'pause'      => array(
			'en' => 'Pause the clip',
			'am' => 'ቪዲዮውን አቁም',
		),
		'play'       => array(
			'en' => 'Play the clip',
			'am' => 'ቪዲዮውን አጫውት',
		),
		'ticker_pause' => array(
			'en' => 'Pause the moving phrases',
			'am' => 'የሚንቀሳቀሱትን ሐረጎች አቁም',
		),
		'footer_nav' => array(
			'en' => 'Footer',
			'am' => 'የግርጌ ምናሌ',
		),
		'yours'      => array(
			'en' => 'Your system',
			'am' => 'የእርስዎ ስርዓት',
		),
		'not_found'  => array(
			'en' => 'This page is not here.',
			'am' => 'ይህ ገጽ እዚህ የለም።',
		),
		'not_found_text' => array(
			'en' => 'The link may be old. Try a search, or go back to the start.',
			'am' => 'አገናኙ የቆየ ሊሆን ይችላል። ይፈልጉ፣ ወይም ወደ መጀመሪያው ይመለሱ።',
		),
		'back_home'  => array(
			'en' => 'Back to the start',
			'am' => 'ወደ መጀመሪያው ተመለስ',
		),
		'search'     => array(
			'en' => 'Search',
			'am' => 'ፈልግ',
		),
		'results_for' => array(
			'en' => 'Results for "%s"',
			'am' => 'የ"%s" ውጤቶች',
		),
		'no_results' => array(
			'en' => 'Nothing found. Try other words.',
			'am' => 'ምንም አልተገኘም። ሌላ ቃል ይሞክሩ።',
		),
		'read_more'  => array(
			'en' => 'Read more',
			'am' => 'ተጨማሪ ያንብቡ',
		),
		'pages'      => array(
			'en' => 'Pages',
			'am' => 'ገጾች',
		),
		'comments'   => array(
			'en' => 'Comments',
			'am' => 'አስተያየቶች',
		),
		'releases_latest' => array(
			'en' => 'Latest',
			'am' => 'የቅርብ ጊዜው',
		),
		'releases_prerelease' => array(
			'en' => 'Pre-release',
			'am' => 'የሙከራ ስሪት',
		),
		'releases_github' => array(
			'en' => 'On GitHub',
			'am' => 'በGitHub ላይ',
		),
		'releases_all' => array(
			'en' => 'All versions on GitHub',
			'am' => 'ሁሉም ስሪቶች በGitHub ላይ',
		),
		'releases_english_only' => array(
			'en' => 'These notes are in English only.',
			'am' => 'የዚህ ስሪት ማስታወሻ በእንግሊዝኛ ብቻ ነው።',
		),
		'releases_error' => array(
			'en' => 'The release notes can\'t be loaded just now.',
			'am' => 'የስሪት ማስታወሻዎቹ አሁን ሊጫኑ አልቻሉም።',
		),
		'releases_download' => array(
			'en' => '{count} download',
			'am' => '{count} ጊዜ ወርዷል',
		),
		'releases_downloads' => array(
			'en' => '{count} downloads',
			'am' => '{count} ጊዜ ወርዷል',
		),
		'beta_form' => array(
			'en' => 'Sign up',
			'am' => 'ምዝገባ',
		),
		'beta_name' => array(
			'en' => 'Your name',
			'am' => 'ስምዎ',
		),
		'beta_email' => array(
			'en' => 'Email',
			'am' => 'ኢሜይል',
		),
		'beta_telegram' => array(
			'en' => 'Telegram username',
			'am' => 'የቴሌግራም የተጠቃሚ ስም (username)',
		),
		'beta_telegram_hint' => array(
			'en' => 'As in @abebe. No username yet? Make one in Telegram under Settings, Username.',
			'am' => 'ለምሳሌ @abebe። ከሌለዎት በቴሌግራም Settings ውስጥ Username ላይ ያዘጋጁ።',
		),
		'beta_devices' => array(
			'en' => 'What will you try it on?',
			'am' => 'በምን ላይ ይሞክሩታል?',
		),
		'beta_devices_hint' => array(
			'en' => 'Pick all that apply.',
			'am' => 'የሚመለከቱዎትን ሁሉ ይምረጡ።',
		),
		'beta_note' => array(
			'en' => 'How would you use Nota? (optional)',
			'am' => 'Notaን ለምን ይጠቀሙበታል? (አማራጭ)',
		),
		'beta_consent' => array(
			'en' => 'You may contact me by email or Telegram about the beta.',
			'am' => 'ስለ ሙከራው በኢሜይል ወይም በቴሌግራም ሊያገኙኝ ይችላሉ።',
		),
		'beta_more' => array(
			'en' => 'See what Nota does',
			'am' => 'Nota ምን እንደሚሠራ ይመልከቱ',
		),
		'beta_again' => array(
			'en' => 'Sign up someone else',
			'am' => 'ሌላ ሰው ያስመዝግቡ',
		),
		'beta_err_summary' => array(
			'en' => 'Please fix these, then send it again:',
			'am' => 'እባክዎ እነዚህን አስተካክለው እንደገና ይላኩ፦',
		),
		'beta_err_name' => array(
			'en' => 'Write your name.',
			'am' => 'ስምዎን ይጻፉ።',
		),
		'beta_err_email' => array(
			'en' => 'Write an email address, as in name@example.com.',
			'am' => 'የኢሜይል አድራሻ ይጻፉ፤ ለምሳሌ name@example.com።',
		),
		'beta_err_telegram' => array(
			'en' => 'Write your Telegram username: letters, numbers and _ only, starting with a letter.',
			'am' => 'የቴሌግራም የተጠቃሚ ስምዎን ይጻፉ፦ የእንግሊዝኛ ፊደላት፣ ቁጥሮችና _ ብቻ፣ በፊደል የሚጀምር።',
		),
		'beta_err_devices' => array(
			'en' => 'Pick at least one device.',
			'am' => 'ቢያንስ አንድ መሣሪያ ይምረጡ።',
		),
		'beta_err_consent' => array(
			'en' => 'Tick the box, so we may send you the beta.',
			'am' => 'የሙከራ ስሪቱን እንድንልክልዎ ሳጥኑን ይምረጡ።',
		),
		'beta_err_busy' => array(
			'en' => 'Too many sign-ups from here just now. Please try again in an hour.',
			'am' => 'ከዚህ ብዙ ምዝገባዎች ደርሰዋል። እባክዎ ከአንድ ሰዓት በኋላ እንደገና ይሞክሩ።',
		),
		'beta_err_full' => array(
			'en' => 'We\'ve had a lot of sign-ups today. Please try again tomorrow.',
			'am' => 'ዛሬ ብዙ ምዝገባዎች ደርሰውናል። እባክዎ ነገ እንደገና ይሞክሩ።',
		),
		'beta_err_failed' => array(
			'en' => 'Your sign-up couldn\'t be saved just now. Please try again.',
			'am' => 'ምዝገባዎ አሁን ሊቀመጥ አልቻለም። እባክዎ እንደገና ይሞክሩ።',
		),
	);
}
