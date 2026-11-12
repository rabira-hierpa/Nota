<?php
/**
 * Search and sharing: title, description, canonical, hreflang, Open Graph, JSON-LD.
 *
 * On the landing page only. If an SEO plugin is active it keeps the title and the
 * meta tags, and this file adds just what the plugin can't know: the language
 * links and the description of the app.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

/**
 * True when a plugin already writes the page's SEO tags.
 *
 * @return bool
 */
function nota_seo_plugin_active() {
	return defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' ) || defined( 'SEOPRESS_VERSION' ) || defined( 'THE_SEO_FRAMEWORK_VERSION' );
}

/**
 * The landing page's title.
 *
 * @param string $title The title so far.
 * @return string
 */
function nota_document_title( $title ) {
	if ( nota_is_landing() && ! nota_seo_plugin_active() ) {
		$custom = nota_plain( 'seo_title' );
		return '' !== $custom ? $custom : $title;
	}
	return $title;
}
add_filter( 'pre_get_document_title', 'nota_document_title', 99 );

/**
 * The copy that names and describes this page, if it is one of the theme's own
 * pages besides the landing page: the release notes or the beta sign-up.
 *
 * @return array{title: string, intro: string}|null Field keys.
 */
function nota_seo_page_copy() {
	if ( nota_is_releases() ) {
		return array(
			'title' => 'releases_title',
			'intro' => 'releases_intro',
		);
	}
	if ( nota_is_beta() ) {
		return array(
			'title' => 'beta_title',
			'intro' => 'beta_intro',
		);
	}
	return null;
}

/**
 * The release notes or beta page's title, in its language.
 *
 * @param array<string, string> $parts The title's parts.
 * @return array<string, string>
 */
function nota_releases_title_parts( $parts ) {
	$copy = nota_seo_page_copy();
	if ( $copy && ! nota_seo_plugin_active() && '' !== nota_plain( $copy['title'] ) ) {
		$parts['title'] = nota_plain( $copy['title'] );
	}
	return $parts;
}
add_filter( 'document_title_parts', 'nota_releases_title_parts' );

/**
 * WordPress's canonical and short links know nothing of ?lang, so they go.
 *
 * @return void
 */
function nota_seo_cleanup() {
	if ( nota_is_landing() || ( nota_seo_page_copy() && ! nota_seo_plugin_active() ) ) {
		remove_action( 'wp_head', 'rel_canonical' );
		remove_action( 'wp_head', 'wp_shortlink_wp_head' );
	}
}
add_action( 'template_redirect', 'nota_seo_cleanup' );

/**
 * The sharing picture for this language.
 *
 * @return string
 */
function nota_og_image_url() {
	$custom = (string) get_theme_mod( 'nota_og_image', '' );
	return '' !== $custom ? $custom : get_theme_file_uri( 'assets/img/og-' . nota_lang() . '.png' );
}

/**
 * Prints the meta tags.
 *
 * @return void
 */
function nota_seo_head() {
	$copy = nota_seo_page_copy();
	if ( $copy ) {
		nota_seo_page_head( $copy );
		return;
	}
	if ( ! nota_is_landing() ) {
		return;
	}

	if ( ! nota_seo_plugin_active() ) {
		nota_seo_tags( nota_plain( 'seo_title' ), nota_plain( 'seo_description' ), nota_lang_url( nota_lang() ) );
	}

	foreach ( array( 'en', 'am' ) as $lang ) {
		printf( '<link rel="alternate" hreflang="%s" href="%s">' . "\n", esc_attr( $lang ), esc_url( nota_lang_url( $lang ) ) );
	}
	printf( '<link rel="alternate" hreflang="x-default" href="%s">' . "\n", esc_url( nota_lang_url( nota_base_lang() ) ) );

	nota_seo_json_ld();
}
add_action( 'wp_head', 'nota_seo_head', 2 );

/**
 * The release notes or beta page's tags: its own canonical in each language, and
 * the links between the two.
 *
 * @param array{title: string, intro: string} $copy Field keys, from nota_seo_page_copy().
 * @return void
 */
function nota_seo_page_head( $copy ) {
	if ( ! nota_seo_plugin_active() ) {
		$title = nota_plain( $copy['title'] );
		nota_seo_tags( '' !== $title ? $title . ' · Nota' : 'Nota', nota_plain( $copy['intro'] ), nota_page_lang_url( nota_lang() ) );
	}
	foreach ( array( 'en', 'am' ) as $lang ) {
		printf( '<link rel="alternate" hreflang="%s" href="%s">' . "\n", esc_attr( $lang ), esc_url( nota_page_lang_url( $lang ) ) );
	}
	printf( '<link rel="alternate" hreflang="x-default" href="%s">' . "\n", esc_url( nota_page_lang_url( nota_base_lang() ) ) );
}

/**
 * Description, canonical, Open Graph and Twitter tags.
 *
 * @param string $title       Title for sharing.
 * @param string $description Description, or nothing.
 * @param string $url         This page's address in its language.
 * @return void
 */
