<?php
/**
 * The beta sign-up page: a short form for people who want to test Nota, in English
 * with the Amharic page at ?lang=am, and the list of who signed up under Beta
 * testers in wp-admin.
 *
 * Any page becomes it with the template "Nota beta sign-up", and a page whose
 * address is /beta/, /beta-signup/ or /join-the-beta/ becomes it by itself. The
 * shortcode [nota_beta_signup] puts the same form in any other page.
 *
 * The form works with page caching: it carries no nonce that a cached copy could
 * outlive. It posts to its own page, which caches never keep; a mistake comes back
 * in that answer, and a sign-up goes to ?thanks=1, which says the same to everyone.
 * Only a new sign-up lands on its #signed-up part, which is what Umami counts.
 * A hidden field catches robots, each address (or IPv6 network) may sign up a few
 * times an hour, and an address already on the list is thanked without being kept.
 *
 * Sign-ups are posts of a private type that only administrators can see. Nothing
 * here records an IP address. Tools, Export and Erase Personal Data find them by
 * email.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

define( 'NOTA_BETA_TEMPLATE', 'page-templates/beta-signup.php' );
define( 'NOTA_BETA_TYPE', 'nota_beta_tester' );

/**
 * The slugs that make a page the sign-up page without choosing the template.
 *
 * @return string[]
 */
function nota_beta_slugs() {
	return array( 'beta', 'beta-signup', 'join-the-beta' );
}

/**
 * True when this request shows the beta sign-up page.
 *
 * @return bool
 */
function nota_is_beta() {
	if ( ! is_page() ) {
		return false;
	}
	if ( is_page_template( NOTA_BETA_TEMPLATE ) ) {
		return true;
	}
	return is_page( nota_beta_slugs() ) && '' === get_page_template_slug() && ! nota_is_builder_page( get_queried_object_id() );
}

/**
 * Uses the template for a /beta/ page that has none of its own.
 *
 * @param string $template The template WordPress chose.
 * @return string
 */
function nota_beta_template( $template ) {
	if ( nota_is_beta() && ! is_page_template( NOTA_BETA_TEMPLATE ) ) {
		return get_theme_file_path( NOTA_BETA_TEMPLATE );
	}
	return $template;
}
add_filter( 'template_include', 'nota_beta_template', 98 );

/**
 * True while the form takes sign-ups (Customizer, Beta sign-up page).
 *
 * @return bool
 */
function nota_beta_open() {
	return (bool) get_theme_mod( 'nota_beta_open', true );
}

/**
 * The devices a tester can pick, with their names in each language.
 *
 * @return array<string, array{en: string, am: string}>
 */
function nota_beta_devices() {
	return array(
		'mac'     => array(
			'en' => 'Mac',
			'am' => 'Mac',
		),
		'windows' => array(
			'en' => 'Windows',
			'am' => 'Windows',
		),
		'linux'   => array(
			'en' => 'Linux',
			'am' => 'Linux',
		),
		'android' => array(
			'en' => 'Android phone',
			'am' => 'Android ስልክ',
		),
		'iphone'  => array(
			'en' => 'iPhone',
			'am' => 'iPhone',
		),
	);
}

/**
 * Device keys as English names, for the admin list, the CSV and the email.
 *
 * @param string $keys Comma-separated keys, as stored.
 * @return string
 */
function nota_beta_device_names( $keys ) {
	$devices = nota_beta_devices();
	$names   = array();
	foreach ( array_filter( explode( ',', (string) $keys ) ) as $key ) {
		if ( isset( $devices[ $key ] ) ) {
			$names[] = $devices[ $key ]['en'];
		}
	}
	return implode( ', ', $names );
}

/**
 * A sign-up's name as plain text. WordPress stores it with & written as &amp;.
 *
 * @param int $id The sign-up.
 * @return string
 */
function nota_beta_name( $id ) {
	return html_entity_decode( (string) get_post_field( 'post_title', $id ), ENT_QUOTES, 'UTF-8' );
}

/**
 * A sign-up's note as plain text.
 *
 * @param int $id The sign-up.
 * @return string
 */
function nota_beta_note( $id ) {
	return html_entity_decode( (string) get_post_field( 'post_content', $id ), ENT_QUOTES, 'UTF-8' );
}

/* --- The sign-up ------------------------------------------------------------------ */

/**
 * This request's form: what was typed and what was wrong with it, or that it went
 * through. The template and the shortcode both read it.
 *
 * @param array<string, mixed>|null $set A new state, from the submission handler.
 * @return array{errors: array<string, string>, values: array<string, mixed>}
 */
function nota_beta_state( $set = null ) {
	static $state = array(
		'errors' => array(),
		'values' => array(),
	);
	if ( null !== $set ) {
		$state = $set;
	}
	return $state;
}

/**
 * True on the page a sign-up lands on.
 *
 * @return bool
 */
