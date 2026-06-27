#!/bin/bash
# Development watch: polls source mtime every 1s, rebuilds when changed,
# force-touches output on Windows side to trigger Hot Reload.
#
# Usage: dev-watch.sh   (Ctrl+C to stop)

VAULT="/mnt/c/Users/wangy/Documents/Obsidian Vault"
PDIR="$VAULT/.obsidian/plugins/obsidian-gtd"
cd ~/obsidian-gtd || exit 1

touch .lastbuild
touch "$PDIR/.hotreload"
cp manifest.json styles.css "$PDIR/"

echo "Watching src/ ... (Ctrl+C to stop)"

while true; do
  LATEST=$(find src/ -type f -newer .lastbuild \( -name '*.ts' -o -name '*.css' \) 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    echo "[$(date +%H:%M:%S)] Change: ${LATEST#src/}"

    npx esbuild src/main.ts \
      --bundle --external:obsidian --external:electron \
      --external:'@codemirror/*' --external:'@lezer/*' \
      --format=cjs --target=es2021 --sourcemap=inline \
      --outfile="$PDIR/main.js" 2>&1

    if [ $? -eq 0 ]; then
      cp manifest.json styles.css "$PDIR/"
      touch .lastbuild
      # Convert Linux path to Windows path for PowerShell
      WINPATH=$(echo "$PDIR" | sed 's|/mnt/c/|C:\\|; s|/|\\|g')
      powershell.exe -Command "
        \$f1 = Get-Item '${WINPATH}\\main.js'
        \$f1.LastWriteTime = [DateTime]::Now
        Start-Sleep -Milliseconds 50
        \$f2 = Get-Item '${WINPATH}\\.hotreload'
        \$f2.LastWriteTime = [DateTime]::Now
      " 2>&1 | tail -1
    fi
  fi
  sleep 1
done
