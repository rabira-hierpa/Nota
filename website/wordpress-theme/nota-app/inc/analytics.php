<?php
/**
 * Counting visits and download clicks, switched on in the Customizer under Nota
 * landing page, Visits and downloads.
 *
 * Umami is the one the theme is built for: it sets no cookies and keeps nothing
 * that identifies a visitor, so the site needs no cookie banner, which suits an app
 * whose promise is that nothing leaves your device. Its free cloud plan counts
 * custom events, which is what tells you which download button people press.
 * Cloudflare Web Analytics is there as well, for visits only: it has no custom
 * events, so it can't count the buttons.
 *
 * Nothing loads for people who can edit the site, so your own visits don't count,
 * nor in the Customizer's preview.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

define( 'NOTA_UMAMI_SCRIPT', 'https://cloud.umami.is/script.js' );

/**
 * A website ID as Umami writes it, or nothing.
 *
 * @param string $value The field's value.
 * @return string
 */
function nota_sanitize_umami_id( $value ) {
	$value = strtolower( trim( (string) $value ) );
	return preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $value ) ? $value : '';
}

/**
 * A Cloudflare Web Analytics token, or nothing. People often paste the whole
 * snippet, so the token is picked out of it.
 *
 * @param string $value The field's value.
 * @return string
 */
function nota_sanitize_cf_token( $value ) {
	return preg_match( '/\b([0-9a-f]{32})\b/i', (string) $value, $match ) ? strtolower( $match[1] ) : '';
}

/**
 * A checkbox's value.
 *
 * @param mixed $value The field's value.
 * @return bool
 */
function nota_sanitize_checkbox( $value ) {
	return (bool) $value;
}

/**
 * The Umami website ID, when visits are counted with Umami.
 *
 * @return string
 */
function nota_umami_id() {
	return nota_sanitize_umami_id( (string) get_theme_mod( 'nota_umami_id', '' ) );
}

/**
 * True when this page view should be counted.
 *
 * @return bool
 */
function nota_counts_this_visit() {
	return ! is_customize_preview() && ! current_user_can( 'edit_posts' );
}

/**
 * The site's own addresses, so a copy of the page served from anywhere else, such
 * as a staging address, isn't counted.
 *
 * @return string Host names, comma separated.
 */
function nota_analytics_domains() {
	$host = strtolower( (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
	if ( 0 === strpos( $host, 'www.' ) ) {
		return $host . ',' . substr( $host, 4 );
	}
	return $host . ',www.' . $host;
}

/**
 * Prints the counting scripts.
 *
 * @return void
 */
function nota_analytics_head() {
	if ( ! nota_counts_this_visit() ) {
		return;
	}

	$umami = nota_umami_id();
	if ( '' !== $umami ) {
		$src = (string) get_theme_mod( 'nota_umami_src', NOTA_UMAMI_SCRIPT );
		wp_print_script_tag(
			array(
				'src'               => esc_url( '' !== $src ? $src : NOTA_UMAMI_SCRIPT ),
				'defer'             => true,
				'data-website-id'   => $umami,
				'data-domains'      => nota_analytics_domains(),
				'data-do-not-track' => 'true',
				'data-no-optimize'  => '1',
			)
		);
	}

	$token = nota_sanitize_cf_token( (string) get_theme_mod( 'nota_cf_token', '' ) );
	if ( '' !== $token ) {
		wp_print_script_tag(
			array(
				'src'              => 'https://static.cloudflareinsights.com/beacon.min.js',
				'defer'            => true,
				'data-cf-beacon'   => wp_json_encode( array( 'token' => $token ) ),
				'data-no-optimize' => '1',
			)
		);
	}
}
add_action( 'wp_head', 'nota_analytics_head', 20 );

/**
 * The attributes that make Umami count a click on a download link as a Download
 * event, with the build as its platform. Umami waits for the count to be sent
 * before it follows the link.
 *
 * @param string $platform The build, as in nota_asset_platform(): mac-arm64, android...
 * @return string Attributes with a space before them, safe to print, or nothing.
 */
function nota_track_download( $platform ) {
	if ( '' === nota_umami_id() ) {
		return '';
	}
	return ' data-umami-event="Download" data-umami-event-platform="' . esc_attr( $platform ) . '"';
}
