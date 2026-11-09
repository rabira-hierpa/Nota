<?php
/**
 * A list of posts: the blog, and the fallback for any other listing.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="page-shell">
	<div class="wrap wrap--text">
		<?php if ( is_home() && ! is_front_page() ) : ?>
			<h1 class="page-title"><?php single_post_title(); ?></h1>
		<?php endif; ?>
		<?php get_template_part( 'template-parts/post-list' ); ?>
	</div>
</main>
<?php
get_footer();
