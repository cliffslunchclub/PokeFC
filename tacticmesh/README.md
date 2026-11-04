# TacticMesh local runtime

Official upstream repository: https://github.com/noddy703/tacticmesh

Runtime uses the upstream engine source files **unchanged**. The original
TacticMesh MIT license and THIRD_PARTY_NOTICES are retained during installation.
Pinned commit: `603312dcf037bed0b0c817f8ba8a194eaebce8da` (2026-10-11).

One-time installation (from project root):

    python3 tacticmesh/install_engine.py

If you already have a local clone of the original TacticMesh repository, no
internet is required:

    python3 tacticmesh/install_engine.py --source /path/to/tacticmesh

The game never needs SiteGround, PocketBase, a cloud server, or a remote API.
The TacticMesh engine is computationally expensive: a watched full 90-minute
fixture can be slow, even with the visuals disabled. The quick statistical sim
remains separate and fast. While this project uses upstream APIs, TacticMesh
explicitly does not promise a stable external SDK, so upgrades require tests.

Note: the upstream author is Energen Games, original code copyright attribution
is contained in the copied upstream LICENSE. Pokémon art/IP is separate and
not included in the engine vendor files.
