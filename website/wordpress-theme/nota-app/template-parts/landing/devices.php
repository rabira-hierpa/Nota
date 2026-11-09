<?php
/**
 * Landing page: desktop and phone, and exactly what the phone takes today.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_android = nota_opt( 'android_url' );
$nota_ios     = nota_opt( 'ios_url' );
$nota_guide   = nota_opt( 'phone_guide_url' );
$nota_email   = nota_opt( 'email' );
$nota_signup  = (string) get_theme_mod( 'nota_signup_shortcode', '' );
?>
<section class="devices" id="devices" aria-labelledby="devices-title">
	<div class="wrap devices__grid">
		<div class="devices__text">
			<?php nota_field( 'devices_title', 'h2', 'section-title', 'devices-title' ); ?>

			<div class="device">
				<span class="icon-badge"><?php echo nota_icon( 'desktop' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				<div>
					<?php nota_field( 'desktop_title', 'h3', 'block-title' ); ?>
					<?php nota_field( 'desktop_text', 'p', 'block-text' ); ?>
					<?php nota_field( 'desktop_needs', 'p', 'small-print' ); ?>
				</div>
			</div>

			<div class="device">
				<span class="icon-badge"><?php echo nota_icon( 'device-mobile' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				<div>
					<?php nota_field( 'phone_title', 'h3', 'block-title' ); ?>
					<?php nota_field( 'phone_text', 'p', 'block-text' ); ?>
					<?php nota_field( 'phone_caveat', 'p', 'caveat' ); ?>
					<div class="device__actions">
						<?php if ( '' !== $nota_android ) : ?>
							<a class="button button--primary" href="<?php echo esc_url( $nota_android ); ?>" rel="noopener"<?php echo nota_track_download( 'android' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in nota_track_download(). ?>><?php nota_text( 'phone_android' ); ?></a>
						<?php endif; ?>
						<?php if ( '' !== $nota_ios ) : ?>
							<a class="button button--primary" href="<?php echo esc_url( $nota_ios ); ?>" rel="noopener"<?php echo nota_track_download( 'ios' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in nota_track_download(). ?>><?php nota_text( 'phone_ios' ); ?></a>
						<?php endif; ?>
						<?php if ( '' !== $nota_guide && '' !== nota_t( 'phone_guide' ) ) : ?>
							<a class="text-link" href="<?php echo esc_url( $nota_guide ); ?>" rel="noopener">
								<?php nota_text( 'phone_guide' ); ?>
								<?php echo nota_icon( 'arrow-up-right' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
							</a>
						<?php endif; ?>
						<?php if ( '' !== $nota_email && '' !== nota_t( 'phone_notify' ) ) : ?>
							<a class="text-link" href="<?php echo esc_url( 'mailto:' . antispambot( $nota_email ) . '?subject=Nota%20for%20phones' ); ?>">
								<?php nota_text( 'phone_notify' ); ?>
								<?php echo nota_icon( 'envelope-simple' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
							</a>
						<?php endif; ?>
					</div>
					<?php if ( '' !== $nota_signup ) : ?>
						<div class="device__signup"><?php echo do_shortcode( $nota_signup ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- The form plugin's own output. ?></div>
					<?php endif; ?>
				</div>
			</div>
		</div>

		<div class="phones">
			<figure class="phone phone--back">
				<?php nota_shot( 'phone-home', nota_plain( 'phone_home_alt' ), array( 'sizes' => '(min-width: 900px) 280px, 42vw' ) ); ?>
			</figure>
			<figure class="phone phone--front">
				<?php nota_shot( 'phone-note', nota_plain( 'phone_note_alt' ), array( 'sizes' => '(min-width: 900px) 280px, 42vw' ) ); ?>
			</figure>
		</div>
	</div>
</section>
