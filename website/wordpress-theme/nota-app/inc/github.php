<?php
/**
 * Nota's releases on GitHub: their notes and download counts, fetched by the
 * server and cached, so a visitor's page view never waits for GitHub.
 *
 * One request to the releases API brings both. The last good copy is kept in an
 * option, and a transient says whether it is still fresh: while it is, nothing
 * calls GitHub. Once it isn't, WP-Cron fetches a new copy in the background and
 * pages keep the old one meanwhile. Only a site that has never fetched waits for
 * GitHub, once. Each request sends the last ETag, and a 304 doesn't count against
 * GitHub's hourly limit, which matters on shared hosting, where many sites share
 * one address and that limit.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

define( 'NOTA_GITHUB_OPTION', 'nota_github_releases' );
define( 'NOTA_GITHUB_FRESH', 'nota_github_fresh' );
define( 'NOTA_GITHUB_LOCK', 'nota_github_lock' );
define( 'NOTA_GITHUB_EVENT', 'nota_github_refresh' );
define( 'NOTA_GITHUB_SCHEMA', 1 );

/**
 * The repository as owner/name, read from the GitHub link in the Customizer.
 *
 * @return string Empty when the link isn't a GitHub repository.
 */
function nota_github_repo() {
	$url = nota_opt( 'github_url' );
	if ( 'github.com' !== strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) ) ) {
		return '';
	}
	$parts = explode( '/', trim( (string) wp_parse_url( $url, PHP_URL_PATH ), '/' ) );
	if ( count( $parts ) < 2 ) {
		return '';
	}
	$repo = $parts[0] . '/' . preg_replace( '/\.git$/', '', $parts[1] );
	return preg_match( '#^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$#', $repo ) ? $repo : '';
}

/**
 * How long a copy stays fresh.
 *
 * @return int Seconds.
 */
function nota_github_ttl() {
	return (int) apply_filters( 'nota_github_ttl', 6 * HOUR_IN_SECONDS );
}

/**
 * The stored copy, if it was made by this version of the theme for this repository.
 *
 * @return array<string, mixed>|null
 */
function nota_github_stored() {
	$data = get_option( NOTA_GITHUB_OPTION );
	if ( ! is_array( $data ) || ! isset( $data['schema'], $data['repo'] ) || NOTA_GITHUB_SCHEMA !== $data['schema'] ) {
		return null;
	}
	return $data['repo'] === nota_github_repo() ? $data : null;
}

/**
 * The releases, newest first, with notes and download counts. Never waits for
 * GitHub unless nothing was ever fetched.
 *
 * @return array<string, mixed>|null The copy (see nota_github_fetch()), or null.
 */
function nota_github_data() {
	static $data = false;
	if ( false !== $data ) {
		return $data;
	}

	$data = nota_github_stored();
	if ( null === $data ) {
		// Never fetched for this repository: one request now, while other visitors
		// see the page without it. Even a failure is stored, so this happens once.
		if ( ! get_transient( NOTA_GITHUB_LOCK ) ) {
			set_transient( NOTA_GITHUB_LOCK, 1, MINUTE_IN_SECONDS );
			$data = nota_github_fetch();
			delete_transient( NOTA_GITHUB_LOCK );
		}
	} elseif ( ! get_transient( NOTA_GITHUB_FRESH ) && ! wp_next_scheduled( NOTA_GITHUB_EVENT ) ) {
		wp_schedule_single_event( time(), NOTA_GITHUB_EVENT );
	}

	return $data;
}

/**
 * WP-Cron's refresh.
 *
 * @return void
 */
function nota_github_refresh() {
	nota_github_fetch();
}
add_action( NOTA_GITHUB_EVENT, 'nota_github_refresh' );

/**
 * Asks GitHub for the releases and stores what comes back. On any failure the last
 * good copy stays, and GitHub is asked again an hour later, not on the next view.
 *
 * @return array<string, mixed>|null {
 *     The stored copy.
 *
 *     @type int    $schema   NOTA_GITHUB_SCHEMA.
 *     @type string $repo     owner/name.
 *     @type string $etag     GitHub's ETag for the list.
 *     @type int    $fetched  When the list last changed hands, as a timestamp (0: never).
 *     @type int    $checked  When GitHub was last asked.
 *     @type string $error    Why the last request failed, or empty.
 *     @type array  $releases See nota_github_shape().
 * }
 */
