<?php
/**
 * Language, copy, links, icons and pictures for the templates.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

/**
 * True unless the Customizer says to show the page from Settings, Reading instead
 * of the landing page (for instance one built with Elementor).
 *
 * @return bool
 */
function nota_landing_enabled() {
	return 'page' !== get_theme_mod( 'nota_front_mode', 'landing' );
}

/**
 * True when this request shows the Nota landing page.
 *
 * @return bool
 */
function nota_is_landing() {
	return nota_landing_enabled() && is_front_page() && ! is_paged();
}

/**
 * The language WordPress itself is set to: 'am' or 'en'.
 *
 * @return string
 */
function nota_base_lang() {
	return 0 === strpos( get_locale(), 'am' ) ? 'am' : 'en';
}

/**
 * The language of this request. ?lang=am or ?lang=en picks it, so each language
 * has its own URL that a page cache can keep and a search engine can index.
 *
 * @return string 'am' or 'en'.
 */
function nota_lang() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only choice between two fixed values.
	$asked = isset( $_GET['lang'] ) ? sanitize_key( wp_unslash( $_GET['lang'] ) ) : '';
	return in_array( $asked, array( 'am', 'en' ), true ) ? $asked : nota_base_lang();
}

/**
 * The landing page's URL in a language.
 *
 * @param string $lang 'am' or 'en'.
 * @return string
 */
function nota_lang_url( $lang ) {
	$home = home_url( '/' );
	return nota_base_lang() === $lang ? $home : add_query_arg( 'lang', $lang, $home );
}

/**
 * A piece of copy in the current language, as stored. Empty means hidden.
 *
 * @param string $key Field key from nota_content_sections().
 * @return string
 */
function nota_t( $key ) {
	$fields = nota_content_fields();
	$lang   = nota_lang();
	return (string) get_theme_mod( "nota_{$key}_{$lang}", isset( $fields[ $key ][ $lang ] ) ? $fields[ $key ][ $lang ] : '' );
}

/**
 * Tags allowed in copy that editors can change.
 *
 * @return array<string, array<string, bool>>
 */
function nota_allowed_html() {
	return array(
		'a'      => array(
			'href'   => true,
			'rel'    => true,
			'target' => true,
			'title'  => true,
		),
		'br'     => array(),
		'code'   => array(),
		'em'     => array(),
		'strong' => array(),
	);
}

/**
 * Prints copy with inline markup allowed.
 *
 * @param string $key Field key.
 * @return void
 */
function nota_html( $key ) {
	echo wp_kses( nota_t( $key ), nota_allowed_html() );
}

/**
 * Prints plain copy.
 *
 * @param string $key Field key.
 * @return void
 */
function nota_text( $key ) {
	echo esc_html( nota_t( $key ) );
}

/**
 * Attribute-safe plain copy, for alt text and the like: tags and entities removed.
 *
 * @param string $key Field key.
 * @return string
 */
function nota_plain( $key ) {
	return trim( wp_strip_all_tags( html_entity_decode( nota_t( $key ), ENT_QUOTES, 'UTF-8' ) ) );
}

/**
 * Prints a piece of copy in a tag, or nothing at all when the field is empty.
 *
 * @param string $key   Field key.
 * @param string $tag   Tag name, from the template.
 * @param string $class Class attribute, from the template.
 * @param string $id    Optional id, from the template.
 * @return void
 */
function nota_field( $key, $tag = 'p', $class = '', $id = '' ) {
	$value = nota_t( $key );
	if ( '' === trim( $value ) ) {
		return;
	}
	printf(
		'<%1$s%2$s%3$s>%4$s</%1$s>',
		tag_escape( $tag ),
		'' !== $class ? ' class="' . esc_attr( $class ) . '"' : '',
		'' !== $id ? ' id="' . esc_attr( $id ) . '"' : '',
		wp_kses( $value, nota_allowed_html() )
	);
}

/**
 * A word from the theme's own interface.
 *
 * @param string $key Key from nota_ui_strings().
 * @return string
 */