function nota_beta_thanked() {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only picks which message to show.
	return isset( $_GET['thanks'] ) && '1' === $_GET['thanks'];
}

/**
 * A Telegram username from whatever was typed: @name, name, or a t.me link.
 *
 * @param string $raw The field as typed.
 * @return string The username without its @, or nothing when it can't be one.
 */
function nota_beta_telegram( $raw ) {
	// Only the ends are trimmed: a space inside means a name was typed, not a username.
	$value = (string) preg_replace( '/^\s+|\s+$/u', '', (string) $raw );
	$value = (string) preg_replace( '#^(?:https?://)?(?:www\.)?(?:t|telegram)\.me/#i', '', $value );
	$value = rtrim( ltrim( ltrim( $value, '@' ) ), '/' );
	return preg_match( '/^[A-Za-z][A-Za-z0-9_]{3,31}$/', $value ) ? $value : '';
}

/**
 * Cloudflare's addresses, from cloudflare.com/ips. Only a request from one of them
 * has its CF-Connecting-IP header believed.
 *
 * @return string[]
 */
function nota_beta_cloudflare_ranges() {
	return array(
		'173.245.48.0/20',
		'103.21.244.0/22',
		'103.22.200.0/22',
		'103.31.4.0/22',
		'141.101.64.0/18',
		'108.162.192.0/18',
		'190.93.240.0/20',
		'188.114.96.0/20',
		'197.234.240.0/22',
		'198.41.128.0/17',
		'162.158.0.0/15',
		'104.16.0.0/13',
		'104.24.0.0/14',
		'172.64.0.0/13',
		'131.0.72.0/22',
		'2400:cb00::/32',
		'2606:4700::/32',
		'2803:f800::/32',
		'2405:b500::/32',
		'2405:8100::/32',
		'2a06:98c0::/29',
		'2c0f:f248::/32',
	);
}

/**
 * True when an address is in a range written as address/bits.
 *
 * @param string $ip    A valid IPv4 or IPv6 address.
 * @param string $range The range.
 * @return bool
 */
function nota_beta_in_range( $ip, $range ) {
	list( $subnet, $bits ) = explode( '/', $range );
	$ip     = inet_pton( $ip );
	$subnet = inet_pton( $subnet );
	if ( false === $ip || false === $subnet || strlen( $ip ) !== strlen( $subnet ) ) {
		return false;
	}
	$bytes = intdiv( (int) $bits, 8 );
	$rest  = (int) $bits % 8;
	if ( substr( $ip, 0, $bytes ) !== substr( $subnet, 0, $bytes ) ) {
		return false;
	}
	if ( 0 === $rest ) {
		return true;
	}
	$mask = chr( ( 0xff << ( 8 - $rest ) ) & 0xff );
	return ( $ip[ $bytes ] & $mask ) === ( $subnet[ $bytes ] & $mask );
}

/**
 * The address a request comes from, for the hourly limit only: it is hashed and
 * never stored with a sign-up. Behind Cloudflare it is the visitor's, as Cloudflare
 * says, but only when the request did come through Cloudflare.
 *
 * @return string
 */
function nota_beta_client_ip() {
	$remote = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	if ( ! filter_var( $remote, FILTER_VALIDATE_IP ) ) {
		return '';
	}
	$visitor = isset( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) : '';
	if ( filter_var( $visitor, FILTER_VALIDATE_IP ) ) {
		foreach ( nota_beta_cloudflare_ranges() as $range ) {
			if ( nota_beta_in_range( $remote, $range ) ) {
				return $visitor;
			}
		}
	}
	return $remote;
}

/**
 * Who the hourly limit counts as one: an IPv4 address, or an IPv6 network (/64),
 * since one device may hold a whole /64. Hashed.
 *
 * @return string
 */
function nota_beta_client_key() {
	$ip     = nota_beta_client_ip();
	$binary = '' === $ip ? false : inet_pton( $ip );
	if ( is_string( $binary ) && 16 === strlen( $binary ) ) {
		$ip = "\0\0\0\0\0\0\0\0\0\0\xff\xff" === substr( $binary, 0, 12 ) ? (string) inet_ntop( substr( $binary, 12 ) ) : bin2hex( substr( $binary, 0, 8 ) ) . '::/64';
	}
	return substr( wp_hash( $ip ), 0, 24 );
}

/**
 * The two counters behind the limits: this address's sign-ups in the last hour, and
 * everyone's today (UTC).
 *
 * @return array{hour: string, day: string}
 */
function nota_beta_limit_keys() {
	return array(
		'hour' => 'nota_beta_ip_' . nota_beta_client_key(),
		'day'  => 'nota_beta_day_' . gmdate( 'Ymd' ),
	);
}

/**
 * Whether a limit is reached: six sign-ups an hour from one address, a thousand a day
 * in all. It only looks, so it can come first and give everyone past a limit the same
 * answer, whether or not their address is on the list.
 *
 * @return string Nothing when a sign-up may go ahead, or the key of the message for
 *                the limit reached.
 */
