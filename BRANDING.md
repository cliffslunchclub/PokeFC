# PokeFC — Project naming and compatibility

**Current project/product name:** PokeFC (previously FUTBOL XI)

**Local project directory:** `PokeFC-v0.8b1-local/`.
**Main page / app header:** PokeFC.
**Save exports:** `PokeFC-v08-<seed>.json`.

The old `futbol-xi-*` browser storage keys and `FXI_*` JavaScript namespaces are
intentionally preserved for backward compatibility with existing careers,
old exported saves, and benchmark tooling. Do not rename these casually.

Historical changelog content has only had the product title updated. Original
TacticMesh upstream files, licenses, source locks, and fixture reports remain
unchanged, as do Pokémon attributes, IVs, match settings, rules and seeds.

The connected private GitHub repository `cliffslunchclub/pokefc-simulation` is
specifically a simulation benchmark repository, not the same as this local
PokeFC game package. Its repository name has not been changed remotely.
To rename it yourself on GitHub (if intended), use its Settings > General >
Repository name and enter `PokeFC`. Consider keeping benchmark-only tooling
in `pokefc-simulation` if the main game will use a separate repository.