function nota_ui( $key ) {
	$strings = nota_ui_strings();
	return $strings[ $key ][ nota_lang() ];
}

/**
 * A link or setting that doesn't depend on the language.
 *
 * @param string $key Key from nota_link_fields().
 * @return string
 */
function nota_opt( $key ) {
	$fields = nota_link_fields();
	return (string) get_theme_mod( "nota_{$key}", $fields[ $key ]['default'] );
}

/**
 * An icon from assets/icons (Phosphor, MIT licensed), inline so it takes the
 * text colour and costs no extra request.
 *
 * @param string $name Icon file name without its extension.
 * @return string Markup, safe to print.
 */
function nota_icon( $name ) {
	static $icons = array();
	if ( ! isset( $icons[ $name ] ) ) {
		$file           = get_theme_file_path( 'assets/icons/' . sanitize_file_name( $name ) . '.svg' );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local file shipped with the theme.
		$svg            = is_readable( $file ) ? file_get_contents( $file ) : '';
		$icons[ $name ] = str_replace( '<svg ', '<svg class="icon" aria-hidden="true" focusable="false" ', (string) $svg );
	}
	return $icons[ $name ];
}

/**
 * Bundled screenshots: their full size, and the widths of the files in assets/img.
 *
 * @return array<string, array{w: int, h: int, widths: int[]}>
 */
function nota_shot_sizes() {
	return array(
		'main'       => array(
			'w'      => 2720,
			'h'      => 1720,
			'widths' => array( 1200, 2000 ),
		),
		'voice'      => array(
			'w'      => 2720,
			'h'      => 1720,
			'widths' => array( 1000, 1800 ),
		),
		'zen'        => array(
			'w'      => 2720,
			'h'      => 1720,
			'widths' => array( 1000, 1600 ),
		),
		'tags'       => array(
			'w'      => 448,
			'h'      => 1120,
			'widths' => array( 448 ),
		),
		'calendar'   => array(
			'w'      => 636,
			'h'      => 489,
			'widths' => array( 636 ),
		),
		'clip'       => array(
			'w'      => 1560,
			'h'      => 1040,
			'widths' => array( 1560 ),
		),
		'phone-home' => array(
			'w'      => 1080,
			'h'      => 2400,
			'widths' => array( 720 ),
		),
		'phone-note' => array(
			'w'      => 1080,
			'h'      => 2400,
			'widths' => array( 720 ),
		),
	);
}

/**
 * Sources for one bundled shot in the current language.
 *
 * @param string $name  Shot name.
 * @param string $theme 'light' or 'dark'.
 * @return array{src: string, srcset: string}
 */
function nota_shot_sources( $name, $theme ) {
	$sizes = nota_shot_sizes();
	$lang  = nota_lang();
	$set   = array();
	$src   = '';
	foreach ( $sizes[ $name ]['widths'] as $width ) {
		$src   = get_theme_file_uri( "assets/img/{$name}-{$lang}-{$theme}-{$width}.webp" );
		$set[] = esc_url( $src ) . ' ' . $width . 'w';
	}
	return array(
		'src'    => $src,
		'srcset' => implode( ', ', $set ),
	);
}

/**
 * The class that crops a screenshot to the part it is about where the whole of it
 * would be too small to read. A picture uploaded in the Customizer stays whole, since
 * nobody can say where its note is.
 *
 * @param string $name Shot name from nota_shot_sizes().
 * @return string The class with a space before it, or nothing.
 */
function nota_shot_crop( $name ) {
	$slug = str_replace( '-', '_', $name );
	if ( '' !== (string) get_theme_mod( "nota_img_{$slug}_light", '' ) || '' !== (string) get_theme_mod( "nota_img_{$slug}_dark", '' ) ) {
		return '';
	}
	return ' shot-crop--' . $name;
}

/**
 * Prints a screenshot as a <picture> that follows the theme: the light image by
 * default and the dark one under prefers-color-scheme. site.js retargets the
 * source's media query when a visitor picks a theme by hand. A replacement
 * uploaded in the Customizer takes over for both languages.
 *
 * @param string               $name Shot name from nota_shot_sizes().
 * @param string               $alt  Description of the image.
 * @param array<string, mixed> $args Options: sizes (string), eager (bool).
 * @return void
 */
