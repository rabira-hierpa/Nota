<?php
/**
 * The site footer.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

// Elementor Pro's Theme Builder may replace the footer, but never on the landing page.
if ( nota_is_landing() || ! function_exists( 'elementor_theme_do_location' ) || ! elementor_theme_do_location( 'footer' ) ) :
	$nota_social = array(
		array( nota_opt( 'github_url' ), 'github-logo', 'GitHub' ),
		array( nota_opt( 'facebook_url' ), 'facebook-logo', 'Facebook' ),
		array( nota_opt( 'instagram_url' ), 'instagram-logo', 'Instagram' ),
		array( nota_opt( 'tiktok_url' ), 'tiktok-logo', 'TikTok' ),
	);
	$nota_email  = nota_opt( 'email' );
	?>
<footer class="site-footer">
	<div class="wrap site-footer__grid">
		<div class="site-footer__about">
			<a class="brand" href="<?php echo esc_url( nota_lang_url( nota_lang() ) ); ?>">
				<?php nota_logo(); ?>
				<span class="brand__name">Nota</span>
			</a>
			<?php nota_field( 'footer_tagline', 'p', 'site-footer__tagline' ); ?>
		</div>

		<div class="site-footer__contact">
			<?php nota_field( 'footer_contact', 'h2', 'site-footer__heading' ); ?>
			<?php if ( '' !== $nota_email ) : ?>
				<a class="site-footer__email" href="<?php echo esc_url( 'mailto:' . antispambot( $nota_email ) ); ?>">
					<?php echo nota_icon( 'envelope-simple' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
					<span><?php echo esc_html( antispambot( $nota_email ) ); ?></span>
				</a>
			<?php endif; ?>
			<ul class="site-footer__social">
				<?php foreach ( $nota_social as $nota_item ) : ?>
					<?php if ( '' !== $nota_item[0] ) : ?>
						<li>
							<a class="icon-button" href="<?php echo esc_url( $nota_item[0] ); ?>" aria-label="<?php echo esc_attr( $nota_item[2] ); ?>" rel="noopener">
								<?php echo nota_icon( $nota_item[1] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
							</a>
						</li>
					<?php endif; ?>
				<?php endforeach; ?>
			</ul>
		</div>

		<?php if ( has_nav_menu( 'nota-footer' ) ) : ?>
			<nav class="site-footer__menu" aria-label="<?php echo esc_attr( nota_ui( 'footer_nav' ) ); ?>">
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'nota-footer',
						'container'      => false,
						'depth'          => 1,
						'fallback_cb'    => false,
					)
				);
				?>
			</nav>
		<?php endif; ?>

		<?php nota_field( 'footer_credit', 'p', 'site-footer__credit' ); ?>
	</div>
</footer>
<?php endif; ?>
<?php wp_footer(); ?>
</body>
</html>
