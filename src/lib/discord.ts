export const TRACKER = 'https://tracker.vendetta.rocks';

/** Builds the patcher was checked against, newest first. Newer ones are offered too, and the patcher refuses if its anchors moved. */
export const VERIFIED: readonly number[] = [357200, 356207];

export const DENSITIES = [
   { name: 'ldpi', dpi: 120 },
   { name: 'mdpi', dpi: 160 },
   { name: 'hdpi', dpi: 240 },
   { name: 'xhdpi', dpi: 320 },
   { name: 'xxhdpi', dpi: 480 },
   { name: 'xxxhdpi', dpi: 640 },
] as const;

export type Density = (typeof DENSITIES)[number];

export const LANGUAGES = [
   'en',
   'ar',
   'bg',
   'cs',
   'da',
   'de',
   'el',
   'es',
   'fi',
   'fr',
   'hi',
   'hr',
   'hu',
   'id',
   'it',
   'ja',
   'ko',
   'lt',
   'nl',
   'no',
   'pl',
   'pt',
   'ro',
   'ru',
   'sv',
   'th',
   'tr',
   'uk',
   'vi',
   'zh',
] as const;

/** arm64 is the only ABI with a loader build (sunbird's scripts/site.nu). The loader goes in first, under its name in the APK. */
export const ABI = {
   split: 'config.arm64_v8a',
   libraries: {
      'libplm.so': '/plugins/libphoenix-arm64.so',
      'libshadowhook_nothing.so': '/plugins/libshadowhook_nothing-arm64.so',
   },
} as const;

export const FRIDA = {
   gadget: '/plugins/frida-gadget-17.27.4-android-arm64.so.gz',
   bootstrap: '/plugins/frida-bootstrap.js',
   example: '/plugins/frida-example.js',
} as const;

export const PACKAGE = 'com.discord';
export const SIDE_LABEL = 'Discord Phoenix';