function nota_github_fetch() {
	$repo = nota_github_repo();
	$old  = nota_github_stored();
	if ( '' === $repo ) {
		return nota_github_fail( $old, 'The GitHub link under Links and version is not a repository.' );
	}

	$headers = array(
		'Accept'               => 'application/vnd.github.html+json',
		'X-GitHub-Api-Version' => '2022-11-28',
		'User-Agent'           => 'Nota-WordPress-theme',
	);
	if ( $old && '' !== $old['etag'] && $old['fetched'] ) {
		$headers['If-None-Match'] = $old['etag'];
	}
	if ( defined( 'NOTA_GITHUB_TOKEN' ) && is_string( NOTA_GITHUB_TOKEN ) && '' !== NOTA_GITHUB_TOKEN ) {
		$headers['Authorization'] = 'Bearer ' . NOTA_GITHUB_TOKEN;
	}

	$response = wp_remote_get(
		'https://api.github.com/repos/' . $repo . '/releases?per_page=100',
		array(
			'timeout' => 10,
			'headers' => $headers,
		)
	);
	$code = (int) wp_remote_retrieve_response_code( $response );

	if ( 304 === $code && $old ) {
		$old['checked'] = time();
		$old['error']   = '';
		update_option( NOTA_GITHUB_OPTION, $old, false );
		set_transient( NOTA_GITHUB_FRESH, 1, nota_github_ttl() );
		return $old;
	}

	if ( 200 !== $code ) {
		if ( is_wp_error( $response ) ) {
			$reason = 'GitHub could not be reached: ' . $response->get_error_message();
		} elseif ( in_array( $code, array( 403, 429 ), true ) && '0' === (string) wp_remote_retrieve_header( $response, 'x-ratelimit-remaining' ) ) {
			$reason = 'GitHub\'s hourly limit for this server\'s address was reached. The theme tries again in an hour.';
		} elseif ( 404 === $code ) {
			$reason = 'GitHub has no public repository ' . $repo . '.';
		} else {
			$reason = 'GitHub answered with status ' . $code . '.';
		}
		return nota_github_fail( $old, $reason );
	}

	$list = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $list ) ) {
		return nota_github_fail( $old, 'GitHub\'s answer was not a list of releases.' );
	}

	$data = array(
		'schema'   => NOTA_GITHUB_SCHEMA,
		'repo'     => $repo,
		'etag'     => (string) wp_remote_retrieve_header( $response, 'etag' ),
		'fetched'  => time(),
		'checked'  => time(),
		'error'    => '',
		'releases' => nota_github_shape( $list ),
	);
	update_option( NOTA_GITHUB_OPTION, $data, false );
	set_transient( NOTA_GITHUB_FRESH, 1, nota_github_ttl() );

	if ( ! $old || nota_github_signature( $old ) !== nota_github_signature( $data ) ) {
		nota_github_purge_pages();
	}
	return $data;
}

/**
 * Keeps the last good copy after a failed request, and notes why it failed.
 *
 * @param array<string, mixed>|null $old    The copy before the request.
 * @param string                    $reason Why the request failed, for the dashboard.
 * @return array<string, mixed>
 */
function nota_github_fail( $old, $reason ) {
	set_transient( NOTA_GITHUB_FRESH, 1, HOUR_IN_SECONDS );
	$data = $old ? $old : array(
		'schema'   => NOTA_GITHUB_SCHEMA,
		'repo'     => nota_github_repo(),
		'etag'     => '',
		'fetched'  => 0,
		'releases' => array(),
	);

	$data['checked'] = time();
	$data['error']   = $reason;
	update_option( NOTA_GITHUB_OPTION, $data, false );
	return $data;
}

/**
 * What the pages show of the copy: the notes always, and the counts when they are
 * on the page. A page cache needs clearing only when this changes.
 *
 * @param array<string, mixed> $data A stored copy.
 * @return string
 */
function nota_github_signature( $data ) {
	$shown = array();
	foreach ( $data['releases'] as $release ) {
		if ( ! nota_show_downloads() ) {
			unset( $release['assets'] );
		}
		$shown[] = $release;
	}
	return md5( (string) wp_json_encode( $shown ) );
}

/**
 * Marks this page as one that shows GitHub's data, so the page cache can drop it
 * when that data changes. LiteSpeed Cache knows these hooks; elsewhere they do nothing.
 *
 * @return void
 */
function nota_github_tag_page() {
	do_action( 'litespeed_tag_add', 'nota_github' );
	do_action( 'litespeed_control_set_ttl', DAY_IN_SECONDS );
}

/**
 * Drops the cached pages that show GitHub's data.
 *
 * @return void
 */
function nota_github_purge_pages() {
	do_action( 'litespeed_purge', 'nota_github' );
}

/**
 * Keeps what the theme uses from GitHub's list of releases: no drafts, and notes
 * only for the newest twenty, which is more than the page shows.
 *
 * @param array<int, mixed> $list Releases as GitHub sends them.
 * @return array<int, array<string, mixed>>
 */
