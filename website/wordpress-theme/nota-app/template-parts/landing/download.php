<?php
/**
 * Landing page: the real release files, and what to do on first launch.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_version = nota_opt( 'version' );
$nota_github  = untrailingslashit( nota_opt( 'github_url' ) );
$nota_total   = null;
if ( nota_show_downloads() && '' !== nota_t( 'download_count' ) ) {
	nota_github_tag_page();
	$nota_data = nota_github_data();
	if ( $nota_data && $nota_data['releases'] ) {
		$nota_total = nota_download_totals( $nota_data['releases'] );
	}
}
?>
<section class="download" id="download" aria-labelledby="download-title">
	<div class="wrap download__grid">
		<div class="download__head">
			<?php nota_field( 'download_title', 'h2', 'section-title', 'download-title' ); ?>
			<?php nota_field( 'download_text', 'p', 'block-text' ); ?>
			<?php if ( '' !== $nota_version && '' !== nota_t( 'download_version' ) ) : ?>
				<p class="download__version"><?php echo esc_html( str_replace( '{version}', $nota_version, nota_t( 'download_version' ) ) ); ?></p>
			<?php endif; ?>
			<?php if ( null !== $nota_total && $nota_total['all'] > 0 ) : ?>
				<p class="download__count"><?php echo esc_html( str_replace( '{count}', nota_format_count( $nota_total['all'] ), nota_t( 'download_count' ) ) ); ?></p>
			<?php endif; ?>
			<?php if ( '' !== $nota_version && '' !== nota_t( 'download_notes' ) ) : ?>
				<?php $nota_notes_url = nota_release_notes_url( $nota_version ); ?>
				<a class="text-link" href="<?php echo esc_url( $nota_notes_url ); ?>"<?php echo nota_releases_page_id() ? '' : ' rel="noopener"'; ?>>
					<?php echo esc_html( str_replace( '{version}', $nota_version, nota_t( 'download_notes' ) ) ); ?>
					<?php echo nota_releases_page_id() ? '' : nota_icon( 'arrow-up-right' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
				</a>
			<?php endif; ?>
		</div>

		<div class="download__groups" data-download-groups>
			<?php foreach ( nota_downloads() as $nota_group ) : ?>
				<div class="dl-group" data-os="<?php echo esc_attr( $nota_group['os'] ); ?>">
					<div class="dl-group__os">
						<?php echo nota_icon( $nota_group['icon'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
						<h3 class="dl-group__name"><?php echo esc_html( $nota_group['name'] ); ?></h3>
						<span class="dl-group__yours" hidden><?php echo esc_html( nota_ui( 'yours' ) ); ?></span>
					</div>
					<ul class="dl-group__files">
						<?php foreach ( $nota_group['files'] as $nota_file ) : ?>
							<li>
								<a class="dl-file" href="<?php echo esc_url( $nota_file['url'] ); ?>" rel="noopener"<?php echo nota_track_download( $nota_file['platform'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in nota_track_download(). ?>>
									<span class="dl-file__label"><?php nota_text( $nota_file['label'] ); ?></span>
									<span class="dl-file__meta"><?php nota_text( $nota_file['meta'] ); ?></span>
									<?php echo nota_icon( 'download-simple' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
								</a>
							</li>
						<?php endforeach; ?>
					</ul>
					<?php if ( '' !== nota_t( $nota_group['note'] ) ) : ?>
						<details class="dl-group__note">
							<summary>
								<?php nota_text( 'dl_first_launch' ); ?>
								<?php echo nota_icon( 'caret-down' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
							</summary>
							<p><?php nota_html( $nota_group['note'] ); ?></p>
						</details>
					<?php endif; ?>
				</div>
			<?php endforeach; ?>
		</div>

		<div class="download__foot">
			<?php if ( '' !== nota_t( 'download_all' ) ) : ?>
				<a class="text-link" href="<?php echo esc_url( $nota_github . '/releases' ); ?>" rel="noopener">
					<?php nota_text( 'download_all' ); ?>
					<?php echo nota_icon( 'arrow-up-right' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
				</a>
			<?php endif; ?>
			<?php nota_field( 'download_tested', 'p', 'small-print' ); ?>
			<?php if ( '' !== nota_t( 'download_issue' ) ) : ?>
				<a class="text-link" href="<?php echo esc_url( $nota_github . '/issues/new' ); ?>" rel="noopener">
					<?php nota_text( 'download_issue' ); ?>
					<?php echo nota_icon( 'arrow-up-right' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
				</a>
			<?php endif; ?>
		</div>
	</div>
</section>