function nota_shot( $name, $alt, $args = array() ) {
	$args   = wp_parse_args(
		$args,
		array(
			'sizes' => '100vw',
			'eager' => false,
		)
	);
	$sizes  = nota_shot_sizes();
	$slug   = str_replace( '-', '_', $name );
	$custom = array(
		'light' => (string) get_theme_mod( "nota_img_{$slug}_light", '' ),
		'dark'  => (string) get_theme_mod( "nota_img_{$slug}_dark", '' ),
	);
	$light  = nota_shot_sources( $name, 'light' );
	$dark   = nota_shot_sources( $name, 'dark' );

	if ( '' !== $custom['light'] ) {
		$light = array(
			'src'    => $custom['light'],
			'srcset' => '',
		);
		// A light replacement without a dark one stays in both themes, so the old picture can't come back.
		$dark = array(
			'src'    => '' !== $custom['dark'] ? $custom['dark'] : $custom['light'],
			'srcset' => '',
		);
	} elseif ( '' !== $custom['dark'] ) {
		$dark = array(
			'src'    => $custom['dark'],
			'srcset' => '',
		);
	}

	$dark_srcset  = '' !== $dark['srcset'] ? $dark['srcset'] : esc_url( $dark['src'] );
	$loading_attr = $args['eager'] ? 'fetchpriority="high" data-no-lazy="1"' : 'loading="lazy"';

	printf(
		'<picture class="shot-img"><source media="(prefers-color-scheme: dark)" srcset="%1$s" sizes="%2$s"><img src="%3$s"%4$s sizes="%2$s" alt="%5$s" width="%6$d" height="%7$d" decoding="async" %8$s></picture>',
		$dark_srcset, // Built from esc_url() above.
		esc_attr( $args['sizes'] ),
		esc_url( $light['src'] ),
		'' !== $light['srcset'] ? ' srcset="' . $light['srcset'] . '"' : '', // Built from esc_url() above.
		esc_attr( $alt ),
		(int) $sizes[ $name ]['w'],
		(int) $sizes[ $name ]['h'],
		$loading_attr // A fixed string above.
	);
}

/**
 * The download groups, each with its files, working links and the build each is.
 *
 * @return array<int, array<string, mixed>>
 */
function nota_downloads() {
	$groups = array(
		array(
			'os'    => 'mac',
			'name'  => 'macOS',
			'icon'  => 'apple-logo',
			'note'  => 'dl_mac_note',
			'files' => array(
				array( 'mac_silicon_url', 'dl_mac_silicon', 'Nota-%s-mac-arm64.dmg', 'mac-arm64' ),
				array( 'mac_intel_url', 'dl_mac_intel', 'Nota-%s-mac-x64.dmg', 'mac-x64' ),
			),
		),
		array(
			'os'    => 'win',
			'name'  => 'Windows',
			'icon'  => 'windows-logo',
			'note'  => 'dl_win_note',
			'files' => array(
				array( 'win_x64_url', 'dl_win_x64', 'Nota-%s-win-x64-setup.exe', 'win-x64' ),
				array( 'win_arm_url', 'dl_win_arm', 'Nota-%s-win-arm64-setup.exe', 'win-arm64' ),
			),
		),
		array(
			'os'    => 'linux',
			'name'  => 'Linux',
			'icon'  => 'linux-logo',
			'note'  => 'dl_linux_note',
			'files' => array(
				array( 'linux_x64_url', 'dl_linux_x64', 'Nota-%s-linux-x86_64.AppImage', 'linux-x64' ),
				array( 'linux_arm_url', 'dl_linux_arm', 'Nota-%s-linux-arm64.AppImage', 'linux-arm64' ),
			),
		),
	);

	$version = nota_opt( 'version' );
	$base    = untrailingslashit( nota_opt( 'github_url' ) ) . '/releases/download/v' . rawurlencode( $version ) . '/';

	foreach ( $groups as &$group ) {
		foreach ( $group['files'] as &$file ) {
			list( $url_key, $copy_key, $pattern, $platform ) = $file;

			$override = nota_opt( $url_key );
			$file     = array(
				'url'      => '' !== $override ? $override : $base . sprintf( $pattern, rawurlencode( $version ) ),
				'label'    => $copy_key,
				'meta'     => $copy_key . '_meta',
				'platform' => $platform,
			);
		}
		unset( $file );
	}
	unset( $group );

	return $groups;
}

