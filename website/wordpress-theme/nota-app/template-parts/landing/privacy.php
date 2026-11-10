<?php
/**
 * Landing page: where the notes live.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_items = array(
	array( 'wifi-slash', 'privacy_net_title', 'privacy_net_text' ),
	array( 'folder-open', 'privacy_files_title', 'privacy_files_text' ),
	array( 'lock-key', 'privacy_lock_title', 'privacy_lock_text' ),
	array( 'code', 'privacy_code_title', 'privacy_code_text' ),
);
?>
<section class="privacy" id="privacy" aria-labelledby="privacy-title">
	<div class="wrap privacy__grid">
		<?php nota_field( 'privacy_title', 'h2', 'section-title privacy__title', 'privacy-title' ); ?>
		<ul class="privacy__list">
			<?php foreach ( $nota_items as $nota_item ) : ?>
				<li class="privacy__item">
					<span class="icon-badge"><?php echo nota_icon( $nota_item[0] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
					<div>
						<?php nota_field( $nota_item[1], 'h3', 'block-title' ); ?>
						<?php nota_field( $nota_item[2], 'p', 'block-text' ); ?>
						<?php if ( 'code' === $nota_item[0] && '' !== nota_t( 'privacy_code_link' ) ) : ?>
							<a class="text-link" href="<?php echo esc_url( nota_opt( 'github_url' ) ); ?>" rel="noopener">
								<?php nota_text( 'privacy_code_link' ); ?>
								<?php echo nota_icon( 'arrow-up-right' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
							</a>
						<?php endif; ?>
					</div>
				</li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>
