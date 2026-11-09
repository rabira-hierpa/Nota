<?php
/**
 * The release notes page: every version's notes from GitHub, in the theme's own
 * type, in English with the Amharic page at ?lang=am.
 *
 * Any page becomes it with the template "Nota release notes", and a page whose
 * address is /releases/ or /release-notes/ becomes it by itself. The shortcode
 * [nota_releases] puts the same list in any other page, Elementor's included.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

define( 'NOTA_RELEASES_TEMPLATE', 'page-templates/release-notes.php' );

/**
 * The slugs that make a page the release notes page without choosing the template.
 *
 * @return string[]
 */
function nota_releases_slugs() {
	return array( 'releases', 'release-notes' );
}

/**
 * True when this request shows the release notes page.
 *
 * @return bool
 */
function nota_is_releases() {
	if ( ! is_page() ) {
		return false;
	}
	if ( is_page_template( NOTA_RELEASES_TEMPLATE ) ) {
		return true;
	}
	return is_page( nota_releases_slugs() ) && '' === get_page_template_slug() && ! nota_is_builder_page( get_queried_object_id() );
}

/**
 * Pages built by the theme that each have an English and an Amharic version.
 *
 * @return bool
 */
function nota_is_bilingual() {
	return nota_is_landing() || nota_is_releases();
}

/**
 * Uses the template for a /releases/ page that has none of its own.
 *
 * @param string $template The template WordPress chose.
 * @return string
 */
function nota_releases_template( $template ) {
	if ( nota_is_releases() && ! is_page_template( NOTA_RELEASES_TEMPLATE ) ) {
		return get_theme_file_path( NOTA_RELEASES_TEMPLATE );
	}
	return $template;
}
add_filter( 'template_include', 'nota_releases_template', 98 );

/**
 * The release notes page, if the site has one.
 *
 * @return int Page ID, or 0.
 */
function nota_releases_page_id() {
	static $id = null;
	if ( null !== $id ) {
		return $id;
	}

	$ids = get_posts(
		array(
			'post_type'      => 'page',
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'no_found_rows'  => true,
			'meta_key'       => '_wp_page_template', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- One indexed lookup, on pages only.
			'meta_value'     => NOTA_RELEASES_TEMPLATE, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- As above.
		)
	);
	if ( ! $ids ) {
		foreach ( nota_releases_slugs() as $slug ) {
			$page = get_page_by_path( $slug );
			if ( $page && 'publish' === $page->post_status && '' === get_page_template_slug( $page ) ) {
				$ids = array( $page->ID );
				break;
			}
		}
	}

	$id = $ids ? (int) $ids[0] : 0;
	return $id;
}

/**
 * This page's address in a language: the landing page, or the release notes page
 * with ?lang when that isn't the site's own language.
 *
 * @param string $lang 'am' or 'en'.
 * @return string
 */
function nota_page_lang_url( $lang ) {
	if ( ! nota_is_releases() ) {
		return nota_lang_url( $lang );
	}
	$url = get_permalink( get_queried_object_id() );
	return nota_base_lang() === $lang ? $url : add_query_arg( 'lang', $lang, $url );
}

/**
 * Where a version's notes are: its place on the release notes page, or GitHub.
 *
 * @param string $version Version number, without the v.
 * @return string
 */
function nota_release_notes_url( $version ) {
	$page = nota_releases_page_id();
	if ( $page ) {
		$url = get_permalink( $page );
		if ( nota_base_lang() !== nota_lang() ) {
			$url = add_query_arg( 'lang', nota_lang(), $url );
		}
		return $url . '#' . nota_release_anchor( 'v' . $version );
	}
	return untrailingslashit( nota_opt( 'github_url' ) ) . '/releases/tag/v' . rawurlencode( $version );
}

/**
 * The id of a release's place on the page.
 *
 * @param string $tag The release's tag.
 * @return string
 */
function nota_release_anchor( $tag ) {
	return 'release-' . sanitize_title( $tag );
}

/**
 * A number for the page. Amharic writes numbers with the same digits.
 *
 * @param int $count The number.
 * @return string
 */
function nota_format_count( $count ) {
	return number_format( (int) $count );
}

/**
 * A date in the page's language: the Gregorian calendar in English, the Ethiopian
 * in Amharic, as the app shows them.
 *
 * @param int $timestamp Unix time.
 * @return string
 */