function nota_beta_limit_reached() {
	$keys = nota_beta_limit_keys();
	if ( (int) get_transient( $keys['hour'] ) >= 6 ) {
		return 'beta_err_busy';
	}
	if ( (int) get_transient( $keys['day'] ) >= 1000 ) {
		return 'beta_err_full';
	}
	return '';
}

/**
 * Counts a new sign-up against both limits. An address already on the list is
 * thanked without this, so repeating one uses up neither.
 *
 * @return void
 */
function nota_beta_count_signup() {
	$keys = nota_beta_limit_keys();
	set_transient( $keys['hour'], (int) get_transient( $keys['hour'] ) + 1, HOUR_IN_SECONDS );
	set_transient( $keys['day'], (int) get_transient( $keys['day'] ) + 1, DAY_IN_SECONDS );
}

/**
 * The page a sign-up came from, in its language, to go back to.
 *
 * @return string
 */
function nota_beta_return_url() {
	$id  = is_singular() ? get_queried_object_id() : 0;
	$url = $id ? get_permalink( $id ) : home_url( '/' );
	return nota_base_lang() === nota_lang() ? $url : add_query_arg( 'lang', nota_lang(), $url );
}

/**
 * The sign-ups with this email address.
 *
 * @param string          $email    Email address, lower case.
 * @param string|string[] $statuses Post statuses to look in: by default every one but the trash.
 * @return int[]
 */
function nota_beta_find( $email, $statuses = 'any' ) {
	return array_map(
		'intval',
		get_posts(
			array(
				'post_type'      => NOTA_BETA_TYPE,
				'post_status'    => $statuses,
				'posts_per_page' => 50,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'meta_key'       => '_nota_beta_email', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- A few hundred rows at most.
				'meta_value'     => $email, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value -- As above.
			)
		)
	);
}

/**
 * Reads and checks the form.
 *
 * @return array{errors: array<string, string>, values: array<string, mixed>}
 */
function nota_beta_read_form() {
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- A public form on cached pages; see the file's comment.
	$text = static function ( $key ) {
		return isset( $_POST[ $key ] ) && is_string( $_POST[ $key ] ) ? wp_unslash( $_POST[ $key ] ) : '';
	};

	$picked = isset( $_POST['nota_beta_devices'] ) && is_array( $_POST['nota_beta_devices'] ) ? array_map( 'sanitize_key', wp_unslash( $_POST['nota_beta_devices'] ) ) : array();

	// An address is kept only as typed: one that cleaning would change is a mistake,
	// and comes back as typed so it can be seen and fixed.
	$typed    = mb_substr( sanitize_text_field( $text( 'nota_beta_email' ) ), 0, 254 );
	$email    = strtolower( sanitize_email( $typed ) );
	$email_ok = '' !== $email && is_email( $email ) && strtolower( $typed ) === $email;

	$values = array(
		'name'     => mb_substr( sanitize_text_field( $text( 'nota_beta_name' ) ), 0, 100 ),
		'email'    => $email_ok ? $email : $typed,
		'telegram' => mb_substr( sanitize_text_field( $text( 'nota_beta_telegram' ) ), 0, 64 ),
		'devices'  => array_values( array_intersect( array_keys( nota_beta_devices() ), $picked ) ),
		'note'     => mb_substr( sanitize_textarea_field( $text( 'nota_beta_note' ) ), 0, 1000 ),
		'consent'  => ! empty( $_POST['nota_beta_consent'] ),
	);
	// phpcs:enable

	$errors = array();
	if ( '' === trim( $values['name'] ) ) {
		$errors['name'] = nota_ui( 'beta_err_name' );
	}
	if ( ! $email_ok ) {
		$errors['email'] = nota_ui( 'beta_err_email' );
	}
	if ( '' === nota_beta_telegram( $values['telegram'] ) ) {
		$errors['telegram'] = nota_ui( 'beta_err_telegram' );
	}
	if ( ! $values['devices'] ) {
		$errors['devices'] = nota_ui( 'beta_err_devices' );
	}
	if ( ! $values['consent'] ) {
		$errors['consent'] = nota_ui( 'beta_err_consent' );
	}

	return array(
		'errors' => $errors,
		'values' => $values,
	);
}

/**
 * Keeps a sign-up. An email address already on the list keeps its first sign-up,
 * so nobody can change someone else's by typing their address.
 *
 * @param array<string, mixed> $values The checked form.
 * @return bool
 */
