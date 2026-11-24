# Puts what sunbird-tools/sunbird builds where the site reads it: the patcher
# as wasm into src/pkg for the worker to import, and the loader libraries, the
# plugin bundles with their index and version.json into public/. With no
# argument it takes site.tar.gz from assets.sunbird.tools, with one it copies
# a local checkout's web/ after `nu scripts/site.nu web` and
# bundle-plugins.mjs ran there.

def main [checkout?: path] {
   let root = $env.FILE_PWD | path dirname
   let staging = mktemp -d
   if $checkout == null {
      ^curl -fsSL https://assets.sunbird.tools/site.tar.gz | ^tar xz -C $staging
   } else {
      let web = $checkout | path expand | path join web
      for item in [pkg plugins version.json] { cp -r ($web | path join $item) $staging }
   }

   let pkg = $root | path join src pkg
   let public = $root | path join public
   rm -rf $pkg ($public | path join plugins) ($public | path join version.json)
   mkdir $public
   mv ($staging | path join pkg) $pkg
   mv ($staging | path join plugins) ($staging | path join version.json) $public
   rm -r $staging
}
