<?php
/**
 * Template Name: Nota beta sign-up
 *
 * The form for people who want to test Nota. Its words are in the Customizer
 * (Nota landing page, Beta sign-up page), in both languages; anything written in
 * the page itself shows under the text at the top. Sign-ups are under Beta testers
 * in wp-admin.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<main id="content" class="page-shell beta-page">
	<div class="wrap beta">
		<div class="beta__about">
			<?php if ( '' !== trim( nota_t( 'beta_title' ) ) ) : ?>
				<?php nota_field( 'beta_title', 'h1', 'page-title' ); ?>
			<?php else : ?>
				<h1 class="page-title"><?php echo esc_html( get_the_title( get_queried_object_id() ) ); ?></h1>
			<?php endif; ?>
			<?php nota_field( 'beta_intro', 'p', 'page-intro beta__intro' ); ?>
			<?php
			while ( have_posts() ) :
				the_post();
				if ( '' !== trim( (string) get_the_content() ) ) :
					?>
					<div class="prose beta__text"><?php the_content(); ?></div>
					<?php
				endif;
			endwhile;

			$nota_steps = array_filter(
				array( 'beta_step_1', 'beta_step_2', 'beta_step_3' ),
				static function ( $key ) {
					return '' !== trim( nota_t( $key ) );
				}
			);
			?>
			<?php if ( $nota_steps ) : ?>
				<?php nota_field( 'beta_steps_title', 'h2', 'beta__steps-title', 'beta-steps-title' ); ?>
				<ol class="beta__steps" aria-labelledby="beta-steps-title">
					<?php foreach ( $nota_steps as $nota_step ) : ?>
						<li><?php nota_html( $nota_step ); ?></li>
					<?php endforeach; ?>
				</ol>
			<?php endif; ?>
		</div>
		<section class="beta__panel" id="signup" aria-label="<?php echo esc_attr( nota_ui( 'beta_form' ) ); ?>">
			<?php nota_render_beta(); ?>
		</section>
	</div>
</main>
<?php
get_footer();
