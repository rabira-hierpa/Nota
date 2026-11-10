<?php
/**
 * One page. A page built with Elementor gets the whole width and no theme title.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="page-shell<?php echo nota_is_builder_page() ? ' page-shell--builder' : ''; ?>">
	<?php
	while ( have_posts() ) :
		the_post();
		?>
		<article <?php post_class(); ?>>
			<?php if ( nota_is_builder_page() ) : ?>
				<?php the_content(); ?>
			<?php else : ?>
				<div class="wrap wrap--text">
					<h1 class="page-title"><?php the_title(); ?></h1>
					<div class="prose">
						<?php
						the_content();
						wp_link_pages();
						?>
					</div>
					<?php
					if ( comments_open() || get_comments_number() ) {
						comments_template();
					}
					?>
				</div>
			<?php endif; ?>
		</article>
	<?php endwhile; ?>
</main>
<?php
get_footer();
