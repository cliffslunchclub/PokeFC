#!/usr/bin/env bash
# PokéFC merged and explicitly superseded branch cleanup. Dry-run by default.
# Requires authenticated GitHub CLI (gh) and jq.
# Every removed branch gets a permanent archival TAG pointing to its exact head.
# Never delete main or the preserved archive branch; experimental branches are
# retained except for an explicitly superseded, pinned-head staging prototype.
set -euo pipefail
REPO="cliffslunchclub/PokeFC"
MODE="${1:---dry-run}"
case "$MODE" in --dry-run|--apply) ;; *) echo "Usage: $0 [--dry-run|--apply]" >&2; exit 2;; esac
command -v gh >/dev/null || { echo "GitHub CLI (gh) is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }
gh auth status -h github.com >/dev/null
echo "Repo: $REPO | Mode: $MODE"
echo "Only previously merged or explicitly superseded branches with unchanged tips are candidates."
archive_tag(){
  local branch="$1" sha="$2" tag="archive/pruned-20261106/$1" stored
  stored="$(gh api "repos/$REPO/git/ref/tags/$tag" --jq '.object.sha' 2>/dev/null || true)"
  if [[ -n "$stored" ]]; then
    [[ "$stored" == "$sha" ]] || { echo "ERROR $branch (archive tag disagrees with branch head)" >&2; return 1; }
  else
    gh api -X POST "repos/$REPO/git/refs" -f ref="refs/tags/$tag" -f sha="$sha" >/dev/null
  fi
  echo "ARCHIVED $branch -> $tag ($sha)"
}
checked=0; deleted=0; skipped=0
while IFS=$'\t' read -r branch merged_sha; do
  [[ -n "$branch" && -n "$merged_sha" ]] || continue
  case "$branch" in
    main|archive/*|experiment/*|feature/challenge-loss-penalties-drag)
      echo "KEEP $branch (protected or active research)"; ((skipped+=1)); continue ;;
    feature/*|fix/*|chore/*) ;;
    *) echo "KEEP $branch (outside cleanup scope)"; ((skipped+=1)); continue ;;
  esac
  ((checked+=1))
  tip="$(gh api "repos/$REPO/git/ref/heads/$branch" --jq '.object.sha' 2>/dev/null || true)"
  [[ -n "$tip" ]] || { echo "SKIP $branch (already removed)"; ((skipped+=1)); continue; }
  [[ "$tip" == "$merged_sha" ]] || { echo "KEEP $branch (contains newer commits)"; ((skipped+=1)); continue; }
  open_count="$(gh api "repos/$REPO/pulls?state=open&head=cliffslunchclub:$branch&per_page=100" --jq 'length')"
  [[ "$open_count" == 0 ]] || { echo "KEEP $branch (open PR)"; ((skipped+=1)); continue; }
  if [[ "$MODE" == "--apply" ]]; then
    archive_tag "$branch" "$tip"
    gh api -X DELETE "repos/$REPO/git/refs/heads/$branch" >/dev/null
    echo "DELETED $branch"; ((deleted+=1))
  else
    echo "WOULD DELETE $branch"
  fi
done < <(
  gh api --paginate "repos/$REPO/pulls?state=closed&per_page=100" |
    jq -r '.[] | select(.merged_at != null and .head.repo.full_name == "cliffslunchclub/PokeFC") | [.head.ref,.head.sha] | @tsv' |
    sort -u
)
# Superseded but NEVER merged heads must be explicitly allowlisted,
# immutable and archived before deletion. No wildcard deletions are allowed.
# The values below were audited against the current branch/PR head SHAs.
while read -r branch expected_sha; do
  [[ -n "$branch" && -n "$expected_sha" ]] || continue
  ((checked+=1))
  case "$branch" in
    main|archive/*) echo "KEEP $branch (protected)"; ((skipped+=1)); continue ;;
  esac
  tip="$(gh api "repos/$REPO/git/ref/heads/$branch" --jq '.object.sha' 2>/dev/null || true)"
  [[ -n "$tip" ]] || { echo "SKIP $branch (already removed)"; ((skipped+=1)); continue; }
  [[ "$tip" == "$expected_sha" ]] || { echo "KEEP $branch (head changed since audit)"; ((skipped+=1)); continue; }
  open_count="$(gh api "repos/$REPO/pulls?state=open&head=cliffslunchclub:$branch&per_page=100" --jq 'length')"
  [[ "$open_count" == 0 ]] || { echo "KEEP $branch (open PR)"; ((skipped+=1)); continue; }
  if [[ "$MODE" == "--apply" ]]; then
    archive_tag "$branch" "$tip"
    gh api -X DELETE "repos/$REPO/git/refs/heads/$branch" >/dev/null
    echo "DELETED SUPERSEDED $branch"; ((deleted+=1))
  else
    echo "WOULD ARCHIVE+DELETE SUPERSEDED $branch"
  fi
done <<'SUPERSEDED_BRANCHES'
feature/challenges-live-formation-preview	51b50ac137f33fc8afac0a58b2f2973678af68bb
feature/challenges-perspective-result-labels	59ce17412152864f50c752e7a4668a49a75444de
feature/challenges-result-goal-replays	2234280af68458ccc993513f3fa1145cd6a21d0b
feature/goal-replays-current-main	1f15053543f336223204d19e24529bfdf05a6e00
feature/goal-replays-quickplay-challenges	8b03947d557e1a9dfe66854f25d9373763101f36
feature/goal-replays-with-position-effectiveness	56286fca83fe856e948d61b89e60aefdbcbc601e
feature/pse-knockout-120-mainline	7ccf33b03e69ccd6fc5dd68298f41ba7b2eb7e72
feature/pse-knockout-120-watch	1f09bc8b0d0b49a68c005e83cf74720581218590
feature/pse-official-set-pieces-v1	3cc7efe2c0fab32b379d8ad1342756f24a081a8a
feature/pse-set-piece-watch-report-integration	8d14d95c811d4776f790ffd19961020618c454b1
feature/pse-shared-knockout-rules	b88165c479fff318b1bcb192e4a392e64639b4de
feature/pse-watch-shot-camera-pacing	651fb4d50dc14b0b875e7618137825dd80c53a54
feature/watch-fifa-camera-realtime-fullscreen-motion	9f83d164ea5deb2e9aa539aa3436af2bcb8b4e2c
feature/watch-official-highlights-replay	32b1dde3355ca9ac3b8e75fcb3eb2cc15388512e
experiment/phase10-soccerjs-private-staging	419c28c58c8f6df2cc4e81e7cc008a6033622141
chore/tacticmesh-retirement	9a3e5bc62f587d716eb041ee5f2326b1f4610b2c
fix/watch-ball-possession-continuity	6ac54d5d365d068aafd5b8701be7b3846fd7ca39
SUPERSEDED_BRANCHES

echo "Checked $checked candidates; deleted $deleted; skipped $skipped."
echo "Main, preserved archive branch, active PRs and unreviewed experiments remain untouched."