function nota_github_shape( $list ) {
	$releases = array();
	foreach ( $list as $item ) {
		if ( ! is_array( $item ) || ! empty( $item['draft'] ) || empty( $item['tag_name'] ) ) {
			continue;
		}

		$assets = array();
		foreach ( isset( $item['assets'] ) && is_array( $item['assets'] ) ? $item['assets'] : array() as $asset ) {
			if ( ! is_array( $asset ) || empty( $asset['name'] ) ) {
				continue;
			}
			$assets[] = array(
				'name'     => sanitize_file_name( (string) $asset['name'] ),
				'count'    => isset( $asset['download_count'] ) ? max( 0, (int) $asset['download_count'] ) : 0,
				'size'     => isset( $asset['size'] ) ? max( 0, (int) $asset['size'] ) : 0,
				'platform' => nota_asset_platform( (string) $asset['name'] ),
			);
		}

		$date  = isset( $item['published_at'] ) ? strtotime( (string) $item['published_at'] ) : false;
		$notes = count( $releases ) < 20 && isset( $item['body_html'] ) ? nota_release_notes_split( (string) $item['body_html'] ) : array(
			'en' => '',
			'am' => '',
		);

		$releases[] = array(
			'tag'        => sanitize_text_field( (string) $item['tag_name'] ),
			'name'       => isset( $item['name'] ) ? sanitize_text_field( (string) $item['name'] ) : '',
			'date'       => false !== $date ? (int) $date : 0,
			'url'        => isset( $item['html_url'] ) ? esc_url_raw( (string) $item['html_url'] ) : '',
			'prerelease' => ! empty( $item['prerelease'] ),
			'notes_en'   => $notes['en'],
			'notes_am'   => $notes['am'],
			'assets'     => $assets,
		);
	}

	usort(
		$releases,
		static function ( $a, $b ) {
			return $b['date'] - $a['date'];
		}
	);
	return $releases;
}

/**
 * Which build a release file is, from its name: Nota-0.3.0-mac-arm64.dmg is
 * mac-arm64. Update metadata and checksums are 'meta' and aren't downloads.
 *
 * @param string $name File name.
 * @return string
 */
function nota_asset_platform( $name ) {
	if ( preg_match( '/\.(blockmap|ya?ml|sha256|sha512|sig|asc|txt)$/i', $name ) ) {
		return 'meta';
	}
	$patterns = array(
		'mac-arm64'   => '/-mac-arm64[.-]/i',
		'mac-x64'     => '/-mac-x64[.-]/i',
		'win-x64'     => '/-win-x64[.-]/i',
		'win-arm64'   => '/-win-arm64[.-]/i',
		'linux-x64'   => '/-linux-(x86_64|x64|amd64)[.-]/i',
		'linux-arm64' => '/-linux-(arm64|aarch64)[.-]/i',
		'android'     => '/\.(apk|aab)$/i',
		'ios'         => '/\.ipa$/i',
	);
	foreach ( $patterns as $platform => $pattern ) {
		if ( preg_match( $pattern, $name ) ) {
			return $platform;
		}
	}
	return 'other';
}

/**
 * Names for the builds, for the dashboard.
 *
 * @return array<string, string>
 */
function nota_platform_labels() {
	return array(
		'mac-arm64'   => 'macOS, Apple silicon',
		'mac-x64'     => 'macOS, Intel',
		'win-x64'     => 'Windows, x64',
		'win-arm64'   => 'Windows, ARM64',
		'linux-x64'   => 'Linux, x86-64',
		'linux-arm64' => 'Linux, ARM64',
		'android'     => 'Android',
		'ios'         => 'iPhone',
		'other'       => 'Other files',
	);
}

/**
 * How many times a release's files were downloaded, as GitHub counts them.
 *
 * @param array<string, mixed> $release One release from nota_github_shape().
 * @return int
 */
function nota_release_downloads( $release ) {
	$total = 0;
	foreach ( $release['assets'] as $asset ) {
		if ( 'meta' !== $asset['platform'] ) {
			$total += $asset['count'];
		}
	}
	return $total;
}

/**
 * Downloads of every release: in all, and by build.
 *
 * @param array<int, array<string, mixed>> $releases From nota_github_shape().
 * @return array{all: int, platforms: array<string, int>}
 */
function nota_download_totals( $releases ) {
	$totals = array(
		'all'       => 0,
		'platforms' => array_fill_keys( array_keys( nota_platform_labels() ), 0 ),
	);
	foreach ( $releases as $release ) {
		foreach ( $release['assets'] as $asset ) {
			if ( 'meta' === $asset['platform'] ) {
				continue;
			}
			$totals['all']                            += $asset['count'];
			$totals['platforms'][ $asset['platform'] ] += $asset['count'];
		}
	}
	return $totals;
}

