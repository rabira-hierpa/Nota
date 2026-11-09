<?php
/**
 * The loop for every listing of posts.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

if ( have_posts() ) :
	?>
	<div class="post-list">
		<?php
		while ( have_posts() ) :
			the_post();
			?>
			<article <?php post_class( 'post-card' ); ?>>
				<h2 class="post-card__title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
				<p class="post-card__meta"><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time></p>
				<div class="prose post-card__excerpt"><?php the_excerpt(); ?></div>
			</article>
		<?php endwhile; ?>
	</div>
	<?php
	the_posts_pagination(
		array(
			'aria_label' => nota_ui( 'pages' ),
			'prev_text'  => '&larr;',
			'next_text'  => '&rarr;',
		)
	);
else :
	?>
	<p class="page-intro"><?php echo esc_html( nota_ui( 'no_results' ) ); ?></p>
	<?php
endif;
