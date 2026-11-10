<?php
/**
 * Landing page: what Nota is.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;
?>
<section class="hero" aria-labelledby="hero-title">
	<div class="wrap hero__grid">
		<?php nota_field( 'hero_title', 'h1', 'hero__title', 'hero-title' ); ?>
		<div class="hero__side">
			<?php nota_field( 'hero_text', 'p', 'hero__text' ); ?>
			<div class="hero__actions">
				<a class="button button--primary" href="#download">
					<?php echo nota_icon( 'download-simple' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
					<?php nota_text( 'cta_download' ); ?>
				</a>
				<?php if ( '' !== nota_t( 'hero_secondary' ) ) : ?>
					<a class="button button--quiet" href="#speech">
						<?php nota_text( 'hero_secondary' ); ?>
						<?php echo nota_icon( 'arrow-down' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
					</a>
				<?php endif; ?>
			</div>
		</div>
	</div>
	<div class="wrap">
		<figure class="frame hero__shot<?php echo esc_attr( nota_shot_crop( 'main' ) ); ?>">
			<?php
			nota_shot(
				'main',
				nota_plain( 'hero_alt' ),
				array(
					'sizes' => '(max-width: 620px) 230vw, (min-width: 1320px) 1240px, calc(100vw - 40px)',
					'eager' => true,
				)
			);
			?>
		</figure>
	</div>
</section>
