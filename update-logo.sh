#!/bin/bash

# Default logo path
LOGO_PATH="./resources/icon.png"

# Allow passing a custom logo path as an argument
if [ -n "$1" ]; then
  LOGO_PATH="$1"
fi

if [ ! -f "$LOGO_PATH" ]; then
  echo "Error: Logo file not found at $LOGO_PATH"
  echo "Usage: ./update-logo.sh [path/to/logo.png]"
  exit 1
fi

echo "✨ Generating icons from $LOGO_PATH..."
npx -y electron-icon-builder --input="$LOGO_PATH" --output=build --flatten

echo "📦 Moving generated icons to build/..."
mv build/icons/* build/
rm -rf build/icons

echo "✅ Done! The new logo has been compiled into the build/ folder."
