<?php
/**
 * The page's head and the site header.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_lang = nota_lang();
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#content"><?php echo esc_html( nota_ui( 'skip' ) ); ?></a>
<?php
// Elementor Pro's Theme Builder may replace the header, but not on the theme's own pages
// (landing, releases, beta), which leave Elementor's styles and scripts out.
if ( nota_is_bilingual() || ! function_exists( 'elementor_theme_do_location' ) || ! elementor_theme_do_location( 'header' ) ) :
	?>
<header class="site-header">
	<div class="wrap site-header__row">
		<a class="brand" href="<?php echo esc_url( nota_lang_url( $nota_lang ) ); ?>">
			<?php nota_logo(); ?>
			<span class="brand__name">Nota</span>
		</a>

		<nav class="site-nav" aria-label="<?php echo esc_attr( nota_ui( 'main_nav' ) ); ?>">
			<ul class="site-nav__list">
				<?php if ( nota_landing_enabled() ) : ?>
					<?php foreach ( nota_nav_items() as $nota_id => $nota_key ) : ?>
						<li><a href="<?php echo esc_url( nota_section_url( $nota_id ) ); ?>"><?php nota_text( $nota_key ); ?></a></li>
					<?php endforeach; ?>
				<?php endif; ?>
				<?php
				if ( has_nav_menu( 'nota-extra' ) ) {
					wp_nav_menu(
						array(
							'theme_location' => 'nota-extra',
							'container'      => false,
							'items_wrap'     => '%3$s',
							'depth'          => 1,
							'fallback_cb'    => false,
						)
					);
				}
				?>
			</ul>
		</nav>

		<div class="site-header__tools">
			<?php
			// Each language switch is a plain link, so it works with no script and each page can be cached.
			?>
			<ul class="lang-switch" aria-label="<?php echo esc_attr( nota_ui( 'language' ) ); ?>">
				<li><a href="<?php echo esc_url( nota_page_lang_url( 'en' ) ); ?>" hreflang="en" lang="en"<?php echo 'en' === $nota_lang ? ' aria-current="true"' : ''; ?>>EN</a></li>
				<li><a href="<?php echo esc_url( nota_page_lang_url( 'am' ) ); ?>" hreflang="am" lang="am"<?php echo 'am' === $nota_lang ? ' aria-current="true"' : ''; ?>>አማ</a></li>
			</ul>

			<button class="icon-button theme-toggle" type="button" data-theme-toggle aria-label="<?php echo esc_attr( nota_ui( 'theme' ) ); ?>">
				<span class="theme-toggle__sun"><?php echo nota_icon( 'sun' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				<span class="theme-toggle__moon"><?php echo nota_icon( 'moon' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
			</button>

			<?php if ( nota_landing_enabled() ) : ?>
				<a class="button button--primary site-header__cta" href="<?php echo esc_url( nota_section_url( 'download' ) ); ?>"><?php nota_text( 'cta_download' ); ?></a>
			<?php endif; ?>

			<details class="menu-sheet">
				<summary class="icon-button" aria-label="<?php echo esc_attr( nota_ui( 'menu' ) ); ?>">
					<span class="menu-sheet__open"><?php echo nota_icon( 'list' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
					<span class="menu-sheet__close"><?php echo nota_icon( 'x' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?></span>
				</summary>
				<nav class="menu-sheet__panel" aria-label="<?php echo esc_attr( nota_ui( 'menu' ) ); ?>">
					<ul>
						<?php if ( nota_landing_enabled() ) : ?>
							<?php foreach ( nota_nav_items() as $nota_id => $nota_key ) : ?>
								<li><a href="<?php echo esc_url( nota_section_url( $nota_id ) ); ?>"><?php nota_text( $nota_key ); ?></a></li>
							<?php endforeach; ?>
						<?php endif; ?>
						<?php
						if ( has_nav_menu( 'nota-extra' ) ) {
							wp_nav_menu(
								array(
									'theme_location' => 'nota-extra',
									'container'      => false,
									'items_wrap'     => '%3$s',
									'depth'          => 1,
									'fallback_cb'    => false,
								)
							);
						}
						?>
					</ul>
					<?php if ( nota_landing_enabled() ) : ?>
						<a class="button button--primary" href="<?php echo esc_url( nota_section_url( 'download' ) ); ?>"><?php nota_text( 'cta_download' ); ?></a>
					<?php endif; ?>
				</nav>
			</details>
		</div>
	</div>
</header>
<?php endif; ?>