function nota_beta_save( $values ) {
	if ( nota_beta_find( $values['email'] ) ) {
		return true;
	}

	$telegram = nota_beta_telegram( $values['telegram'] );
	// wp_insert_post() takes slashed values, as from a form, and would eat a backslash.
	$id = wp_insert_post(
		wp_slash(
			array(
				'post_type'      => NOTA_BETA_TYPE,
				'post_status'    => 'publish',
				'post_title'     => $values['name'],
				'post_content'   => $values['note'],
				// The list's search reads the title, excerpt and content, so this makes both findable.
				'post_excerpt'   => $values['email'] . ' @' . $telegram,
				'post_author'    => 0,
				'comment_status' => 'closed',
				'ping_status'    => 'closed',
				'meta_input'     => array(
					'_nota_beta_email'    => $values['email'],
					'_nota_beta_telegram' => $telegram,
					'_nota_beta_devices'  => implode( ',', $values['devices'] ),
					'_nota_beta_lang'     => nota_lang(),
				),
			)
		),
		true
	);
	if ( is_wp_error( $id ) || ! $id ) {
		return false;
	}

	if ( get_theme_mod( 'nota_beta_notify', true ) ) {
		nota_beta_notify( (int) $id );
	}
	return true;
}

/**
 * Emails the site's admin address about a new sign-up, with Reply-To set to the
 * tester, so answering it sends them the link. Fifty a day at most; after that the
 * day's sign-ups are only in the list.
 *
 * @param int $id The sign-up.
 * @return void
 */
function nota_beta_notify( $id ) {
	$count = 'nota_beta_mail_' . gmdate( 'Ymd' );
	$sent  = (int) get_transient( $count );
	if ( $sent >= 50 ) {
		return;
	}
	set_transient( $count, $sent + 1, DAY_IN_SECONDS );

	$email    = (string) get_post_meta( $id, '_nota_beta_email', true );
	$telegram = (string) get_post_meta( $id, '_nota_beta_telegram', true );
	$name     = nota_beta_name( $id );
	$note     = nota_beta_note( $id );
	$lines    = array(
		'Someone signed up to test Nota.',
		'',
		'Name: ' . $name,
		'Email: ' . $email,
		'Telegram: @' . $telegram . ' (https://t.me/' . $telegram . ')',
		'Devices: ' . nota_beta_device_names( (string) get_post_meta( $id, '_nota_beta_devices', true ) ),
		'Page language: ' . ( 'am' === get_post_meta( $id, '_nota_beta_lang', true ) ? 'Amharic' : 'English' ),
	);
	if ( '' !== $note ) {
		$lines[] = 'Note: ' . $note;
	}
	$lines[] = '';
	$lines[] = 'Everyone who signed up: ' . admin_url( 'edit.php?post_type=' . NOTA_BETA_TYPE );
	$lines[] = 'Turn these emails off under Appearance, Customize, Nota landing page, Beta sign-up page.';
	if ( 49 === $sent ) {
		$lines[] = '';
		$lines[] = 'This is the 50th of these emails today (UTC), so the rest of today\'s sign-ups are only in the list.';
	}

	wp_mail(
		(string) get_option( 'admin_email' ),
		'New Nota beta tester: ' . $name,
		implode( "\n", $lines ),
		is_email( $email ) ? array( 'Reply-To: ' . $email ) : array()
	);
}

/**
 * Handles a sign-up posted to any page: a mistake shows on the same page, with what
 * was typed kept; a sign-up goes on to the thank-you.
 *
 * @return void
 */
