<?php
/**
 * Search results.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="page-shell">
	<div class="wrap wrap--text">
		<h1 class="page-title"><?php echo esc_html( sprintf( nota_ui( 'results_for' ), get_search_query( false ) ) ); ?></h1>
		<?php get_search_form(); ?>
		<?php get_template_part( 'template-parts/post-list' ); ?>
	</div>
</main>
<?php
get_footer();
