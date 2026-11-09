<?php
/**
 * Landing page: questions. The ones with both fields filled in show here, and in
 * the page's structured data.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_faqs = nota_faqs();
if ( ! $nota_faqs ) {
	return;
}
?>
<section class="faq" id="faq" aria-labelledby="faq-title">
	<div class="wrap">
		<?php nota_field( 'faq_title', 'h2', 'section-title', 'faq-title' ); ?>
		<div class="faq__list">
			<?php foreach ( $nota_faqs as $nota_faq ) : ?>
				<details class="faq__item">
					<summary>
						<span><?php echo wp_kses( $nota_faq['q'], nota_allowed_html() ); ?></span>
						<?php echo nota_icon( 'caret-down' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
					</summary>
					<p><?php echo wp_kses( $nota_faq['a'], nota_allowed_html() ); ?></p>
				</details>
			<?php endforeach; ?>
		</div>
	</div>
</section>
