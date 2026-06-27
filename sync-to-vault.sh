#!/bin/bash
# Build and sync to Windows Obsidian vault
VAULT="/mnt/c/Users/wangy/Documents/Obsidian Vault"
PLUGIN_DIR="$VAULT/.obsidian/plugins/gtd-workflow"

cd ~/gtd-workflow
npm run build
cp main.js manifest.json styles.css "$PLUGIN_DIR/"
touch "$PLUGIN_DIR/.hotreload"
echo "Synced to $PLUGIN_DIR"