function nota_seo_tags( $title, $description, $url ) {
	$image = nota_og_image_url();
	$is_am = 'am' === nota_lang();

	if ( '' !== $description ) {
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( $description ) );
	}
	printf( '<link rel="canonical" href="%s">' . "\n", esc_url( $url ) );

	$properties = array(
		'og:type'             => 'website',
		'og:site_name'        => 'Nota',
		'og:title'            => $title,
		'og:description'      => $description,
		'og:url'              => $url,
		'og:image'            => $image,
		'og:image:width'      => '1200',
		'og:image:height'     => '630',
		'og:locale'           => $is_am ? 'am_ET' : 'en_US',
		'og:locale:alternate' => $is_am ? 'en_US' : 'am_ET',
	);
	foreach ( $properties as $property => $content ) {
		if ( '' !== $content ) {
			printf( '<meta property="%s" content="%s">' . "\n", esc_attr( $property ), esc_attr( $content ) );
		}
	}

	$cards = array(
		'twitter:card'        => 'summary_large_image',
		'twitter:title'       => $title,
		'twitter:description' => $description,
		'twitter:image'       => $image,
	);
	foreach ( $cards as $name => $content ) {
		if ( '' !== $content ) {
			printf( '<meta name="%s" content="%s">' . "\n", esc_attr( $name ), esc_attr( $content ) );
		}
	}
}

/**
 * Prints the structured data. It says only what the page says: the price is the
 * real one, and there is no rating, since nobody has rated it.
 *
 * @return void
 */
function nota_seo_json_ld() {
	$home        = nota_lang_url( nota_base_lang() );
	$description = nota_plain( 'seo_description' );
	$github      = untrailingslashit( nota_opt( 'github_url' ) );

	$application = array(
		'@type'               => 'SoftwareApplication',
		'@id'                 => $home . '#app',
		'name'                => 'Nota',
		'url'                 => $home,
		'applicationCategory' => 'ProductivityApplication',
		'operatingSystem'     => 'macOS, Windows, Linux',
		'softwareVersion'     => nota_opt( 'version' ),
		'downloadUrl'         => $github . '/releases/latest',
		'inLanguage'          => array( 'am', 'en' ),
		'isAccessibleForFree' => true,
		'license'             => 'https://opensource.org/license/mit',
		'image'               => get_theme_file_uri( 'assets/img/icon-512.png' ),
		'screenshot'          => array(
			get_theme_file_uri( 'assets/img/main-' . nota_lang() . '-light-2000.webp' ),
			get_theme_file_uri( 'assets/img/voice-' . nota_lang() . '-light-1800.webp' ),
		),
		'offers'              => array(
			'@type'         => 'Offer',
			'price'         => '0',
			'priceCurrency' => 'USD',
		),
		'publisher'           => array( '@id' => $home . '#organization' ),
		'sameAs'              => array( $github ),
	);
	if ( '' !== $description ) {
		$application['description'] = $description;
	}

	$graph = array( $application );

	if ( ! nota_seo_plugin_active() ) {
		$same_as = array_values( array_filter( array( $github, nota_opt( 'facebook_url' ), nota_opt( 'instagram_url' ), nota_opt( 'tiktok_url' ) ) ) );

		$organization = array(
			'@type'  => 'Organization',
			'@id'    => $home . '#organization',
			'name'   => 'Rz Codes',
			'url'    => $home,
			'logo'   => get_theme_file_uri( 'assets/img/icon-512.png' ),
			'sameAs' => $same_as,
		);
		if ( '' !== nota_opt( 'email' ) ) {
			$organization['email'] = nota_opt( 'email' );
		}

		$graph[] = $organization;
		$graph[] = array(
			'@type'      => 'WebSite',
			'@id'        => $home . '#website',
			'url'        => $home,
			'name'       => 'Nota',
			'inLanguage' => nota_lang(),
			'publisher'  => array( '@id' => $home . '#organization' ),
		);

		$questions = array();
		foreach ( nota_faqs() as $faq ) {
			$questions[] = array(
				'@type'          => 'Question',
				'name'           => wp_strip_all_tags( $faq['q'] ),
				'acceptedAnswer' => array(
					'@type' => 'Answer',
					'text'  => wp_strip_all_tags( $faq['a'] ),
				),
			);
		}
		if ( $questions ) {
			$graph[] = array(
				'@type'      => 'FAQPage',
				'@id'        => nota_lang_url( nota_lang() ) . '#faq',
				'inLanguage' => nota_lang(),
				'mainEntity' => $questions,
			);
		}
	}

	printf(
		'<script type="application/ld+json">%s</script>' . "\n",
		wp_json_encode(
			array(
				'@context' => 'https://schema.org',
				'@graph'   => $graph,
			),
			JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG
		)
	);
}

/**
 * A description for pages and posts, if no plugin writes one.
 *
 * @return void
 */
function nota_seo_singular_description() {
	if ( nota_is_bilingual() || nota_seo_plugin_active() || ! is_singular() || post_password_required() ) {
		return;
	}
	$excerpt = trim( wp_strip_all_tags( get_the_excerpt() ) );
	if ( '' !== $excerpt ) {
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( wp_trim_words( $excerpt, 28, '' ) ) );
	}
}
add_action( 'wp_head', 'nota_seo_singular_description', 2 );
