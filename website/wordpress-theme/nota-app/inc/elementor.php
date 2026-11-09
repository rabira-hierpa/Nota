<?php
/**
 * Living with Elementor: its pages keep working on this theme, and none of its
 * styles reach the landing page.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

/**
 * Lets Elementor Pro's Theme Builder replace the header and the footer on other
 * pages, which it can do only if the theme declares them.
 *
 * @param object $manager Elementor's theme location manager.
 * @return void
 */
function nota_elementor_locations( $manager ) {
	$manager->register_location( 'header' );
	$manager->register_location( 'footer' );
}
add_action( 'elementor/theme/register_locations', 'nota_elementor_locations' );

/**
 * True when a page's body comes from Elementor, so the theme's own page title
 * and text width step aside.
 *
 * @param int|null $post_id Post id, the current post by default.
 * @return bool
 */
function nota_is_builder_page( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	return defined( 'ELEMENTOR_VERSION' ) && 'builder' === get_post_meta( $post_id, '_elementor_edit_mode', true );
}

/**
 * Elementor picks its own template for a page it built, even a front page, which
 * would hide the landing page behind an old design. So the landing page has the
 * last word. Nothing is deleted: the old page keeps its content, and the Home page
 * setting in the Customizer brings it back.
 *
 * @param string $template The template WordPress and its plugins chose.
 * @return string
 */
function nota_landing_template( $template ) {
	if ( nota_is_landing() ) {
		return get_theme_file_path( 'front-page.php' );
	}
	return $template;
}
add_filter( 'template_include', 'nota_landing_template', 99 );

/**
 * True for a file the landing page must not load: one of a page builder's, one of
 * the block styles it has no use for, or anything that needs one of those.
 *
 * Elementor's handles can't be listed: `widget-heading` and `base-desktop` carry no
 * prefix, and the first pulls in its main stylesheet. So its files are also known by
 * where they live. Other files stay, so an analytics plugin or the admin bar is safe.
 *
 * @param WP_Dependencies $assets Styles or scripts.
 * @param string          $handle The file's handle.
 * @param int             $depth  How far along its dependencies this is.
 * @return bool
 */
function nota_is_stripped_asset( $assets, $handle, $depth = 0 ) {
	if ( $depth > 8 || ! isset( $assets->registered[ $handle ] ) ) {
		return false;
	}

	$prefixes = array( 'elementor', 'e-', 'swiper', 'font-awesome', 'fontawesome', 'eicons', 'google-fonts-', 'hello-elementor', 'wp-block-', 'global-styles', 'classic-theme-styles', 'core-block-supports' );
	foreach ( $prefixes as $prefix ) {
		if ( 0 === strpos( $handle, $prefix ) ) {
			return true;
		}
	}

	$item = $assets->registered[ $handle ];
	if ( preg_match( '#/(plugins|uploads)/elementor(-pro)?/#', (string) $item->src ) ) {
		return true;
	}

	foreach ( (array) $item->deps as $dependency ) {
		if ( nota_is_stripped_asset( $assets, $dependency, $depth + 1 ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Removes other people's page-builder and block styles from the landing page. A
 * kit that styles every h1 would otherwise restyle it, and a visitor would pay for
 * Elementor's files on a page that uses none of them.
 *
 * @return void
 */
function nota_strip_landing_assets() {
	if ( ! nota_is_landing() ) {
		return;
	}

	foreach ( array( wp_styles(), wp_scripts() ) as $assets ) {
		foreach ( (array) $assets->queue as $handle ) {
			if ( nota_is_stripped_asset( $assets, $handle ) ) {
				$assets->dequeue( $handle );
			}
		}
	}
}
add_action( 'wp_enqueue_scripts', 'nota_strip_landing_assets', 9999 );
add_action( 'wp_print_styles', 'nota_strip_landing_assets', 9999 );
add_action( 'wp_print_scripts', 'nota_strip_landing_assets', 9999 );
add_action( 'wp_footer', 'nota_strip_landing_assets', 9 );
add_action( 'wp_print_footer_scripts', 'nota_strip_landing_assets', 1 );

/**
 * Stops Elementor asking for Google Fonts on the landing page. The theme's own
 * fonts ship in its folder, so the page makes no third-party font request.
 *
 * @param bool $print Whether to print the link.
 * @return bool
 */
function nota_elementor_google_fonts( $print ) {
	return nota_is_landing() ? false : $print;
}
add_filter( 'elementor/frontend/print_google_fonts', 'nota_elementor_google_fonts' );

/**
 * Takes the builder's classes off the landing page's body, since its rules hang
 * from them.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function nota_landing_body_classes( $classes ) {
	if ( ! nota_is_landing() ) {
		return $classes;
	}
	$kept = array();
	foreach ( $classes as $class ) {
		if ( 0 !== strpos( $class, 'elementor' ) && 0 !== strpos( $class, 'e--' ) && 0 !== strpos( $class, 'page-template' ) && 0 !== strpos( $class, 'hostinger' ) ) {
			$kept[] = $class;
		}
	}
	$kept[] = 'nota-landing';
	return $kept;
}
add_filter( 'body_class', 'nota_landing_body_classes', 9999 );
