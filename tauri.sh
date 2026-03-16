#!/usr/bin/env bash
set -euo pipefail

# ─── Edumark Beauty — Tauri helper ──────────────────────────
# Uso:
#   ./tauri.sh dev          Lanzar en modo desarrollo
#   ./tauri.sh build        Compilar binario release
#   ./tauri.sh deb          Generar solo .deb
#   ./tauri.sh rpm          Generar solo .rpm
#   ./tauri.sh package      Generar .deb + .rpm
#   ./tauri.sh release      Crear tag y trigger GitHub Actions (Windows)
# ─────────────────────────────────────────────────────────────

cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $*"; }
error() { echo -e "${RED}[error]${NC} $*" >&2; }

# ─── Buscar puerto libre ────────────────────────────────────
find_free_port() {
  local port=${1:-5173}
  local max=$((port + 50))
  while [ "$port" -lt "$max" ]; do
    if ! ss -tlnp 2>/dev/null | grep -q ":${port} " && \
       ! lsof -ti:"$port" &>/dev/null; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
  done
  error "No se encontro puerto libre entre $1 y $max"
  exit 1
}

# ─── Verificar dependencias ─────────────────────────────────
check_deps() {
  local missing=()
  command -v cargo  &>/dev/null || missing+=("cargo (rustup)")
  command -v node   &>/dev/null || missing+=("node")
  command -v npm    &>/dev/null || missing+=("npm")
  if [ ${#missing[@]} -gt 0 ]; then
    error "Faltan dependencias: ${missing[*]}"
    exit 1
  fi

  if [ ! -d node_modules ]; then
    info "Instalando dependencias npm..."
    npm install
  fi
}

# ─── Comandos ────────────────────────────────────────────────

cmd_dev() {
  check_deps
  local port
  port=$(find_free_port 5173)
  info "Puerto: ${BOLD}${port}${NC}"

  # Escribir devUrl dinámico en tauri.conf.json
  local conf="src-tauri/tauri.conf.json"
  local tmp
  tmp=$(mktemp)
  sed "s|\"devUrl\": \"http://localhost:[0-9]*\"|\"devUrl\": \"http://localhost:${port}\"|" "$conf" > "$tmp"
  sed -i "s|\"beforeDevCommand\": \".*\"|\"beforeDevCommand\": \"VITE_PORT=${port} npm run dev\"|" "$tmp"
  mv "$tmp" "$conf"

  info "Lanzando Tauri dev..."
  npm run tauri dev
}

cmd_build() {
  check_deps
  info "Compilando release..."
  npm run tauri build -- --no-bundle

  local bin
  bin=$(find_binary)
  ok "Binario: ${BOLD}${bin}${NC}"
  ls -lh "$bin"
}

cmd_deb() {
  check_deps
  info "Generando .deb..."
  npm run tauri build -- --bundles deb
  local deb
  deb=$(find src-tauri/target/release/bundle/deb -name '*.deb' 2>/dev/null || \
        find ~/.cargo-target/release/bundle/deb -name '*.deb' 2>/dev/null || true)
  if [ -n "$deb" ]; then
    ok "Paquete: ${BOLD}${deb}${NC}"
    ls -lh "$deb"
  else
    error "No se encontro el .deb generado"
  fi
}

cmd_rpm() {
  check_deps
  info "Generando .rpm..."
  npm run tauri build -- --bundles rpm
  local rpm
  rpm=$(find src-tauri/target/release/bundle/rpm -name '*.rpm' 2>/dev/null || \
        find ~/.cargo-target/release/bundle/rpm -name '*.rpm' 2>/dev/null || true)
  if [ -n "$rpm" ]; then
    ok "Paquete: ${BOLD}${rpm}${NC}"
    ls -lh "$rpm"
  else
    error "No se encontro el .rpm generado"
  fi
}

cmd_package() {
  check_deps
  info "Generando .deb y .rpm..."
  npm run tauri build -- --bundles deb,rpm

  info "Paquetes generados:"
  find src-tauri/target/release/bundle ~/.cargo-target/release/bundle \
    \( -name '*.deb' -o -name '*.rpm' \) 2>/dev/null | while read -r f; do
    ok "$(ls -lh "$f" | awk '{print $5, $NF}')"
  done
}

cmd_release() {
  # Leer version de tauri.conf.json
  local version
  version=$(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"\([0-9][^"]*\)".*/\1/')

  if [ -z "$version" ]; then
    error "No se pudo leer la version de tauri.conf.json"
    exit 1
  fi

  local tag="v${version}"
  info "Version: ${BOLD}${version}${NC}  Tag: ${BOLD}${tag}${NC}"

  # Verificar que no exista el tag
  if git rev-parse "$tag" &>/dev/null; then
    error "El tag ${tag} ya existe. Incrementa la version en tauri.conf.json y package.json"
    exit 1
  fi

  # Verificar que el workflow existe
  if [ ! -f .github/workflows/tauri-build.yml ]; then
    error "No existe .github/workflows/tauri-build.yml"
    exit 1
  fi

  echo ""
  echo -e "  Esto va a:"
  echo -e "    1. Crear tag ${BOLD}${tag}${NC}"
  echo -e "    2. Push del tag a origin"
  echo -e "    3. GitHub Actions compilara para Windows"
  echo ""
  read -rp "Continuar? [s/N] " confirm
  if [[ ! "$confirm" =~ ^[sS]$ ]]; then
    info "Cancelado"
    exit 0
  fi

  git tag -a "$tag" -m "Release ${tag}"
  git push origin "$tag"
  ok "Tag ${tag} pusheado. GitHub Actions compilando..."
  echo -e "  Ver progreso: ${CYAN}gh run watch${NC}"
}

find_binary() {
  local name="edumark-beauty"
  local bin
  bin=$(find src-tauri/target/release -maxdepth 1 -name "$name" -type f 2>/dev/null || \
        find ~/.cargo-target/release -maxdepth 1 -name "$name" -type f 2>/dev/null || true)
  echo "$bin"
}

# ─── Main ────────────────────────────────────────────────────
case "${1:-help}" in
  dev)      cmd_dev ;;
  build)    cmd_build ;;
  deb)      cmd_deb ;;
  rpm)      cmd_rpm ;;
  package)  cmd_package ;;
  release)  cmd_release ;;
  *)
    echo -e "${BOLD}Edumark Beauty — Tauri helper${NC}"
    echo ""
    echo "Uso: ./tauri.sh <comando>"
    echo ""
    echo "Comandos:"
    echo "  dev        Lanzar en modo desarrollo (busca puerto libre)"
    echo "  build      Compilar binario release"
    echo "  deb        Generar paquete .deb"
    echo "  rpm        Generar paquete .rpm"
    echo "  package    Generar .deb + .rpm"
    echo "  release    Crear tag y trigger build Windows en GitHub"
    ;;
esac
