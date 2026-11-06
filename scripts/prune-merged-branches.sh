#!/usr/bin/env bash
# PokéFC merged-feature branch cleanup. Dry-run is the default.
# Requires authenticated GitHub CLI (gh) and jq; never deletes experimental branches.
set -euo pipefail
REPO="cliffslunchclub/PokeFC"
MODE="${1:---dry-run}"
case "$MODE" in --dry-run|--apply) ;; *) echo "Usage: $0 [--dry-run|--apply]" >&2; exit 2;; esac
command -v gh >/dev/null || { echo "GitHub CLI (gh) is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }
gh auth status -h github.com >/dev/null
echo "Repo: $REPO | Mode: $MODE"
echo "Only merged PR branches with unchanged tip SHAs are candidates."
checked=0; deleted=0; skipped=0
while IFS=$'\t' read -r branch merged_sha; do
  [[ -n "$branch" && -n "$merged_sha" ]] || continue
  case "$branch" in
    main|archive/*|experiment/*|feature/challenge-loss-penalties-drag|feature/challenges-result-goal-replays|feature/pokefc-enclosed-pitch-no-whistles)
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
echo "Checked $checked candidates; deleted $deleted; skipped $skipped."
echo "Main, archive/experiment branches, active PRs and the public repo remain untouched."
