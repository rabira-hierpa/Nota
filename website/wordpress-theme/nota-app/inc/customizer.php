<?php
/**
 * Appearance, Customize: every word, link and picture on the landing page.
 *
 * The Customizer fits this page better than blocks would: each piece of copy has
 * an English and an Amharic field side by side, the preview is live, and nobody
 * can break the layout by moving something. It also stays out of Elementor's way.
 *
 * @package Nota
 */

defined( 'ABSPATH' ) || exit;

/**
 * Keeps inline markup in copy, removes everything else, and leaves "&" readable
 * in the field. The templates escape it again on output.
 *
 * @param string $value The field's value.
 * @return string
 */
function nota_sanitize_copy( $value ) {
	return str_replace( '&amp;', '&', wp_kses( (string) $value, nota_allowed_html() ) );
}

/**
 * Only the two ways the front page can work.
 *
 * @param string $value The chosen mode.
 * @return string
 */
function nota_sanitize_front_mode( $value ) {
	return 'page' === $value ? 'page' : 'landing';
}

/**
 * A version number as it appears in a release tag.
 *
 * @param string $value The field's value.
 * @return string
 */
function nota_sanitize_version( $value ) {
	return preg_replace( '/[^0-9A-Za-z._-]/', '', ltrim( trim( (string) $value ), 'vV' ) );
}

/**
 * Adds the panel.
 *
 * @param WP_Customize_Manager $wp_customize The Customizer.
 * @return void
 */
function nota_customize_register( $wp_customize ) {
	$wp_customize->add_panel(
		'nota_landing',
		array(
			'title'       => 'Nota landing page',
			'description' => 'Each piece of text has an English and an Amharic field. Click አማ at the top of the preview to see the Amharic page. Empty a field to hide that text.',
			'priority'    => 20,
		)
	);

	nota_customize_front_mode( $wp_customize );
	nota_customize_copy( $wp_customize );
	nota_customize_links( $wp_customize );
	nota_customize_stats( $wp_customize );
	nota_customize_images( $wp_customize );
}

/**
 * Counting visits and download clicks, and showing download numbers.
 *
 * @param WP_Customize_Manager $wp_customize The Customizer.
 * @return void
 */
function nota_customize_stats( $wp_customize ) {
	$wp_customize->add_section(
		'nota_stats',
		array(
			'title'       => 'Visits and downloads',
			'description' => 'Visits and clicks on each download button are counted by Umami, which sets no cookies, so the site needs no cookie banner. Nothing is counted for people logged in to this site, so your own visits stay out. Download totals from GitHub are on the Dashboard.',
			'panel'       => 'nota_landing',
		)
	);

	$fields = array(
		'nota_umami_id'       => array(
			'label'       => 'Umami website ID',
			'description' => 'In Umami, under Settings, Websites, your site, Edit. It looks like 4f3c2a1b-0000-4000-8000-123456789abc. Leave empty to count nothing.',
			'default'     => '',
			'sanitize'    => 'nota_sanitize_umami_id',
			'type'        => 'text',
		),
		'nota_umami_src'      => array(
			'label'       => 'Umami script address',
			'description' => 'Change it only if you run Umami on your own server.',
			'default'     => NOTA_UMAMI_SCRIPT,
			'sanitize'    => 'esc_url_raw',
			'type'        => 'url',
		),
		'nota_cf_token'       => array(
			'label'       => 'Cloudflare Web Analytics token (optional)',
			'description' => 'Counts visits but not download clicks. Leave it empty if Cloudflare already adds Web Analytics to the site for you.',
			'default'     => '',
			'sanitize'    => 'nota_sanitize_cf_token',
			'type'        => 'text',
		),
		'nota_show_downloads' => array(
			'label'       => 'Show download numbers on the site',
			'description' => 'The total from GitHub under the download links, and each version\'s count on the release notes page. Off until the numbers help.',
			'default'     => false,
			'sanitize'    => 'nota_sanitize_checkbox',
			'type'        => 'checkbox',
		),
	);

	foreach ( $fields as $key => $field ) {
		$wp_customize->add_setting(
			$key,
			array(
				'default'           => $field['default'],
				'sanitize_callback' => $field['sanitize'],
			)
		);
		$wp_customize->add_control(
			$key,
			array(
				'label'       => $field['label'],
				'description' => $field['description'],
				'section'     => 'nota_stats',
				'type'        => $field['type'],
			)
		);
	}
}
add_action( 'customize_register', 'nota_customize_register' );

/**
 * The section that decides what the home page shows.
 *
 * @param WP_Customize_Manager $wp_customize The Customizer.
 * @return void
 */
function nota_customize_front_mode( $wp_customize ) {
	$wp_customize->add_section(
		'nota_front',
		array(
			'title' => 'Home page',
			'panel' => 'nota_landing',
		)
	);
	$wp_customize->add_setting(
		'nota_front_mode',
		array(
			'default'           => 'landing',
			'sanitize_callback' => 'nota_sanitize_front_mode',
		)
	);
	$wp_customize->add_control(
		'nota_front_mode',
		array(
			'label'       => 'What the home page shows',
			'description' => 'The landing page takes over the home page by itself, whatever Settings, Reading says. Pages you built before are kept and still open at their own addresses.',
			'section'     => 'nota_front',
			'type'        => 'radio',
			'choices'     => array(
				'landing' => 'The Nota landing page',
				'page'    => 'The page from Settings, Reading',
			),
		)
	);
}

