#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.local.yml"
SUPABASE_PROJECT_ID="ummense-dr-local"

print_usage() {
  cat <<'EOF'
Usage: ./scripts/local-infra.sh <command>

Commands:
  up      Start Redis + Supabase local stack and apply migrations/seeds
  down    Stop Redis + Supabase local stack
  reset   Reset local DB to migrations + seed and flush Redis
  seed    Re-apply local seed data (via supabase db reset)
  status  Show Redis + Supabase status
EOF
}

ensure_tools() {
  command -v docker >/dev/null 2>&1 || {
    echo "[infra] docker não encontrado."
    exit 1
  }
  command -v supabase >/dev/null 2>&1 || {
    echo "[infra] supabase CLI não encontrado."
    exit 1
  }
}

run_supabase_reset_with_retries() {
  local max_attempts=3
  local attempt=1

  while [[ "${attempt}" -le "${max_attempts}" ]]; do
    if (cd "${ROOT_DIR}" && supabase db reset --yes); then
      return 0
    fi

    if [[ "${attempt}" -lt "${max_attempts}" ]]; then
      echo "[infra] supabase db reset falhou (tentativa ${attempt}/${max_attempts}). Aguardando stack estabilizar..."
      sleep 12
    fi

    attempt=$((attempt + 1))
  done

  echo "[infra] Falha ao resetar Supabase após ${max_attempts} tentativas."
  return 1
}

up() {
  echo "[infra] Subindo Redis..."
  docker compose -f "${COMPOSE_FILE}" up -d redis

  echo "[infra] Subindo Supabase local..."
  (cd "${ROOT_DIR}" && supabase start)

  echo "[infra] Aplicando migrations + seed..."
  run_supabase_reset_with_retries

  echo "[infra] Validando conectividade Redis (backend + websocket)..."
  node "${ROOT_DIR}/scripts/check-redis-connectivity.mjs"

  echo "[infra] Stack local pronto."
}

down() {
  echo "[infra] Derrubando Supabase local (${SUPABASE_PROJECT_ID})..."
  (cd "${ROOT_DIR}" && supabase stop --project-id "${SUPABASE_PROJECT_ID}" || true)

  echo "[infra] Derrubando Redis local..."
  docker compose -f "${COMPOSE_FILE}" down
}

reset() {
  echo "[infra] Resetando banco local (migrations + seed)..."
  run_supabase_reset_with_retries

  echo "[infra] Limpando Redis local..."
  docker compose -f "${COMPOSE_FILE}" exec -T redis redis-cli FLUSHALL >/dev/null

  echo "[infra] Validando conectividade Redis (backend + websocket)..."
  node "${ROOT_DIR}/scripts/check-redis-connectivity.mjs"
}

seed() {
  echo "[infra] Reaplicando seed via reset local..."
  run_supabase_reset_with_retries
}

status() {
  echo "[infra] Redis containers:"
  docker compose -f "${COMPOSE_FILE}" ps
  echo
  echo "[infra] Supabase status:"
  (cd "${ROOT_DIR}" && supabase status || true)
}

main() {
  ensure_tools

  local cmd="${1:-}"
  case "${cmd}" in
    up) up ;;
    down) down ;;
    reset) reset ;;
    seed) seed ;;
    status) status ;;
    *)
      print_usage
      exit 1
      ;;
  esac
}

main "$@"
