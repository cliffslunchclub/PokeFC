#!/bin/zsh
cd -- "$(dirname "$0")" || exit 1
python3 run_full_match.py
status=$?
if [ "$status" -eq 0 ]; then
  echo '\nFinished. See benchmark-90min-results.json for verified stats.'
else
  echo '\nThe full 90-minute benchmark has NOT passed. See the error above.'
fi
echo 'Press Return to close this window.'
read answer
exit "$status"
