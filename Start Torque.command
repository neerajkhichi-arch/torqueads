#!/bin/bash
# Double-click this file in Finder to run the Torque prototype on http://localhost:8080
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is needed. macOS will now offer to install the Command Line Tools — click Install, then double-click this file again."
  xcode-select --install
  read -n 1 -s -r -p "Press any key to close"
  exit 1
fi
python3 serve.py
