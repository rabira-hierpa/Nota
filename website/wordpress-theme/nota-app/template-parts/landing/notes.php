<?php
/**
 * Landing page: what the notes app does, in tiles of different sizes.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;
?>
<section class="notes" id="notes" aria-labelledby="notes-title">
	<div class="wrap">
		<?php nota_field( 'notes_title', 'h2', 'section-title notes__title', 'notes-title' ); ?>

		<div class="bento">
			<div class="tile tile--tags">
				<div class="tile__text">
					<span class="icon-badge"><?php echo nota_icon( 'hash' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
					<?php nota_field( 'tags_title', 'h3', 'block-title' ); ?>
					<?php nota_field( 'tags_text', 'p', 'block-text' ); ?>
				</div>
				<figure class="tile__sidebar<?php echo esc_attr( nota_shot_crop( 'tags' ) ); ?>">
					<?php nota_shot( 'tags', nota_plain( 'tags_alt' ), array( 'sizes' => '260px' ) ); ?>
				</figure>
			</div>

			<div class="tile tile--calendar">
				<div class="tile__text">
					<span class="icon-badge"><?php echo nota_icon( 'calendar-dots' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
					<?php nota_field( 'calendar_title', 'h3', 'block-title' ); ?>
					<?php nota_field( 'calendar_text', 'p', 'block-text' ); ?>
					<div class="today">
						<?php nota_field( 'calendar_today', 'p', 'today__label' ); ?>
						<p class="today__ethiopian" lang="am" data-ethiopian-today><?php echo esc_html( nota_ethiopian_today() ); ?></p>
						<p class="today__gregorian" data-gregorian-today><?php echo esc_html( wp_date( 'j F Y' ) ); ?></p>
					</div>
				</div>
				<figure class="tile__panel">
					<?php nota_shot( 'calendar', nota_plain( 'calendar_alt' ), array( 'sizes' => '(min-width: 900px) 330px, calc(100vw - 80px)' ) ); ?>
				</figure>
			</div>

			<div class="tile tile--zen">
				<figure class="tile__picture<?php echo esc_attr( nota_shot_crop( 'zen' ) ); ?>">
					<?php nota_shot( 'zen', nota_plain( 'zen_alt' ), array( 'sizes' => '(max-width: 620px) 210vw, (min-width: 900px) 58vw, calc(100vw - 40px)' ) ); ?>
				</figure>
				<div class="tile__text tile__text--row">
					<?php nota_field( 'zen_title', 'h3', 'block-title' ); ?>
					<?php nota_field( 'zen_text', 'p', 'block-text' ); ?>
				</div>
			</div>

			<div class="tile tile--write">
				<span class="icon-badge"><?php echo nota_icon( 'code-simple' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				<?php nota_field( 'write_title', 'h3', 'block-title' ); ?>
				<?php nota_field( 'write_text', 'p', 'block-text' ); ?>
			</div>

			<div class="tile tile--fonts">
				<span class="icon-badge"><?php echo nota_icon( 'text-aa' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				<?php nota_field( 'fonts_title', 'h3', 'block-title' ); ?>
				<?php nota_field( 'fonts_text', 'p', 'block-text' ); ?>
			</div>

			<div class="tile tile--assist">
				<span class="icon-badge"><?php echo nota_icon( 'sparkle' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				<?php nota_field( 'assist_title', 'h3', 'block-title' ); ?>
				<?php nota_field( 'assist_text', 'p', 'block-text' ); ?>
			</div>
		</div>

		<?php nota_field( 'notes_more', 'p', 'notes__more' ); ?>
	</div>
</section>
