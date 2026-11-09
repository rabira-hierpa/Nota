<?php
/**
 * Template Name: Nota release notes
 *
 * Every version's notes from GitHub. The heading and the text under it are in the
 * Customizer (Nota landing page, Release notes page), in both languages; anything
 * written in the page itself shows under them.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="page-shell releases-page">
	<div class="wrap">
		<header class="releases-page__head">
			<?php if ( '' !== trim( nota_t( 'releases_title' ) ) ) : ?>
				<?php nota_field( 'releases_title', 'h1', 'page-title' ); ?>
			<?php else : ?>
				<h1 class="page-title"><?php echo esc_html( get_the_title( get_queried_object_id() ) ); ?></h1>
			<?php endif; ?>
			<?php nota_field( 'releases_intro', 'p', 'page-intro' ); ?>
			<?php
			while ( have_posts() ) :
				the_post();
				if ( '' !== trim( (string) get_the_content() ) ) :
					?>
					<div class="prose releases-page__text"><?php the_content(); ?></div>
					<?php
				endif;
			endwhile;
			?>
		</header>
		<?php nota_render_releases( 10 ); ?>
	</div>
</main>
<?php
get_footer();