function nota_beta_handle_post() {
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- See the file's comment.
	if ( ! isset( $_SERVER['REQUEST_METHOD'] ) || 'POST' !== $_SERVER['REQUEST_METHOD'] || ! isset( $_POST['nota_beta'] ) ) {
		return;
	}

	// Answers to a post are never kept by a cache, but say so for any that would.
	nocache_headers();
	do_action( 'litespeed_control_set_nocache', 'Nota beta sign-up' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- LiteSpeed Cache's own hook.

	// The same page for everyone, so caches may keep it. Only a new sign-up lands on
	// #signed-up, which the browser keeps to itself and the page's script counts.
	$done = add_query_arg( 'thanks', '1', nota_beta_return_url() );

	// The field people can't see: whatever fills it in is a robot, and is thanked all the same.
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- As above.
	if ( ! empty( $_POST['nota_beta_website'] ) ) {
		wp_safe_redirect( $done . '#signup', 303 );
		exit;
	}

	if ( ! nota_beta_open() ) {
		return;
	}

	$state = nota_beta_read_form();
	if ( ! $state['errors'] ) {
		// Past a limit everyone hears the same, so nobody can test whether an address
		// is on the list by asking again and again.
		$limit = nota_beta_limit_reached();
		if ( '' !== $limit ) {
			$state['errors']['form'] = nota_ui( $limit );
		} elseif ( nota_beta_find( $state['values']['email'] ) ) {
			// Already on the list: thanked as before, and not counted against the limits.
			wp_safe_redirect( $done . '#signup', 303 );
			exit;
		} else {
			nota_beta_count_signup();
			if ( nota_beta_save( $state['values'] ) ) {
				wp_safe_redirect( $done . '#signed-up', 303 );
				exit;
			}
			$state['errors']['form'] = nota_ui( 'beta_err_failed' );
		}
	}
	nota_beta_state( $state );
}
add_action( 'template_redirect', 'nota_beta_handle_post', 5 );

/**
 * Prints the form, the thank-you or the closed note.
 *
 * @return void
 */
function nota_render_beta() {
	if ( nota_beta_thanked() ) {
		get_template_part( 'template-parts/beta/done' );
		return;
	}
	if ( ! nota_beta_open() ) {
		nota_field( 'beta_closed', 'p', 'beta-closed' );
		return;
	}
	get_template_part( 'template-parts/beta/form', null, nota_beta_state() );
}

/**
 * [nota_beta_signup]: the form in any page.
 *
 * @return string
 */
function nota_beta_shortcode() {
	ob_start();
	echo '<div class="beta-embed" id="signup">';
	nota_render_beta();
	echo '</div>';
	return (string) ob_get_clean();
}
add_shortcode( 'nota_beta_signup', 'nota_beta_shortcode' );

/* --- The list in wp-admin ---------------------------------------------------------- */

/**
 * The private post type that holds sign-ups. Only administrators see it; nobody can
 * add or edit one by hand, only send it to the trash.
 *
 * @return void
 */
function nota_beta_register() {
	$admin = 'manage_options';
	register_post_type(
		NOTA_BETA_TYPE,
		array(
			'labels'              => array(
				'name'               => 'Beta testers',
				'singular_name'      => 'Beta tester',
				'menu_name'          => 'Beta testers',
				'all_items'          => 'Beta testers',
				'search_items'       => 'Search beta testers',
				'not_found'          => 'Nobody has signed up yet. The form is on the page at /beta/.',
				'not_found_in_trash' => 'Nothing in the trash.',
			),
			'description'         => 'People who signed up on the beta page.',
			'public'              => false,
			'publicly_queryable'  => false,
			'exclude_from_search' => true,
			'show_ui'             => true,
			'show_in_menu'        => true,
			'show_in_nav_menus'   => false,
			'show_in_admin_bar'   => false,
			'show_in_rest'        => false,
			'has_archive'         => false,
			'rewrite'             => false,
			'query_var'           => false,
			'can_export'          => false,
			'delete_with_user'    => false,
			'menu_position'       => 26,
			'menu_icon'           => 'dashicons-groups',
			'supports'            => array( 'title' ),
			'map_meta_cap'        => false,
			'capabilities'        => array(
				'edit_post'          => 'do_not_allow',
				'read_post'          => $admin,
				'delete_post'        => $admin,
				'edit_posts'         => $admin,
				'edit_others_posts'  => $admin,
				'delete_posts'       => $admin,
				'publish_posts'      => $admin,
				'read_private_posts' => $admin,
				'create_posts'       => 'do_not_allow',
			),
		)
	);
}
add_action( 'init', 'nota_beta_register' );

/**
 * A sign-up taken out of the trash goes back on the list. WordPress would make it a
 * draft, which the list's views, the CSV and the email check would all miss.
 *
 * @param string $status The status WordPress picked.
 * @param int    $id     The post.
 * @return string
 */
function nota_beta_untrash_status( $status, $id ) {
	return NOTA_BETA_TYPE === get_post_type( $id ) ? 'publish' : $status;
}
add_filter( 'wp_untrash_post_status', 'nota_beta_untrash_status', 10, 2 );

/**
 * The list's columns.
 *
 * @param array<string, string> $columns WordPress's columns.
 * @return array<string, string>
 */
function nota_beta_columns( $columns ) {
	return array(
		'cb'            => isset( $columns['cb'] ) ? $columns['cb'] : '<input type="checkbox">',
		'title'         => 'Name',
		'nota_email'    => 'Email',
		'nota_telegram' => 'Telegram',
		'nota_devices'  => 'Devices',
		'nota_lang'     => 'Language',
		'nota_sent'     => 'Link sent',
		'nota_when'     => 'Signed up',
	);
}
add_filter( 'manage_' . NOTA_BETA_TYPE . '_posts_columns', 'nota_beta_columns' );

/**
 * One cell of the list.
 *
 * @param string $column Column key.
 * @param int    $id     The sign-up.
 * @return void
 */
function nota_beta_column( $column, $id ) {
	switch ( $column ) {
		case 'nota_email':
			$email = (string) get_post_meta( $id, '_nota_beta_email', true );
			printf( '<a href="%s">%s</a>', esc_url( 'mailto:' . $email ), esc_html( $email ) );
			$note = (string) get_post_field( 'post_content', $id );
			if ( '' !== $note ) {
				printf( '<p class="description" style="margin-top:4px">%s</p>', esc_html( wp_trim_words( $note, 30 ) ) );
			}
			break;
		case 'nota_telegram':
			$telegram = (string) get_post_meta( $id, '_nota_beta_telegram', true );
			printf( '<a href="%s" rel="noopener">@%s</a>', esc_url( 'https://t.me/' . $telegram ), esc_html( $telegram ) );
			break;
		case 'nota_devices':
			echo esc_html( nota_beta_device_names( (string) get_post_meta( $id, '_nota_beta_devices', true ) ) );
			break;
		case 'nota_lang':
			echo 'am' === get_post_meta( $id, '_nota_beta_lang', true ) ? 'Amharic' : 'English';
			break;
		case 'nota_sent':
			$sent = (int) get_post_meta( $id, '_nota_beta_sent', true );
			echo $sent ? esc_html( wp_date( get_option( 'date_format' ), $sent ) ) : '<span aria-hidden="true">&mdash;</span><span class="screen-reader-text">Not yet</span>';
			break;
		case 'nota_when':
			echo esc_html( wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), (int) get_post_timestamp( $id ) ) );
			break;
	}
}
add_action( 'manage_' . NOTA_BETA_TYPE . '_posts_custom_column', 'nota_beta_column', 10, 2 );

