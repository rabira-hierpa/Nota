<?php
/**
 * Landing page: a band of short phrases that drifts sideways under the top.
 * It moves only once site.js says so (never with motion reduced, nor without a
 * script), and its button stops it. The second copy of the list, there so the
 * loop has no seam, is hidden from screen readers. A phrase in the page's other
 * language says so, for screen readers and fonts.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_phrases = array_values( array_filter( array_map( 'trim', preg_split( '/\R/', nota_t( 'ticker_items' ) ) ) ) );
if ( ! $nota_phrases ) {
	return;
}
?>
<div class="ticker" data-ticker>
	<div class="ticker__track">
		<?php foreach ( array( false, true ) as $nota_copy ) : ?>
			<ul class="ticker__list"<?php echo $nota_copy ? ' aria-hidden="true"' : ''; ?>>
				<?php foreach ( $nota_phrases as $nota_phrase ) : ?>
					<?php $nota_phrase_lang = preg_match( '/\p{Ethiopic}/u', $nota_phrase ) ? 'am' : 'en'; ?>
					<li<?php echo nota_lang() !== $nota_phrase_lang ? ' lang="' . esc_attr( $nota_phrase_lang ) . '"' : ''; ?>><?php echo esc_html( $nota_phrase ); ?></li>
				<?php endforeach; ?>
			</ul>
		<?php endforeach; ?>
	</div>
	<button class="icon-button ticker__toggle" type="button" data-ticker-toggle aria-pressed="false" aria-label="<?php echo esc_attr( nota_ui( 'ticker_pause' ) ); ?>" hidden>
		<span class="ticker__pause"><?php echo nota_icon( 'pause' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
		<span class="ticker__play"><?php echo nota_icon( 'play' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
	</button>
</div>
