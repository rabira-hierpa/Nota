<?php
/**
 * Nota theme: setup, assets and head tags.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

define( 'NOTA_THEME_VERSION', '1.2.0' );

require_once get_theme_file_path( 'inc/content.php' );
require_once get_theme_file_path( 'inc/helpers.php' );
require_once get_theme_file_path( 'inc/customizer.php' );
require_once get_theme_file_path( 'inc/seo.php' );
require_once get_theme_file_path( 'inc/elementor.php' );
require_once get_theme_file_path( 'inc/github.php' );
require_once get_theme_file_path( 'inc/releases.php' );
require_once get_theme_file_path( 'inc/analytics.php' );
if ( is_admin() ) {
	require_once get_theme_file_path( 'inc/dashboard.php' );
}

/**
 * What the theme supports.
 *
 * @return void
 */
function nota_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'editor-styles' );
	add_theme_support( 'html5', array( 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script', 'navigation-widgets', 'search-form' ) );
	add_theme_support(
		'custom-logo',
		array(
			'height'      => 64,
			'width'       => 64,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);
	add_editor_style( 'assets/css/editor.css' );

	// Named so WordPress won't move the old site's "Home" menu in by itself.
	register_nav_menus(
		array(
			'nota-extra'  => 'Extra links in the top menu (optional)',
			'nota-footer' => 'Extra links in the footer (optional)',
		)
	);

	$GLOBALS['content_width'] = 720;
}
add_action( 'after_setup_theme', 'nota_setup' );

/**
 * The version of a file in the theme: its modification time, so that uploading a
 * new copy of the theme gets past every cache.
 *
 * @param string $path Path inside the theme.
 * @return string
 */
function nota_asset_version( $path ) {
	$time = filemtime( get_theme_file_path( $path ) );
	return $time ? (string) $time : NOTA_THEME_VERSION;
}

/**
 * Styles and script.
 *
 * @return void
 */
function nota_assets() {
	wp_enqueue_style( 'nota-site', get_theme_file_uri( 'assets/css/site.css' ), array(), nota_asset_version( 'assets/css/site.css' ) );
	wp_enqueue_script(
		'nota-site',
		get_theme_file_uri( 'assets/js/site.js' ),
		array(),
		nota_asset_version( 'assets/js/site.js' ),
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'nota_assets' );

/**
 * Sets the visitor's chosen theme before the first paint, and marks that scripts
 * run. The data attributes keep LiteSpeed Cache from deferring it, which would
 * bring back the flash this exists to prevent.
 *
 * @return void
 */
function nota_head_boot() {
	echo '<script data-no-optimize="1" data-no-defer="1" data-cfasync="false">(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem("nota-site-theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}})();</script>' . "\n";
	echo '<meta name="theme-color" content="#fbfcf9" media="(prefers-color-scheme: light)">' . "\n";
	echo '<meta name="theme-color" content="#151b17" media="(prefers-color-scheme: dark)">' . "\n";

	$fonts = 'am' === nota_lang() ? array( 'noto-sans-ethiopic', 'plus-jakarta-sans-latin' ) : array( 'plus-jakarta-sans-latin' );
	foreach ( $fonts as $font ) {
		printf(
			'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
			esc_url( get_theme_file_uri( "assets/fonts/{$font}.woff2" ) )
		);
	}

	if ( ! has_site_icon() ) {
		printf( '<link rel="icon" href="%s" sizes="32x32">' . "\n", esc_url( get_theme_file_uri( 'assets/img/icon-64.png' ) ) );
		printf( '<link rel="apple-touch-icon" href="%s">' . "\n", esc_url( get_theme_file_uri( 'assets/img/icon-180.png' ) ) );
	}
}
add_action( 'wp_head', 'nota_head_boot', 0 );

/**
 * The page's language, which the fonts and screen readers both go by.
 *
 * @param string $output The html element's attributes.
 * @return string
 */
function nota_language_attributes( $output ) {
	if ( nota_is_bilingual() ) {
		return 'lang="' . esc_attr( nota_lang() ) . '" dir="ltr"';
	}
	return $output;
}
add_filter( 'language_attributes', 'nota_language_attributes' );

/**
 * Adds the language to the body, for the type rules that differ in Ge'ez.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function nota_body_classes( $classes ) {
	$classes[] = 'lang-' . nota_lang();
	return $classes;
}
add_filter( 'body_class', 'nota_body_classes' );

/**
 * With the landing page turned off, WordPress goes back to what Settings, Reading
 * asks for, and so does page 2 of a blog on the home page.
 *
 * @param string[] $templates Template candidates.
 * @return string[]
 */
function nota_front_page_templates( $templates ) {
	return nota_is_landing() ? $templates : array();
}
add_filter( 'frontpage_template_hierarchy', 'nota_front_page_templates' );

/**
 * Drops the emoji script from the landing page.
 *
 * @return void
 */
function nota_landing_cleanup() {
	if ( nota_is_landing() ) {
		remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
		remove_action( 'wp_print_styles', 'print_emoji_styles' );
		remove_action( 'wp_enqueue_scripts', 'wp_enqueue_emoji_styles' );
	}
}
add_action( 'template_redirect', 'nota_landing_cleanup' );

/**
 * Remembers to greet the person who just activated the theme.
 *
 * @return void
 */
function nota_after_switch_theme() {
	set_transient( 'nota_just_activated', 1, DAY_IN_SECONDS );
}
add_action( 'after_switch_theme', 'nota_after_switch_theme' );

/**
 * Says where the home page went and where to edit it, once.
 *
 * @return void
 */
function nota_activation_notice() {
	if ( ! current_user_can( 'edit_theme_options' ) || ! get_transient( 'nota_just_activated' ) ) {
		return;
	}
	delete_transient( 'nota_just_activated' );

	printf(
		'<div class="notice notice-success is-dismissible"><p><strong>The Nota landing page is now your home page.</strong> <a href="%1$s">View it</a>, or change its words and links under <a href="%2$s">Appearance, Customize, Nota landing page</a>. If you still see the old page, purge the cache: LiteSpeed Cache, Toolbox, Purge All, and the CDN in Hostinger\'s hPanel.</p></div>',
		esc_url( home_url( '/' ) ),
		esc_url( admin_url( 'customize.php?autofocus[panel]=nota_landing' ) )
	);
}
add_action( 'admin_notices', 'nota_activation_notice' );