/**
 * Sorting by name and by date.
 *
 * @param array<string, string> $columns Sortable columns.
 * @return array<string, string>
 */
function nota_beta_sortable( $columns ) {
	$columns['title']     = 'title';
	$columns['nota_when'] = 'date';
	return $columns;
}
add_filter( 'manage_edit-' . NOTA_BETA_TYPE . '_sortable_columns', 'nota_beta_sortable' );

/**
 * Checkboxes for the bulk actions, which WordPress shows only beside posts that can
 * be edited.
 *
 * @param bool    $show Whether to show it.
 * @param WP_Post $post The row's post.
 * @return bool
 */
function nota_beta_show_checkbox( $show, $post ) {
	return NOTA_BETA_TYPE === $post->post_type ? current_user_can( 'delete_post', $post->ID ) : $show;
}
add_filter( 'wp_list_table_show_post_checkbox', 'nota_beta_show_checkbox', 10, 2 );

/**
 * A row's links: mark the link as sent, or not, beside Trash.
 *
 * @param array<string, string> $actions Row actions.
 * @param WP_Post               $post    The row's post.
 * @return array<string, string>
 */
function nota_beta_row_actions( $actions, $post ) {
	if ( NOTA_BETA_TYPE !== $post->post_type || 'trash' === $post->post_status ) {
		return $actions;
	}
	$sent = (int) get_post_meta( $post->ID, '_nota_beta_sent', true );
	$url  = wp_nonce_url(
		add_query_arg(
			array(
				'action' => 'nota_beta_sent',
				'id'     => $post->ID,
				'sent'   => $sent ? '0' : '1',
			),
			admin_url( 'admin-post.php' )
		),
		'nota_beta_sent_' . $post->ID
	);
	return array( 'nota_sent' => sprintf( '<a href="%s">%s</a>', esc_url( $url ), $sent ? 'Mark link as not sent' : 'Mark link as sent' ) ) + $actions;
}
add_filter( 'post_row_actions', 'nota_beta_row_actions', 10, 2 );

/**
 * Marks one sign-up's link as sent, or not.
 *
 * @return void
 */
