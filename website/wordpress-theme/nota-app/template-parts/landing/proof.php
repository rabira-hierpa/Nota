<?php
/**
 * Landing page: why a model made for Amharic matters, with the published numbers.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_models = nota_opt( 'models_url' );
?>
<section class="proof" aria-labelledby="proof-title">
	<div class="wrap proof__grid">
		<?php nota_field( 'proof_title', 'h2', 'section-title proof__title', 'proof-title' ); ?>
		<dl class="stats">
			<div class="stat stat--good">
				<dt class="stat__number"><?php nota_text( 'proof_good' ); ?></dt>
				<dd class="stat__text"><?php nota_html( 'proof_good_text' ); ?></dd>
			</div>
			<div class="stat">
				<dt class="stat__number"><?php nota_text( 'proof_bad' ); ?></dt>
				<dd class="stat__text"><?php nota_html( 'proof_bad_text' ); ?></dd>
			</div>
		</dl>
		<div class="proof__foot">
			<?php nota_field( 'proof_note', 'p', 'proof__note' ); ?>
			<?php if ( '' !== $nota_models && '' !== nota_t( 'proof_link' ) ) : ?>
				<a class="text-link" href="<?php echo esc_url( $nota_models ); ?>" rel="noopener">
					<?php nota_text( 'proof_link' ); ?>
					<?php echo nota_icon( 'arrow-up-right' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
				</a>
			<?php endif; ?>
		</div>
	</div>
</section>
