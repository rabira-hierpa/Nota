<?php
/**
 * The search form.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

$nota_search_id = wp_unique_id( 'search-' );
?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="<?php echo esc_attr( $nota_search_id ); ?>"><?php echo esc_html( nota_ui( 'search' ) ); ?></label>
	<input id="<?php echo esc_attr( $nota_search_id ); ?>" class="search-form__input" type="search" name="s" value="<?php echo esc_attr( get_search_query( false ) ); ?>">
	<button class="button button--quiet" type="submit">
		<?php echo nota_icon( 'magnifying-glass' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file shipped with the theme. ?>
		<?php echo esc_html( nota_ui( 'search' ) ); ?>
	</button>
</form>
