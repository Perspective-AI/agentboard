#!/usr/bin/env bash
#
# Agentboard installer
# Usage: curl -fsSL agentboard.sh/install | sh
#

set -euo pipefail

REPO="https://github.com/Perspective-AI/agentboard.git"
INSTALL_DIR="${AGENTBOARD_DIR:-$HOME/agentboard}"

info()  { printf "\033[1;34m==>\033[0m %s\n" "$1"; }
error() { printf "\033[1;31merror:\033[0m %s\n" "$1" >&2; exit 1; }

# --- Pre-flight checks ---

command -v git >/dev/null 2>&1 || error "git is required but not installed"

PKG=""
if command -v bun >/dev/null 2>&1; then
  PKG="bun"
elif command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -ge 18 ]; then
    PKG="npm"
  else
    error "Node.js 18+ is required (found v$NODE_VERSION). Install bun or update Node."
  fi
else
  error "bun or Node.js 18+ is required. Install one of them first."
fi

# --- Clone ---

if [ -d "$INSTALL_DIR" ]; then
  info "Directory $INSTALL_DIR already exists — pulling latest"
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  info "Cloning agentboard into $INSTALL_DIR"
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# --- Install dependencies ---

info "Installing dependencies with $PKG"
if [ "$PKG" = "bun" ]; then
  bun install
else
  npm install
fi

# --- Build ---

info "Building agentboard"
if [ "$PKG" = "bun" ]; then
  bun run build
else
  npm run build
fi

# --- Done ---

echo ""
info "Agentboard installed successfully!"
echo ""
echo "  Start the server:"
echo ""
if [ "$PKG" = "bun" ]; then
  echo "    cd $INSTALL_DIR && bun run start"
else
  echo "    cd $INSTALL_DIR && npm start"
fi
echo ""
echo "  Then open http://localhost:4040"
echo ""
