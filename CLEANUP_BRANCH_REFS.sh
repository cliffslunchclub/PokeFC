#!/usr/bin/env bash
# PokéFC two-repo archived-branch ref cleanup.
# DRY RUN is default. --apply requires an authenticated GitHub CLI.
# Historical commits are anchored in archive/* branches in both repositories.
set -euo pipefail
MODE="${1:---dry-run}"
case "$MODE" in --dry-run|--apply) ;; *) echo "Usage: $0 [--dry-run|--apply]" >&2; exit 2;; esac
command -v gh >/dev/null || { echo "Install gh and authenticate with gh auth login." >&2; exit 1; }
gh auth status -h github.com >/dev/null
gh api "repos/cliffslunchclub/PokeFC/git/ref/heads/archive/pre-cleanup-experiments-20261105" >/dev/null
gh api "repos/cliffslunchclub/pokefc-simulation/git/ref/heads/archive/phase10-experiments-20261105" >/dev/null
echo "PokéFC archived branch-ref cleanup: $MODE"
echo "This does not rewrite main, modify working files, or touch active PR #21."
checked=0; removed=0; skipped=0
while IFS='|' read -r repo branch original_sha; do
  [[ -n "$repo" && -n "$branch" && -n "$original_sha" ]] || continue
  checked=$((checked+1))
  case "$branch" in main|feature/soccerjs-watch-rebuild|archive/*)
    echo "KEEP $repo / $branch (protected)"; skipped=$((skipped+1)); continue ;;
  esac
  current_sha="$(gh api "repos/$repo/git/ref/heads/$branch" --jq '.object.sha' 2>/dev/null || true)"
  if [[ -z "$current_sha" ]]; then
    echo "SKIP $repo / $branch (already deleted)"
    skipped=$((skipped+1)); continue
  fi
  if [[ "$current_sha" != "$original_sha" ]]; then
    echo "KEEP $repo / $branch (changed after archive snapshot)"
    skipped=$((skipped+1)); continue
  fi
  if [[ "$branch" == "gh-pages" ]]; then
    if gh api "repos/$repo/pages" >/dev/null 2>&1; then
      echo "KEEP $repo / gh-pages (disable GitHub Pages in repository Settings first)"
      skipped=$((skipped+1)); continue
    fi
  fi
  if [[ "$repo" == "cliffslunchclub/PokeFC" ]]; then
    open="$(gh api "repos/$repo/pulls?state=open&head=cliffslunchclub:$branch&per_page=100" --jq 'length')"
    if [[ "$open" != "0" ]]; then
      echo "KEEP $repo / $branch (still has an open PR)"
      skipped=$((skipped+1)); continue
    fi
  fi
  if [[ "$MODE" == "--apply" ]]; then
    gh api -X DELETE "repos/$repo/git/refs/heads/$branch" >/dev/null
    echo "DELETED $repo / $branch"
    removed=$((removed+1))
  else
    echo "WOULD DELETE $repo / $branch"
  fi
done <<'PFC_ARCHIVED_BRANCHES'
cliffslunchclub/PokeFC|experiment/phase9-dual-engine-calibration|4b816ab9192af755b748185cdd95baa12bec360b
cliffslunchclub/PokeFC|experiment/phase10-match-director|e7647aaaf2c52d47e2784c883bb45125e2b45c18
cliffslunchclub/PokeFC|experiment/phase10-soccerjs-overnight|dd77d4e90b31c691ea5446b69fc3061a9204e771
cliffslunchclub/PokeFC|experiment/phase10-soccerjs-private-staging|419c28c58c8f6df2cc4e81e7cc008a6033622141
cliffslunchclub/PokeFC|feature/challenge-compact-road-ratings|d99f7a8bd1582ad9a77b10410ec79a416b54dc2b
cliffslunchclub/PokeFC|feature/challenge-item-sprites-primal-drag-fix|12d2af2526ff70c81d38d54e8682f237afc9fd87
cliffslunchclub/PokeFC|feature/challenge-live-event-commentary|4c4fa5a157d39d5e071519498514339cfe7b849b
cliffslunchclub/PokeFC|feature/challenge-locked-opponent-sog-item-filters|3809da38be8ba7acdd2cf0f39351274681a3799d
cliffslunchclub/PokeFC|feature/challenge-loss-penalties-drag|af11449fb1209d3e5e95650caf19cedc19fa9550
cliffslunchclub/PokeFC|feature/challenge-opponent-pitch|2cebed9c26c58950aa15677e30a30d8fd26f66dc
cliffslunchclub/PokeFC|feature/challenge-position-fit-effective-stats|73bf65bc6692b3eb8c9e7c54b6416607ff5e5a7f
cliffslunchclub/PokeFC|feature/challenge-sprite-only-drag|32762ffb3b89680f4cba33487702f476c3798336
cliffslunchclub/PokeFC|feature/challenges-affordable-catalog-unique-rerolls|a84d67164f26f9c392d3e0cf5085c7d94e6225f6
cliffslunchclub/PokeFC|feature/challenges-compact-desktop-picker|ad32fcd834a0f47fb6216e5c24804acd1b9f6777
cliffslunchclub/PokeFC|feature/challenges-draggable-item-shop|7125af9d313fd8283d5a01780299398c35cb7ed7
cliffslunchclub/PokeFC|feature/challenges-endmatch-recap-timeline-scroll|f1f47894ec03ec30a4817d545d04ea6cc9bd5ee7
cliffslunchclub/PokeFC|feature/challenges-gauntlet-match-actions-st-first|71dafb034fd2eef3f689d6c3ab8a300531ad4e31
cliffslunchclub/PokeFC|feature/challenges-native-modals|4f9d5f63edaf7942af3bb22f8fae81b81cc83357
cliffslunchclub/PokeFC|feature/challenges-player-sog-auto-equip|5b7484b509b6a2fe757b26520dacc13190b5ad27
cliffslunchclub/PokeFC|feature/challenges-shop-price-desc-alpha|b33cc7244976fb51bed4dba91fa975b3aa2f23ed
cliffslunchclub/PokeFC|feature/challenges-v2-draggable-picker-mobile-draft|5b1673cb13ba15f96b9d0946d899ed5e92d275c1
cliffslunchclub/PokeFC|feature/challenges-v2-full-pitch-floating-panels|e234285500937e883bebaea58d6d0465e3d3b00c
cliffslunchclub/PokeFC|feature/challenges-v2-result-and-pokemon-modals|24b4907a0b5d0e7d328337d46b5b81b1b5a65e11
cliffslunchclub/PokeFC|feature/unified-match-timeline-no-provenance-tags|f61088da71a6af30c3f9dab676dc49e2b6e95c17
cliffslunchclub/pokefc-simulation|experiment/phase10-isometric-match-director|a7d2005a9fac7b20a601cf7c4a023d187a228a19
cliffslunchclub/pokefc-simulation|experiment/phase10-knockout-baseline|520d3fda8e38a9f034492efb4e6673a3fa473b58
cliffslunchclub/pokefc-simulation|experiment/phase10-pokemon-sprites|7e0a01bd3c5f37626f221e20438ce1763038d9df
cliffslunchclub/pokefc-simulation|experiment/phase10-watch-handoff-browser|58a5f67dfaf47297920202522c5e00f81a7b24ba
cliffslunchclub/pokefc-simulation|gh-pages|aef3a1ffb4f8366582c58db16d192d912ed1a802
PFC_ARCHIVED_BRANCHES
echo "Checked: $checked | Deleted: $removed | Skipped: $skipped"
echo "Reminder: GitHub Pages settings are separate from gh-pages branch content."
