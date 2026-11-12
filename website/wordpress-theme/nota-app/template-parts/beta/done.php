<?php
/**
 * After a sign-up: the same thanks for everyone, so a cache can keep it. A new
 * sign-up lands on #signed-up, which is what the page's script counts.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;
?>
<div class="beta-done" id="signed-up" data-beta-done>
	<span class="icon-badge"><?php echo nota_icon( 'check' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
	<?php nota_field( 'beta_done_title', 'h2', 'beta-done__title' ); ?>
	<?php nota_field( 'beta_done_text', 'p', 'beta-done__text' ); ?>
	<p class="beta-done__links">
		<a class="text-link" href="<?php echo esc_url( nota_beta_return_url() . '#signup' ); ?>"><?php echo esc_html( nota_ui( 'beta_again' ) ); ?></a>
		<?php if ( nota_landing_enabled() ) : ?>
			<a class="text-link" href="<?php echo esc_url( nota_lang_url( nota_lang() ) ); ?>"><?php echo esc_html( nota_ui( 'beta_more' ) ); ?></a>
		<?php endif; ?>
	</p>
</div>
