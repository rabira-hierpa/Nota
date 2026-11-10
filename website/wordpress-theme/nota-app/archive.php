<?php
/**
 * Posts by category, tag, author or date.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="page-shell">
	<div class="wrap wrap--text">
		<?php the_archive_title( '<h1 class="page-title">', '</h1>' ); ?>
		<?php the_archive_description( '<div class="prose page-intro">', '</div>' ); ?>
		<?php get_template_part( 'template-parts/post-list' ); ?>
	</div>
</main>
<?php
get_footer();
