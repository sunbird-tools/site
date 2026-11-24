{
  mkShellNoCC,
  gh,
  nodejs,
  pnpm,
}:
mkShellNoCC {
  name = "sunbird-site";

  strictDeps = true;
  nativeBuildInputs = [
    gh
    nodejs
    pnpm
  ];
}