function nota_beta_mark_one() {
	$id = isset( $_GET['id'] ) ? absint( $_GET['id'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Checked just below.
	check_admin_referer( 'nota_beta_sent_' . $id );
	if ( NOTA_BETA_TYPE !== get_post_type( $id ) || ! current_user_can( 'delete_post', $id ) ) {
		wp_die( 'You can\'t change this sign-up.', '', array( 'response' => 403 ) );
	}
	nota_beta_mark( array( $id ), ! empty( $_GET['sent'] ) );
	wp_safe_redirect( wp_get_referer() ? wp_get_referer() : admin_url( 'edit.php?post_type=' . NOTA_BETA_TYPE ) );
	exit;
}
add_action( 'admin_post_nota_beta_sent', 'nota_beta_mark_one' );

/**
 * Records when the link went out, or forgets it.
 *
 * @param int[] $ids  Sign-ups.
 * @param bool  $sent Sent or not.
 * @return void
 */
function nota_beta_mark( $ids, $sent ) {
	foreach ( $ids as $id ) {
		if ( $sent ) {
			update_post_meta( $id, '_nota_beta_sent', time() );
		} else {
			delete_post_meta( $id, '_nota_beta_sent' );
		}
	}
}

/**
 * Bulk actions: the two marks and the trash; nothing that edits.
 *
 * @param array<string, string> $actions Bulk actions.
 * @return array<string, string>
 */
function nota_beta_bulk_actions( $actions ) {
	unset( $actions['edit'] );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only picks the view.
	$in_trash = isset( $_REQUEST['post_status'] ) && 'trash' === $_REQUEST['post_status'];
	if ( ! $in_trash ) {
		$actions = array(
			'nota_beta_sent'   => 'Mark link as sent',
			'nota_beta_unsent' => 'Mark link as not sent',
		) + $actions;
	}
	return $actions;
}
add_filter( 'bulk_actions-edit-' . NOTA_BETA_TYPE, 'nota_beta_bulk_actions' );

/**
 * Carries out the two marks. WordPress has checked the nonce by now.
 *
 * @param string $redirect Where to go after.
 * @param string $action   The bulk action.
 * @param int[]  $ids      The ticked sign-ups.
 * @return string
 */
function nota_beta_handle_bulk( $redirect, $action, $ids ) {
	if ( 'nota_beta_sent' !== $action && 'nota_beta_unsent' !== $action ) {
		return $redirect;
	}
	$ids = array_filter(
		array_map( 'intval', $ids ),
		static function ( $id ) {
			return NOTA_BETA_TYPE === get_post_type( $id ) && current_user_can( 'delete_post', $id );
		}
	);
	nota_beta_mark( $ids, 'nota_beta_sent' === $action );
	return $redirect;
}
add_filter( 'handle_bulk_actions-edit-' . NOTA_BETA_TYPE, 'nota_beta_handle_bulk', 10, 3 );

/**
 * A view of those still waiting for their link.
 *
 * @param array<string, string> $views The list's views.
 * @return array<string, string>
 */
function nota_beta_views( $views ) {
	$waiting = new WP_Query(
		array(
			'post_type'      => NOTA_BETA_TYPE,
			'post_status'    => 'any',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Admin only, a few hundred rows.
				array(
					'key'     => '_nota_beta_sent',
					'compare' => 'NOT EXISTS',
				),
			),
		)
	);
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only picks the view.
	$current = isset( $_GET['nota_waiting'] );
	$views['nota_waiting'] = sprintf(
		'<a href="%s"%s>Waiting for the link <span class="count">(%s)</span></a>',
		esc_url( admin_url( 'edit.php?post_type=' . NOTA_BETA_TYPE . '&nota_waiting=1' ) ),
		$current ? ' class="current" aria-current="page"' : '',
		esc_html( number_format_i18n( $waiting->found_posts ) )
	);
	if ( $current ) {
		foreach ( $views as $key => $view ) {
			if ( 'nota_waiting' !== $key ) {
				$views[ $key ] = str_replace( array( ' class="current"', ' aria-current="page"' ), '', $view );
			}
		}
	}
	return $views;
}
add_filter( 'views_edit-' . NOTA_BETA_TYPE, 'nota_beta_views' );

/**
 * Narrows the list to that view.
 *
 * @param WP_Query $query The admin list's query.
 * @return void
 */
function nota_beta_waiting_query( $query ) {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only picks the view.
	if ( ! is_admin() || ! $query->is_main_query() || NOTA_BETA_TYPE !== $query->get( 'post_type' ) || ! isset( $_GET['nota_waiting'] ) ) {
		return;
	}
	$query->set( 'post_status', 'any' );
	$query->set(
		'meta_query',
		array(
			array(
				'key'     => '_nota_beta_sent',
				'compare' => 'NOT EXISTS',
			),
		)
	);
}
add_action( 'pre_get_posts', 'nota_beta_waiting_query' );

/**
 * The Download CSV button above the list.
 *
 * @param string $which 'top' or 'bottom'.
 * @return void
 */
function nota_beta_csv_button( $which ) {
	$screen = get_current_screen();
	if ( 'top' !== $which || ! $screen || NOTA_BETA_TYPE !== $screen->post_type || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	printf(
		'<div class="alignleft actions"><a class="button" href="%s">Download CSV</a></div>',
		esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=nota_beta_csv' ), 'nota_beta_csv' ) )
	);
}
add_action( 'manage_posts_extra_tablenav', 'nota_beta_csv_button' );

/**
 * One CSV cell, made safe for spreadsheets that would run a leading = or +.
 *
 * @param string $value The value.
 * @return string
 */
function nota_beta_csv_cell( $value ) {
	$value = (string) $value;
	return preg_match( '/^[=+\-@\t\r]/', $value ) ? "'" . $value : $value;
}

/**
 * Sends everyone who signed up as a CSV file, oldest first. It starts with a byte
 * order mark so Excel reads Ge'ez names right.
 *
 * @return void
 */
function nota_beta_csv() {
	check_admin_referer( 'nota_beta_csv' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'You can\'t download this list.', '', array( 'response' => 403 ) );
	}

	$ids = get_posts(
		array(
			'post_type'      => NOTA_BETA_TYPE,
			'post_status'    => 'any',
			'posts_per_page' => -1,
			'orderby'        => 'date',
			'order'          => 'ASC',
			'fields'         => 'ids',
		)
	);

	nocache_headers();
	header( 'Content-Type: text/csv; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename="nota-beta-testers-' . gmdate( 'Y-m-d' ) . '.csv"' );

	$out = fopen( 'php://output', 'w' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen -- Streams to the response.
	fwrite( $out, "\xEF\xBB\xBF" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite -- As above.
	// No escape character: a quote is always doubled, so a backslash before one can't
	// end a cell early and start a new one with a formula.
	fputcsv( $out, array( 'Signed up', 'Name', 'Email', 'Telegram', 'Telegram link', 'Devices', 'Language', 'Note', 'Link sent' ), ',', '"', '' );
	foreach ( $ids as $id ) {
		$telegram = (string) get_post_meta( $id, '_nota_beta_telegram', true );
		$sent     = (int) get_post_meta( $id, '_nota_beta_sent', true );
		$row      = array(
			wp_date( 'Y-m-d H:i', (int) get_post_timestamp( $id ) ),
			nota_beta_name( $id ),
			(string) get_post_meta( $id, '_nota_beta_email', true ),
			$telegram,
			'https://t.me/' . $telegram,
			nota_beta_device_names( (string) get_post_meta( $id, '_nota_beta_devices', true ) ),
			'am' === get_post_meta( $id, '_nota_beta_lang', true ) ? 'Amharic' : 'English',
			nota_beta_note( $id ),
			$sent ? wp_date( 'Y-m-d', $sent ) : '',
		);
		fputcsv( $out, array_map( 'nota_beta_csv_cell', $row ), ',', '"', '' );
	}
	fclose( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- As above.
	exit;
}
add_action( 'admin_post_nota_beta_csv', 'nota_beta_csv' );

/* --- Personal data ------------------------------------------------------------------ */

/**
 * Registers the exporter.
 *
 * @param array<string, array<string, mixed>> $exporters Exporters.
 * @return array<string, array<string, mixed>>
 */
function nota_beta_register_exporter( $exporters ) {
	$exporters['nota-beta'] = array(
		'exporter_friendly_name' => 'Nota beta sign-up',
		'callback'               => 'nota_beta_export',
	);
	return $exporters;
}
add_filter( 'wp_privacy_personal_data_exporters', 'nota_beta_register_exporter' );

/**
 * What the sign-up page holds about an email address.
 *
 * @param string $email Email address.
 * @return array{data: array<int, array<string, mixed>>, done: bool}
 */
function nota_beta_export( $email ) {
	$data = array();
	foreach ( nota_beta_find( strtolower( (string) $email ), array( 'any', 'trash' ) ) as $id ) {
		$data[] = array(
			'group_id'    => 'nota-beta',
			'group_label' => 'Nota beta sign-up',
			'item_id'     => 'nota-beta-' . $id,
			'data'        => array(
				array(
					'name'  => 'Name',
					'value' => nota_beta_name( $id ),
				),
				array(
					'name'  => 'Email',
					'value' => (string) get_post_meta( $id, '_nota_beta_email', true ),
				),
				array(
					'name'  => 'Telegram',
					'value' => '@' . get_post_meta( $id, '_nota_beta_telegram', true ),
				),
				array(
					'name'  => 'Devices',
					'value' => nota_beta_device_names( (string) get_post_meta( $id, '_nota_beta_devices', true ) ),
				),
				array(
					'name'  => 'Note',
					'value' => nota_beta_note( $id ),
				),
				array(
					'name'  => 'Signed up',
					'value' => wp_date( 'Y-m-d H:i', (int) get_post_timestamp( $id ) ),
				),
			),
		);
	}
	return array(
		'data' => $data,
		'done' => true,
	);
}

/**
 * Registers the eraser.
 *
 * @param array<string, array<string, mixed>> $erasers Erasers.
 * @return array<string, array<string, mixed>>
 */
function nota_beta_register_eraser( $erasers ) {
	$erasers['nota-beta'] = array(
		'eraser_friendly_name' => 'Nota beta sign-up',
		'callback'             => 'nota_beta_erase',
	);
	return $erasers;
}
add_filter( 'wp_privacy_personal_data_erasers', 'nota_beta_register_eraser' );

/**
 * Deletes an email address's sign-ups for good.
 *
 * @param string $email Email address.
 * @return array{items_removed: bool, items_retained: bool, messages: string[], done: bool}
 */
function nota_beta_erase( $email ) {
	$removed = false;
	foreach ( nota_beta_find( strtolower( (string) $email ), array( 'any', 'trash' ) ) as $id ) {
		$removed =(bool) wp_delete_post( $id, true ) || $removed;
	}
	return array(
		'items_removed'  => $removed,
		'items_retained' => false,
		'messages'       => array(),
		'done'           => true,
	);
}

/**
 * Suggests words for the privacy policy, under Settings, Privacy.
 *
 * @return void
 */
function nota_beta_privacy_policy() {
	if ( function_exists( 'wp_add_privacy_policy_content' ) ) {
		wp_add_privacy_policy_content(
			'Nota theme: beta sign-up',
			'<p>When you sign up to test Nota, we keep the name, email address, Telegram username, devices and note you give us, and the page\'s language. We use them only to send you the beta and to ask about it, and we don\'t share them. The site\'s administrator gets an email with them. Ask us and we delete them.</p>'
		);
	}
}
add_action( 'admin_init', 'nota_beta_privacy_policy' );