/**
 * The questions and answers that have both parts filled in.
 *
 * @return array<int, array{q: string, a: string}>
 */
function nota_faqs() {
	$faqs = array();
	for ( $i = 1; $i <= 8; $i++ ) {
		$question = nota_t( "faq_{$i}_q" );
		$answer   = nota_t( "faq_{$i}_a" );
		if ( '' !== trim( $question ) && '' !== trim( $answer ) ) {
			$faqs[] = array(
				'q' => $question,
				'a' => $answer,
			);
		}
	}
	return $faqs;
}

/**
 * The link to a section of the landing page, from anywhere on the site.
 *
 * @param string $id Section id.
 * @return string
 */
function nota_section_url( $id ) {
	return ( nota_is_landing() ? '' : nota_lang_url( nota_lang() ) ) . '#' . $id;
}

/**
 * The menu links to the landing page's sections, as section id => field key.
 *
 * @return array<string, string>
 */
function nota_nav_items() {
	return array(
		'speech'  => 'nav_speech',
		'notes'   => 'nav_notes',
		'privacy' => 'nav_privacy',
		'devices' => 'nav_devices',
		'faq'     => 'nav_faq',
	);
}

/**
 * Today in the Ethiopian calendar, in the same words the app uses. The month names
 * and the sums are the app's (src/features/notes/lib/ethiopian-calendar.ts);
 * site.js repeats them so a page cache can't leave yesterday's date on screen.
 *
 * @return string
 */
function nota_ethiopian_today() {
	return nota_ethiopian_date( time() );
}

/**
 * A day in the Ethiopian calendar, in the site's time zone.
 *
 * @param int $timestamp Unix time.
 * @return string
 */
function nota_ethiopian_date( $timestamp ) {
	$epoch  = 1724221;
	$months = array( 'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ' );
	$jdn    = (int) round( gmmktime( 0, 0, 0, (int) wp_date( 'n', $timestamp ), (int) wp_date( 'j', $timestamp ), (int) wp_date( 'Y', $timestamp ) ) / DAY_IN_SECONDS ) + 2440588;
	$start  = static function ( $y, $m, $d ) use ( $epoch ) {
		return $epoch - 1 + 365 * ( $y - 1 ) + (int) floor( $y / 4 ) + 30 * ( $m - 1 ) + $d;
	};
	$year   = (int) floor( ( 4 * ( $jdn - $epoch ) + 1463 ) / 1461 );
	$month  = (int) floor( ( $jdn - $start( $year, 1, 1 ) ) / 30 ) + 1;
	$day    = $jdn + 1 - $start( $year, $month, 1 );
	$comma  = 'am' === nota_lang() ? '፣ ' : ', ';
	return $months[ $month - 1 ] . ' ' . $day . $comma . $year;
}

/**
 * The logo: the one set in the Customizer, or Nota's icon.
 *
 * @return void
 */
function nota_logo() {
	$logo_id = (int) get_theme_mod( 'custom_logo' );
	if ( $logo_id ) {
		echo wp_get_attachment_image(
			$logo_id,
			'thumbnail',
			false,
			array(
				'class'         => 'brand__icon',
				'alt'           => '',
				'data-no-lazy'  => '1',
			)
		);
		return;
	}
	printf(
		'<img class="brand__icon" src="%s" width="32" height="32" alt="" data-no-lazy="1">',
		esc_url( get_theme_file_uri( 'assets/img/icon-64.png' ) )
	);
}