function nota_release_date( $timestamp ) {
	if ( 'am' === nota_lang() ) {
		return nota_ethiopian_date( $timestamp );
	}
	$months = array( 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' );
	list( $year, $month, $day ) = array_map( 'intval', explode( '-', wp_date( 'Y-n-j', $timestamp ) ) );
	return $day . ' ' . $months[ $month - 1 ] . ' ' . $year;
}

/**
 * Prints the releases: newest first, each with its date, notes and link.
 *
 * @param int $limit How many releases to show.
 * @return void
 */
function nota_render_releases( $limit = 10 ) {
	nota_github_tag_page();

	$data     = nota_github_data();
	$releases = $data ? array_slice( $data['releases'], 0, max( 1, (int) $limit ) ) : array();
	$github   = untrailingslashit( nota_opt( 'github_url' ) );
	$is_am    = 'am' === nota_lang();
	$counts   = nota_show_downloads();
	$latest   = '';

	foreach ( $releases as $release ) {
		if ( ! $release['prerelease'] ) {
			$latest = $release['tag'];
			break;
		}
	}

	if ( ! $releases ) {
		printf(
			'<p class="releases__empty">%s <a class="text-link" href="%s" rel="noopener">%s%s</a></p>',
			esc_html( nota_ui( 'releases_error' ) ),
			esc_url( $github . '/releases' ),
			esc_html( nota_ui( 'releases_all' ) ),
			nota_icon( 'arrow-up-right' ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme.
		);
		return;
	}

	echo '<div class="releases">';
	foreach ( $releases as $release ) {
		$anchor = nota_release_anchor( $release['tag'] );
		$title  = '' !== $release['name'] ? $release['name'] : $release['tag'];
		$notes  = $is_am && '' !== $release['notes_am'] ? $release['notes_am'] : $release['notes_en'];
		$in_en  = $is_am && '' === $release['notes_am'];
		?>
		<article class="release" id="<?php echo esc_attr( $anchor ); ?>" aria-labelledby="<?php echo esc_attr( $anchor . '-title' ); ?>">
			<header class="release__head">
				<h2 class="release__title" id="<?php echo esc_attr( $anchor . '-title' ); ?>"><?php echo esc_html( $title ); ?></h2>
				<p class="release__meta">
					<?php if ( $release['tag'] === $latest ) : ?>
						<span class="release__badge"><?php echo esc_html( nota_ui( 'releases_latest' ) ); ?></span>
					<?php elseif ( $release['prerelease'] ) : ?>
						<span class="release__badge release__badge--quiet"><?php echo esc_html( nota_ui( 'releases_prerelease' ) ); ?></span>
					<?php endif; ?>
					<?php if ( $release['date'] ) : ?>
						<time datetime="<?php echo esc_attr( wp_date( 'Y-m-d', $release['date'] ) ); ?>"><?php echo esc_html( nota_release_date( $release['date'] ) ); ?></time>
					<?php endif; ?>
				</p>
				<?php if ( $counts ) : ?>
					<?php $nota_downloads = nota_release_downloads( $release ); ?>
					<p class="release__count"><?php echo esc_html( str_replace( '{count}', nota_format_count( $nota_downloads ), nota_ui( 1 === $nota_downloads ? 'releases_download' : 'releases_downloads' ) ) ); ?></p>
				<?php endif; ?>
				<div class="release__links">
					<?php if ( $release['tag'] === $latest && nota_landing_enabled() ) : ?>
						<a class="button button--primary" href="<?php echo esc_url( nota_lang_url( nota_lang() ) . '#download' ); ?>"><?php nota_text( 'cta_download' ); ?></a>
					<?php endif; ?>
					<?php if ( '' !== $release['url'] ) : ?>
						<a class="text-link" href="<?php echo esc_url( $release['url'] ); ?>" rel="noopener">
							<?php echo esc_html( nota_ui( 'releases_github' ) ); ?>
							<?php echo nota_icon( 'arrow-up-right' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
						</a>
					<?php endif; ?>
				</div>
			</header>
			<div class="release__body">
				<?php if ( $in_en && '' !== $notes ) : ?>
					<p class="release__lang-note"><?php echo esc_html( nota_ui( 'releases_english_only' ) ); ?></p>
				<?php endif; ?>
				<div class="release__notes prose"<?php echo $in_en ? ' lang="en"' : ''; ?>>
					<?php
					// Cleaned by nota_release_notes_clean() when it was fetched; kses again costs little.
					echo wp_kses( $notes, nota_release_notes_allowed() + array( 'div' => array( 'class' => true ) ) );
					?>
				</div>
			</div>
		</article>
		<?php
	}
	echo '</div>';

	printf(
		'<p class="releases__more"><a class="text-link" href="%s" rel="noopener">%s%s</a></p>',
		esc_url( $github . '/releases' ),
		esc_html( nota_ui( 'releases_all' ) ),
		nota_icon( 'arrow-up-right' ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme.
	);
}

/**
 * [nota_releases count="5"]: the releases in any page.
 *
 * @param array<string, string>|string $atts Shortcode attributes.
 * @return string
 */
function nota_releases_shortcode( $atts ) {
	$atts = shortcode_atts( array( 'count' => '10' ), (array) $atts, 'nota_releases' );
	ob_start();
	nota_render_releases( (int) $atts['count'] );
	return (string) ob_get_clean();
}
add_shortcode( 'nota_releases', 'nota_releases_shortcode' );
