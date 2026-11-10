<?php
/**
 * One post.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="page-shell">
	<?php
	while ( have_posts() ) :
		the_post();
		$nota_builder = nota_is_builder_page();
		?>
		<article <?php post_class(); ?>>
			<?php if ( $nota_builder ) : ?>
				<?php the_content(); ?>
			<?php else : ?>
				<div class="wrap wrap--text">
					<h1 class="page-title"><?php the_title(); ?></h1>
					<p class="post-card__meta"><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time></p>
					<?php if ( has_post_thumbnail() ) : ?>
						<figure class="post-thumb"><?php the_post_thumbnail( 'large' ); ?></figure>
					<?php endif; ?>
					<div class="prose">
						<?php
						the_content();
						wp_link_pages();
						?>
					</div>
					<?php the_tags( '<p class="post-tags">', ' ', '</p>' ); ?>
					<?php the_post_navigation(); ?>
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
