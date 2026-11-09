<?php
/**
 * The landing page. WordPress prefers this file for the home page whatever
 * Settings, Reading says, so activating the theme is all the setup there is.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="landing">
	<?php
	foreach ( array( 'hero', 'proof', 'speech', 'notes', 'privacy', 'devices', 'download', 'faq' ) as $nota_part ) {
		get_template_part( 'template-parts/landing/' . $nota_part );
	}
	?>
</main>
<?php
get_footer();
