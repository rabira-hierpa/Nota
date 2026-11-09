<?php
/**
 * The Dashboard's "Nota downloads" box: how often each release and each build was
 * downloaded from GitHub, from the theme's cached copy, with a button that asks
 * GitHub again.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

/**
 * Adds the box for people who can change the theme.
 *
 * @return void
 */
function nota_dashboard_setup() {
	if ( current_user_can( 'edit_theme_options' ) ) {
		wp_add_dashboard_widget( 'nota_downloads', 'Nota downloads', 'nota_dashboard_widget' );
	}
}
add_action( 'wp_dashboard_setup', 'nota_dashboard_setup' );

/**
 * The box.
 *
 * @return void
 */
function nota_dashboard_widget() {
	$data     = nota_github_data();
	$releases = $data ? $data['releases'] : array();
	$status   = isset( $_GET['nota_github'] ) ? sanitize_key( wp_unslash( $_GET['nota_github'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only picks which message to show.

	if ( 'ok' === $status ) {
		echo '<div class="notice notice-success inline"><p>Asked GitHub again: these are the latest numbers.</p></div>';
	} elseif ( 'failed' === $status ) {
		echo '<div class="notice notice-error inline"><p>GitHub could not be asked just now. The numbers below are the last ones it gave.</p></div>';
	}

	if ( $data && '' !== $data['error'] ) {
		printf( '<p><strong>Last try:</strong> %s</p>', esc_html( $data['error'] ) );
	}

	if ( ! $releases ) {
		echo '<p>No releases yet. They come from the GitHub repository set under Appearance, Customize, Nota landing page, Links and version.</p>';
	} else {
		$totals = nota_download_totals( $releases );
		$latest = $releases[0];
		?>
		<p class="nota-dash__total">
			<strong style="font-size:2em;line-height:1.2;display:block"><?php echo esc_html( number_format_i18n( $totals['all'] ) ); ?></strong>
			downloads of all <?php echo esc_html( number_format_i18n( count( $releases ) ) ); ?> releases from GitHub, <?php echo esc_html( number_format_i18n( nota_release_downloads( $latest ) ) ); ?> of them of <?php echo esc_html( $latest['tag'] ); ?>.
		</p>

		<table class="widefat striped" style="margin-top:12px">
			<thead><tr><th scope="col">Build</th><th scope="col" style="text-align:right"><?php echo esc_html( $latest['tag'] ); ?></th><th scope="col" style="text-align:right">All releases</th></tr></thead>
			<tbody>
				<?php
				$latest_totals = nota_download_totals( array( $latest ) );
				foreach ( nota_platform_labels() as $platform => $label ) :
					if ( ! $totals['platforms'][ $platform ] && in_array( $platform, array( 'android', 'ios', 'other' ), true ) ) {
						continue;
					}
					?>
					<tr>
						<td><?php echo esc_html( $label ); ?></td>
						<td style="text-align:right"><?php echo esc_html( number_format_i18n( $latest_totals['platforms'][ $platform ] ) ); ?></td>
						<td style="text-align:right"><?php echo esc_html( number_format_i18n( $totals['platforms'][ $platform ] ) ); ?></td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>

		<table class="widefat striped" style="margin-top:12px">
			<thead><tr><th scope="col">Release</th><th scope="col">Published</th><th scope="col" style="text-align:right">Downloads</th></tr></thead>
			<tbody>
				<?php foreach ( array_slice( $releases, 0, 10 ) as $release ) : ?>
					<tr>
						<td><a href="<?php echo esc_url( $release['url'] ); ?>"><?php echo esc_html( $release['tag'] ); ?></a></td>
						<td><?php echo $release['date'] ? esc_html( wp_date( get_option( 'date_format' ), $release['date'] ) ) : ''; ?></td>
						<td style="text-align:right"><?php echo esc_html( number_format_i18n( nota_release_downloads( $release ) ) ); ?></td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>

		<p class="description" style="margin-top:12px">GitHub counts every file downloaded, the .zip and .tar.gz files too, including your own downloads and automated ones. Each build adds up its .dmg or installer and its .zip or .tar.gz.</p>
		<?php
	}

	$umami = nota_umami_id();
	?>
	<p style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin-top:12px">
		<?php if ( $data && $data['checked'] ) : ?>
			<span>Checked with GitHub <?php echo esc_html( human_time_diff( $data['checked'] ) ); ?> ago. It checks again by itself every <?php echo esc_html( human_time_diff( 0, nota_github_ttl() ) ); ?>.</span>
		<?php endif; ?>
		<a class="button" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=nota_github_refresh' ), 'nota_github_refresh' ) ); ?>">Ask GitHub now</a>
	</p>
	<p>
		<?php if ( '' !== $umami ) : ?>
			Visits, and clicks on each download button: <a href="https://cloud.umami.is/" rel="noopener">your Umami dashboard</a> (Events, Download, platform).
		<?php else : ?>
			To count visits and clicks on each download button, add an Umami website ID under <a href="<?php echo esc_url( admin_url( 'customize.php?autofocus[section]=nota_stats' ) ); ?>">Appearance, Customize, Nota landing page, Visits and downloads</a>.
		<?php endif; ?>
	</p>
	<?php
}

/**
 * The "Ask GitHub now" button: fetches at once, clears the cached pages, and
 * comes back to the Dashboard.
 *
 * @return void
 */
function nota_dashboard_refresh() {
	if ( ! current_user_can( 'edit_theme_options' ) ) {
		wp_die( 'You are not allowed to do this.', 403 );
	}
	check_admin_referer( 'nota_github_refresh' );

	delete_transient( NOTA_GITHUB_FRESH );
	$data = nota_github_fetch();
	nota_github_purge_pages();

	$back = wp_get_referer();
	$back = $back ? remove_query_arg( 'nota_github', $back ) : admin_url();
	wp_safe_redirect( add_query_arg( 'nota_github', $data && '' === $data['error'] ? 'ok' : 'failed', $back ) . '#nota_downloads' );
	exit;
}
add_action( 'admin_post_nota_github_refresh', 'nota_dashboard_refresh' );
