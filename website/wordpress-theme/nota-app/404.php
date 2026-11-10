<?php
/**
 * A page that doesn't exist.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="page-shell">
	<div class="wrap wrap--text">
		<h1 class="page-title"><?php echo esc_html( nota_ui( 'not_found' ) ); ?></h1>
		<p class="page-intro"><?php echo esc_html( nota_ui( 'not_found_text' ) ); ?></p>
		<?php get_search_form(); ?>
		<p class="page-back"><a class="button button--primary" href="<?php echo esc_url( nota_lang_url( nota_lang() ) ); ?>"><?php echo esc_html( nota_ui( 'back_home' ) ); ?></a></p>
	</div>
</main>
<?php
get_footer();
