<?php
/**
 * Landing page: dictation, voice notes, and recordings made elsewhere.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_lang = nota_lang();
$nota_clip = array(
	'light' => get_theme_file_uri( "assets/img/dictate-{$nota_lang}-light.mp4" ),
	'dark'  => get_theme_file_uri( "assets/img/dictate-{$nota_lang}-dark.mp4" ),
);
// A picture added in the Customizer replaces the clip.
$nota_has_clip = '' === get_theme_mod( 'nota_img_clip_light', '' ) && '' === get_theme_mod( 'nota_img_clip_dark', '' );
?>
<section class="speech" id="speech" aria-labelledby="speech-title">
	<div class="wrap">
		<?php nota_field( 'speech_title', 'h2', 'section-title speech__title', 'speech-title' ); ?>

		<div class="speech__row speech__row--dictate">
			<figure class="frame clip"<?php echo $nota_has_clip ? ' data-clip' : ''; ?>>
				<?php
				nota_shot(
					'clip',
					nota_plain( 'dictate_alt' ),
					array( 'sizes' => '(min-width: 900px) 58vw, calc(100vw - 40px)' )
				);
				?>
				<?php if ( $nota_has_clip ) : ?>
					<video class="clip__video" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1" data-no-lazy="1" data-light="<?php echo esc_url( $nota_clip['light'] ); ?>" data-dark="<?php echo esc_url( $nota_clip['dark'] ); ?>"></video>
					<button class="icon-button clip__toggle" type="button" data-clip-toggle aria-label="<?php echo esc_attr( nota_ui( 'play' ) ); ?>" data-pause-label="<?php echo esc_attr( nota_ui( 'pause' ) ); ?>" data-play-label="<?php echo esc_attr( nota_ui( 'play' ) ); ?>">
						<span class="clip__pause"><?php echo nota_icon( 'pause' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
						<span class="clip__play"><?php echo nota_icon( 'play' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
					</button>
				<?php endif; ?>
			</figure>
			<div class="speech__copy">
				<span class="icon-badge"><?php echo nota_icon( 'microphone' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				<?php nota_field( 'dictate_title', 'h3', 'block-title' ); ?>
				<?php nota_field( 'dictate_text', 'p', 'block-text' ); ?>
			</div>
		</div>

		<div class="speech__row speech__row--voice">
			<div class="speech__copy">
				<span class="icon-badge"><?php echo nota_icon( 'waveform' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				<?php nota_field( 'voice_title', 'h3', 'block-title' ); ?>
				<?php nota_field( 'voice_text', 'p', 'block-text' ); ?>
			</div>
			<figure class="frame frame--bleed<?php echo esc_attr( nota_shot_crop( 'voice' ) ); ?>">
				<?php
				nota_shot(
					'voice',
					nota_plain( 'voice_alt' ),
					array( 'sizes' => '(max-width: 620px) 170vw, (min-width: 900px) 68vw, calc(100vw - 20px)' )
				);
				?>
			</figure>
		</div>

		<div class="speech__row speech__row--import">
			<div class="speech__import-head">
				<span class="icon-badge"><?php echo nota_icon( 'file-arrow-up' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				<?php nota_field( 'import_title', 'h3', 'block-title' ); ?>
			</div>
			<?php nota_field( 'import_text', 'p', 'block-text' ); ?>
			<ul class="chips" lang="en">
				<?php foreach ( array( 'm4a', 'mp3', 'wav', 'ogg', 'opus', 'flac', 'webm' ) as $nota_format ) : ?>
					<li><?php echo esc_html( $nota_format ); ?></li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
</section>
