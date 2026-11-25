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

/** The ABIs with a loader build (sunbird's scripts/site.nu). The loader goes in first, under its name in the APK. */
export const ABIS = [
   {
      name: 'arm64',
      split: 'config.arm64_v8a',
      libraries: {
         'libplm.so': '/plugins/libphoenix-arm64.so',
         'libshadowhook_nothing.so': '/plugins/libshadowhook_nothing-arm64.so',
      },
   },
   {
      name: 'armv7',
      split: 'config.armeabi_v7a',
      libraries: {
         'libplm.so': '/plugins/libphoenix-armv7.so',
         'libshadowhook_nothing.so': '/plugins/libshadowhook_nothing-armv7.so',
      },
   },
] as const;

export type Abi = (typeof ABIS)[number];

export const FRIDA = {
   gadget: '/plugins/frida-gadget-17.27.4-android-arm64.so.gz',
   bootstrap: '/plugins/frida-bootstrap.js',
   example: '/plugins/frida-example.js',
} as const;

/** The iOS loader the IPA patcher adds, built by sunbird's ios workflow. */
export const IOS_LOADER = '/plugins/libphoenix-ios.dylib';

/** A third-party mirror of Discord builds. Each file's SHA-256 comes from its SHA256SUMS. */
export const MIRROR = 'https://dl.redeem.saarland';

export const MIRRORED: Readonly<Record<string, string>> = {
   'android/357200/base.apk': '1f3876502a004bbc7533bd21cf6b724350b191d92d4e3eb907f0a80db7ee9922',
   'android/357200/config.arm64_v8a.apk':
      '51b92e03be15e94bbd5c3fcda5f38a3adfed29b47d36cedcbcfbddb3f2575381',
   'android/357200/config.armeabi_v7a.apk':
      '3f862b5c14c1e3d8a162d7011ee11a4a34be173a14d0afd5fc640dfc7877a362',
   'android/357200/config.de.apk':
      '9b7cd9a097df6f4a3b308e337874bf8cb2ed1a5ffddab7adbfc90733e3279793',
   'android/357200/config.en.apk':
      '921826907f170177ba77d4fcd65696fb5d08ec7399642c568a41a441547d8ed3',
   'android/357200/config.hdpi.apk':
      'b74de9651c5170ddccc91401c2b1382bf168812568f89a0ff6dfa23b90491d32',
   'android/357200/config.xxhdpi.apk':
      '509ccd11e8096ea8b8f9016c424e36f8b47e2614b4a7e9eb11f186af00b9a42e',
   'ios/discord-357.0-124398.ipa':
      '221fd57cd4157bd6aff39f9977c8127729c4d6169ddb2de3535e9c154f786e40',
   'desktop/2233/macos-arm64.zip':
      '069c63e381bb41a253946812949b8d7fae09e43be3f866466cfbd9db53d43f68',
   'desktop/gbd95647/linux-x64.AppImage':
      '8c4cb5773e34e8d5c5116d8e821ccc51e6c1978636704f2143600636142b059c',
   'desktop/gb71ec80/linux-arm64.AppImage':
      'c962cbddc1904f73245cb2223621b4421e281ad68d571da93a69e63debea225e',
   'desktop/gb71ec80/windows-x64-setup.exe':
      '981e3d0622fdafd6c58733137d75e7143d1344a6296b695369fb3fca0fae60cc',
};

/** The decrypted IPA the iOS patcher was checked against. */
export const IOS_IPA = { version: '357.0', path: 'ios/discord-357.0-124398.ipa' } as const;

export const DESKTOP = [
   { os: 'windows', name: 'Windows x64', path: 'desktop/gb71ec80/windows-x64-setup.exe' },
   { os: 'linux', name: 'Linux x64', path: 'desktop/gbd95647/linux-x64.AppImage' },
   { os: 'linux', name: 'Linux arm64', path: 'desktop/gb71ec80/linux-arm64.AppImage' },
   { os: 'macos', name: 'macOS arm64', path: 'desktop/2233/macos-arm64.zip' },
] as const;

export const PACKAGE = 'com.discord';
export const SIDE_LABEL = 'Discord Phoenix';
