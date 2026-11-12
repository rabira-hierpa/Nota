<?php
/**
 * Landing page: dictating into other apps, with the desktop's pill and the
 * Android floating mic. The two pictures are drawn in HTML, after the app's own
 * pill (src/features/notes/components/dictation-pill/) and bubble
 * (mobile/android/.../floatingmic/BubbleView.kt), and are hidden from screen
 * readers: the text beside each says what it shows.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_steps  = array_filter(
	array( 1, 2, 3 ),
	static function ( $number ) {
		return '' !== trim( nota_t( "step_{$number}_title" ) . nota_t( "step_{$number}_text" ) );
	}
);
$nota_sample = nota_t( 'anywhere_sample' );
?>
<section class="anywhere" id="anywhere" aria-labelledby="anywhere-title">
	<div class="wrap">
		<div class="anywhere__head">
			<?php nota_field( 'anywhere_badge', 'p', 'badge' ); ?>
			<?php nota_field( 'anywhere_title', 'h2', 'section-title', 'anywhere-title' ); ?>
			<?php nota_field( 'anywhere_text', 'p', 'anywhere__text' ); ?>
		</div>

		<?php if ( $nota_steps ) : ?>
			<ol class="steps">
				<?php foreach ( $nota_steps as $nota_number ) : ?>
					<li class="step">
						<span class="step__number" aria-hidden="true"><?php echo esc_html( (string) $nota_number ); ?></span>
						<?php nota_field( "step_{$nota_number}_title", 'h3', 'block-title' ); ?>
						<?php nota_field( "step_{$nota_number}_text", 'p', 'block-text' ); ?>
					</li>
				<?php endforeach; ?>
			</ol>
		<?php endif; ?>

		<div class="ways">
			<article class="way">
				<div class="way__picture way__picture--desk" aria-hidden="true">
					<div class="mock-window">
						<div class="mock-window__bar"><i></i><i></i><i></i></div>
						<div class="mock-window__body">
							<span class="mock-line mock-line--short"></span>
							<span class="mock-line"></span>
							<p class="mock-typed" lang="am"><?php echo esc_html( $nota_sample ); ?><span class="mock-caret"></span></p>
						</div>
					</div>
					<div class="mock-pill">
						<span class="mock-pill__dot"></span>
						<span class="mock-pill__bars"><i></i><i></i><i></i><i></i><i></i></span>
						<span class="mock-pill__word"><?php nota_text( 'anywhere_listening' ); ?></span>
						<span class="mock-pill__time" lang="en">0:04</span>
					</div>
				</div>
				<div class="way__copy">
					<span class="icon-badge"><?php echo nota_icon( 'desktop' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
					<?php nota_field( 'anywhere_desktop_title', 'h3', 'block-title' ); ?>
					<?php nota_field( 'anywhere_desktop_text', 'p', 'block-text' ); ?>
					<?php nota_field( 'anywhere_desktop_small', 'p', 'small-print' ); ?>
				</div>
			</article>

			<article class="way">
				<div class="way__picture way__picture--phone" aria-hidden="true">
					<div class="mock-phone">
						<span class="mock-message mock-message--in"></span>
						<span class="mock-message mock-message--in mock-message--short"></span>
						<span class="mock-message mock-message--out"></span>
						<div class="mock-field">
							<p class="mock-typed" lang="am"><?php echo esc_html( $nota_sample ); ?><span class="mock-caret"></span></p>
						</div>
						<span class="mock-bubble"><?php echo nota_icon( 'microphone' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
					</div>
				</div>
				<div class="way__copy">
					<span class="icon-badge"><?php echo nota_icon( 'device-mobile' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
					<?php nota_field( 'anywhere_phone_title', 'h3', 'block-title' ); ?>
					<?php nota_field( 'anywhere_phone_text', 'p', 'block-text' ); ?>
					<?php nota_field( 'anywhere_phone_small', 'p', 'small-print' ); ?>
				</div>
			</article>
		</div>
	</div>
</section>
