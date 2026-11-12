<?php
/**
 * The beta sign-up form. After a mistake it comes back with what was typed and a
 * note under each field that needs fixing, listed again at the top.
 *
 * @package Nota
 *
 * @var array{errors?: array<string, string>, values?: array<string, mixed>} $args
 */

defined( 'ABSPATH' ) || exit;

$nota_errors = isset( $args['errors'] ) ? (array) $args['errors'] : array();
$nota_values = wp_parse_args(
	isset( $args['values'] ) ? (array) $args['values'] : array(),
	array(
		'name'     => '',
		'email'    => '',
		'telegram' => '',
		'devices'  => array(),
		'note'     => '',
		'consent'  => false,
	)
);
$nota_lang   = nota_lang();

/**
 * The attributes that tie a field to its hint and its error.
 *
 * @param string   $field  Field key.
 * @param string[] $hints  Ids of the hints under it.
 * @param string[] $errors This form's errors.
 * @param bool     $input  False for a group of boxes, which can't be invalid itself.
 * @return string Attributes with a space before them, safe to print.
 */
$nota_described = static function ( $field, $hints, $errors, $input = true ) {
	$ids = $hints;
	if ( isset( $errors[ $field ] ) ) {
		$ids[] = "beta-{$field}-error";
	}
	$attributes = $ids ? ' aria-describedby="' . esc_attr( implode( ' ', $ids ) ) . '"' : '';
	return $attributes . ( $input && isset( $errors[ $field ] ) ? ' aria-invalid="true"' : '' );
};

/**
 * Prints a field's error, if it has one.
 *
 * @param string   $field  Field key.
 * @param string[] $errors This form's errors.
 * @return void
 */
$nota_error = static function ( $field, $errors ) {
	if ( isset( $errors[ $field ] ) ) {
		printf( '<p class="field__error" id="beta-%1$s-error">%2$s</p>', esc_attr( $field ), esc_html( $errors[ $field ] ) );
	}
};

$nota_targets = array(
	'name'     => 'beta-name',
	'email'    => 'beta-email',
	'telegram' => 'beta-telegram',
	'devices'  => 'beta-devices',
	'consent'  => 'beta-consent',
);
?>
<?php // The answer's address names the list of mistakes, so the browser scrolls to it and focuses it. ?>
<form class="beta-form" method="post" action="<?php echo esc_url( nota_beta_return_url() . '#beta-errors' ); ?>">
	<?php if ( $nota_errors ) : ?>
		<div class="beta-form__errors" id="beta-errors" role="alert" tabindex="-1" data-beta-errors>
			<?php if ( isset( $nota_errors['form'] ) ) : ?>
				<p><?php echo esc_html( $nota_errors['form'] ); ?></p>
			<?php else : ?>
				<p><?php echo esc_html( nota_ui( 'beta_err_summary' ) ); ?></p>
				<ul>
					<?php foreach ( $nota_targets as $nota_field => $nota_target ) : ?>
						<?php if ( isset( $nota_errors[ $nota_field ] ) ) : ?>
							<li><a href="#<?php echo esc_attr( $nota_target ); ?>"><?php echo esc_html( $nota_errors[ $nota_field ] ); ?></a></li>
						<?php endif; ?>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>
		</div>
	<?php endif; ?>

	<input type="hidden" name="nota_beta" value="1">

	<div class="field">
		<label for="beta-name"><?php echo esc_html( nota_ui( 'beta_name' ) ); ?></label>
		<input id="beta-name" name="nota_beta_name" type="text" autocomplete="name" maxlength="100" required value="<?php echo esc_attr( $nota_values['name'] ); ?>"<?php echo $nota_described( 'name', array(), $nota_errors ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in the closure. ?>>
		<?php $nota_error( 'name', $nota_errors ); ?>
	</div>

	<div class="field">
		<label for="beta-email"><?php echo esc_html( nota_ui( 'beta_email' ) ); ?></label>
		<input id="beta-email" name="nota_beta_email" type="email" autocomplete="email" inputmode="email" maxlength="254" required value="<?php echo esc_attr( $nota_values['email'] ); ?>"<?php echo $nota_described( 'email', array(), $nota_errors ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in the closure. ?>>
		<?php $nota_error( 'email', $nota_errors ); ?>
	</div>

	<div class="field">
		<label for="beta-telegram"><?php echo esc_html( nota_ui( 'beta_telegram' ) ); ?></label>
		<div class="field__affix">
			<span class="field__prefix" aria-hidden="true">@</span>
			<input id="beta-telegram" name="nota_beta_telegram" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="64" required value="<?php echo esc_attr( ltrim( (string) $nota_values['telegram'], '@' ) ); ?>"<?php echo $nota_described( 'telegram', array( 'beta-telegram-hint' ), $nota_errors ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in the closure. ?>>
		</div>
		<p class="field__hint" id="beta-telegram-hint"><?php echo esc_html( nota_ui( 'beta_telegram_hint' ) ); ?></p>
		<?php $nota_error( 'telegram', $nota_errors ); ?>
	</div>

	<fieldset class="field" id="beta-devices"<?php echo $nota_described( 'devices', array( 'beta-devices-hint' ), $nota_errors, false ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in the closure. ?>>
		<legend><?php echo esc_html( nota_ui( 'beta_devices' ) ); ?></legend>
		<p class="field__hint" id="beta-devices-hint"><?php echo esc_html( nota_ui( 'beta_devices_hint' ) ); ?></p>
		<div class="beta-chips">
			<?php foreach ( nota_beta_devices() as $nota_key => $nota_names ) : ?>
				<label class="beta-chip" for="beta-device-<?php echo esc_attr( $nota_key ); ?>">
					<input id="beta-device-<?php echo esc_attr( $nota_key ); ?>" type="checkbox" name="nota_beta_devices[]" value="<?php echo esc_attr( $nota_key ); ?>"<?php checked( in_array( $nota_key, (array) $nota_values['devices'], true ) ); ?>>
					<span><?php echo esc_html( $nota_names[ $nota_lang ] ); ?></span>
				</label>
			<?php endforeach; ?>
		</div>
		<?php $nota_error( 'devices', $nota_errors ); ?>
	</fieldset>

	<div class="field">
		<label for="beta-note"><?php echo esc_html( nota_ui( 'beta_note' ) ); ?></label>
		<textarea id="beta-note" name="nota_beta_note" rows="3" maxlength="1000"><?php echo esc_textarea( $nota_values['note'] ); ?></textarea>
	</div>

	<div class="field field--check">
		<input id="beta-consent" name="nota_beta_consent" type="checkbox" value="1" required<?php checked( (bool) $nota_values['consent'] ); ?><?php echo $nota_described( 'consent', array(), $nota_errors ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in the closure. ?>>
		<label for="beta-consent"><?php echo esc_html( nota_ui( 'beta_consent' ) ); ?></label>
		<?php $nota_error( 'consent', $nota_errors ); ?>
	</div>

	<div class="beta-form__trap" aria-hidden="true">
		<label for="beta-website">Leave this empty</label>
		<input id="beta-website" name="nota_beta_website" type="text" tabindex="-1" autocomplete="off" value="">
	</div>

	<div class="beta-form__send">
		<button class="button button--primary beta-form__submit" type="submit"><?php nota_text( 'beta_submit' ); ?></button>
		<?php nota_field( 'beta_privacy', 'p', 'beta-form__privacy' ); ?>
	</div>
</form>
