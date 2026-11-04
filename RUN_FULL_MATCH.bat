@echo off
cd /d "%~dp0"
py -3 run_full_match.py
IF ERRORLEVEL 1 (
  echo The full 90-minute benchmark has NOT passed. See errors above.
) ELSE (
  echo Full-match test ended; check benchmark-90min-results.json.
)
pause
