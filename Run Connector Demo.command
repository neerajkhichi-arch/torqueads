#!/bin/bash
# Double-click to run the YouTube/Meta connector end-to-end in dry-run mode (no credentials, nothing is sent)
cd "$(dirname "$0")/connector"
DRY_RUN=1 python3 -B demo.py
echo
read -n 1 -s -r -p "Done. Press any key to close"
