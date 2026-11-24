{
  mkShellNoCC,
  gh,
  gitMinimal,
  nodejs,
  pnpm,
}:
mkShellNoCC {
  name = "sunbird-site";

  strictDeps = true;
  nativeBuildInputs = [
    gh
    gitMinimal
    nodejs
    pnpm
  ];
}
