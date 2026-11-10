<?php
/**
 * Comments under a post or page.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

if ( post_password_required() ) {
	return;
}
?>
<section class="comments" id="comments" aria-labelledby="comments-title">
	<?php if ( have_comments() ) : ?>
		<h2 class="block-title" id="comments-title"><?php echo esc_html( nota_ui( 'comments' ) ); ?></h2>
		<ol class="comments__list">
			<?php
			wp_list_comments(
				array(
					'style'      => 'ol',
					'short_ping' => true,
				)
			);
			?>
		</ol>
		<?php the_comments_pagination(); ?>
	<?php endif; ?>
	<?php comment_form(); ?>
</section>