/**
 * True when the Customizer says to show download numbers to visitors.
 *
 * @return bool
 */
function nota_show_downloads() {
	return (bool) get_theme_mod( 'nota_show_downloads', false );
}

/**
 * The tags release notes may keep. No pictures (GitHub would learn of each visit
 * through them), no scripts, styles, frames, forms or attributes beyond a link's.
 *
 * @return array<string, array<string, bool>>
 */
function nota_release_notes_allowed() {
	$plain = array( 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'li', 'strong', 'b', 'em', 'i', 'del', 's', 'sup', 'sub', 'kbd', 'mark', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'details', 'summary' );
	$tags  = array_fill_keys( $plain, array() );

	$tags['ol'] = array( 'start' => true );
	$tags['a']  = array(
		'href'  => true,
		'title' => true,
	);
	$tags['th'] = array( 'align' => true );
	$tags['td'] = array( 'align' => true );
	return $tags;
}

/**
 * Makes GitHub's rendering of a release's Markdown safe to print, whoever wrote it.
 * GitHub already sanitises it; this is the second, stricter pass, and the one that
 * would hold if GitHub's ever slipped.
 *
 * @param string $html GitHub's body_html.
 * @return string
 */
function nota_release_notes_clean( $html ) {
	// Whole elements whose text means nothing outside them.
	$html = preg_replace( '#<(script|style|iframe|object|embed|template|svg|math|noscript|textarea|select)\b.*?</\1\s*>#is', '', $html );
	// Permalink anchors beside headings, in GitHub's newer markup.
	$html = preg_replace( '#<a\b[^>]*\bclass="anchor"[^>]*>.*?</a>#is', '', (string) $html );
	$html = wp_kses( (string) $html, nota_release_notes_allowed(), array( 'http', 'https', 'mailto' ) );
	// A link that isn't to a web address or an email (one kses took a bad protocol off,
	// or one relative to GitHub that would lead nowhere here) keeps its text only.
	$html = preg_replace_callback(
		'#<a\b([^>]*)>(.*?)</a>#is',
		static function ( $link ) {
			return preg_match( '#\bhref="(https?://|mailto:)#i', $link[1] ) ? $link[0] : $link[2];
		},
		$html
	);
	return trim( (string) $html );
}

/**
 * Splits a release's notes into English and Amharic. Notes that have a heading
 * that says አማርኛ (or Amharic) keep what is under it for the Amharic page, up to
 * the next heading of the same level, and the rest for the English page.
 *
 * @param string $html GitHub's body_html.
 * @return array{en: string, am: string}
 */
function nota_release_notes_split( $html ) {
	$html  = nota_release_notes_clean( $html );
	$parts = array(
		'en' => '',
		'am' => '',
	);
	if ( '' === $html ) {
		return $parts;
	}

	$am_level = 0;
	foreach ( preg_split( '/(?=<h[1-6]>)/i', $html ) as $chunk ) {
		$level = preg_match( '/^<h([1-6])>(.*?)<\/h\1>/is', $chunk, $match ) ? (int) $match[1] : 0;
		if ( $am_level && $level && $level <= $am_level ) {
			$am_level = 0;
		}
		if ( ! $am_level && $level && in_array( strtolower( trim( wp_strip_all_tags( $match[2] ) ) ), array( 'አማርኛ', 'amharic', 'in amharic', 'በአማርኛ' ), true ) ) {
			$am_level     = $level;
			$parts['am'] .= substr( $chunk, strlen( $match[0] ) );
			continue;
		}
		$parts[ $am_level ? 'am' : 'en' ] .= $chunk;
	}

	return array(
		'en' => nota_release_notes_finish( $parts['en'] ),
		'am' => nota_release_notes_finish( $parts['am'] ),
	);
}

/**
 * Fits clean notes into the page: the page has its h1 and each release an h2, so the
 * notes' biggest heading becomes an h3; and a table gets a box that can scroll.
 *
 * @param string $html Notes from nota_release_notes_clean().
 * @return string
 */
function nota_release_notes_finish( $html ) {
	$html = trim( $html );
	if ( '' === $html ) {
		return '';
	}

	if ( preg_match_all( '/<h([1-6])>/i', $html, $levels ) ) {
		$shift = 3 - min( array_map( 'intval', $levels[1] ) );
		$html  = preg_replace_callback(
			'#<(/?)h([1-6])>#i',
			static function ( $tag ) use ( $shift ) {
				return '<' . $tag[1] . 'h' . min( 6, (int) $tag[2] + $shift ) . '>';
			},
			$html
		);
	}

	return str_replace( array( '<table>', '</table>' ), array( '<div class="release-table"><table>', '</table></div>' ), $html );
}