/**
 * One section per landing page section, with paired English and Amharic fields.
 *
 * @param WP_Customize_Manager $wp_customize The Customizer.
 * @return void
 */
function nota_customize_copy( $wp_customize ) {
	$languages = array(
		'en' => 'English',
		'am' => 'አማርኛ',
	);

	foreach ( nota_content_sections() as $section_id => $section ) {
		$section_key = "nota_copy_{$section_id}";
		$wp_customize->add_section(
			$section_key,
			array(
				'title' => $section['title'],
				'panel' => 'nota_landing',
			)
		);

		foreach ( $section['fields'] as $key => $field ) {
			foreach ( $languages as $lang => $language ) {
				$setting = "nota_{$key}_{$lang}";
				$wp_customize->add_setting(
					$setting,
					array(
						'default'           => $field[ $lang ],
						'sanitize_callback' => 'nota_sanitize_copy',
					)
				);
				$wp_customize->add_control(
					$setting,
					array(
						'label'   => "{$field['label']} ({$language})",
						'section' => $section_key,
						'type'    => isset( $field['type'] ) ? $field['type'] : 'text',
					)
				);
			}
		}
	}
}

/**
 * Links, the release version and the optional sign-up form.
 *
 * @param WP_Customize_Manager $wp_customize The Customizer.
 * @return void
 */
function nota_customize_links( $wp_customize ) {
	$wp_customize->add_section(
		'nota_links',
		array(
			'title' => 'Links and version',
			'panel' => 'nota_landing',
		)
	);

	foreach ( nota_link_fields() as $key => $field ) {
		$type      = isset( $field['type'] ) ? $field['type'] : 'url';
		$sanitizer = 'esc_url_raw';
		if ( 'email' === $type ) {
			$sanitizer = 'sanitize_email';
		} elseif ( 'version' === $key ) {
			$sanitizer = 'nota_sanitize_version';
		}

		$wp_customize->add_setting(
			"nota_{$key}",
			array(
				'default'           => $field['default'],
				'sanitize_callback' => $sanitizer,
			)
		);
		$wp_customize->add_control(
			"nota_{$key}",
			array(
				'label'       => $field['label'],
				'description' => isset( $field['description'] ) ? $field['description'] : '',
				'section'     => 'nota_links',
				'type'        => $type,
			)
		);
	}

	$wp_customize->add_setting(
		'nota_signup_shortcode',
		array(
			'default'           => '',
			'sanitize_callback' => 'sanitize_text_field',
		)
	);
	$wp_customize->add_control(
		'nota_signup_shortcode',
		array(
			'label'       => 'Sign-up form for phone news (optional)',
			'description' => 'The shortcode of a form from a plugin, for example [contact-form-7 id="123"]. It shows beside the phone section. Without one, the email link does the job.',
			'section'     => 'nota_links',
			'type'        => 'text',
		)
	);
}

/**
 * Replacements for the bundled screenshots, and the sharing image.
 *
 * @param WP_Customize_Manager $wp_customize The Customizer.
 * @return void
 */
function nota_customize_images( $wp_customize ) {
	$wp_customize->add_section(
		'nota_images',
		array(
			'title'       => 'Screenshots',
			'description' => 'The page comes with screenshots of the app, in both languages and both themes. A picture you add here replaces that screenshot in both languages. If you add only a light picture it shows in dark mode as well.',
			'panel'       => 'nota_landing',
		)
	);

	$shots = array(
		'main'       => 'Main window',
		'clip'       => 'Dictation (a picture here replaces the clip)',
		'voice'      => 'Voice note',
		'tags'       => 'Sidebar with tags',
		'calendar'   => 'Note info with both calendars',
		'zen'        => 'Zen mode',
		'phone_home' => 'Phone, list of notes',
		'phone_note' => 'Phone, open note',
	);
	$modes = array(
		'light' => 'light',
		'dark'  => 'dark',
	);

	foreach ( $shots as $slug => $label ) {
		foreach ( $modes as $mode => $mode_label ) {
			$setting = "nota_img_{$slug}_{$mode}";
			$wp_customize->add_setting(
				$setting,
				array(
					'default'           => '',
					'sanitize_callback' => 'esc_url_raw',
				)
			);
			$wp_customize->add_control(
				new WP_Customize_Image_Control(
					$wp_customize,
					$setting,
					array(
						'label'   => "{$label} ({$mode_label})",
						'section' => 'nota_images',
					)
				)
			);
		}
	}

	$wp_customize->add_setting(
		'nota_og_image',
		array(
			'default'           => '',
			'sanitize_callback' => 'esc_url_raw',
		)
	);
	$wp_customize->add_control(
		new WP_Customize_Image_Control(
			$wp_customize,
			'nota_og_image',
			array(
				'label'       => 'Picture when the page is shared',
				'description' => '1200 by 630 pixels. Without one, the page uses the picture that comes with the theme.',
				'section'     => 'nota_images',
			)
		)
	);
}
