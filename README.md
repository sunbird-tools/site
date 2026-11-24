# sunbird.tools

The site for [sunbird](https://github.com/sunbird-tools/sunbird). It patches Discord's Phoenix
client in the browser and serves the files that installed builds check for updates.

The patcher, the loader libraries and the plugin bundles come from sunbird's `site` release, which
its CI publishes on every push to `main`. This repo checks that release every 10 minutes and
redeploys when it changed.

## Local

```sh
nix develop
pnpm install
nu scripts/fetch.nu                 # or: nu scripts/fetch.nu ../sunbird after a local site build there
pnpm check
pnpm build
node tools/dev-server.ts <dir with base.apk, config.*.apk>
```

`worker/proxy.ts` is the Cloudflare Worker that adds CORS headers to the APK tracker.
