<?php
/**
 * Landing page: one last call to download, above the footer. Emptying its
 * headline hides it.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

if ( '' === trim( nota_t( 'closing_title' ) ) ) {
	return;
}

$nota_guide = nota_opt( 'phone_guide_url' );
?>
<section class="closing" aria-labelledby="closing-title">
	<div class="wrap">
		<div class="closing__panel">
			<div class="closing__logo"><?php nota_logo(); ?></div>
			<?php nota_field( 'closing_title', 'h2', 'section-title closing__title', 'closing-title' ); ?>
			<?php nota_field( 'closing_text', 'p', 'closing__text' ); ?>
			<div class="closing__actions">
				<a class="button button--primary" href="#download">
					<?php echo nota_icon( 'download-simple' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
					<?php nota_text( 'cta_download' ); ?>
				</a>
				<?php if ( '' !== $nota_guide && '' !== nota_t( 'phone_guide' ) ) : ?>
					<a class="button button--quiet" href="<?php echo esc_url( $nota_guide ); ?>" rel="noopener">
						<?php nota_text( 'phone_guide' ); ?>
						<?php echo nota_icon( 'arrow-up-right' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
					</a>
				<?php endif; ?>
			</div>
		</div>
	</div>
</section>
