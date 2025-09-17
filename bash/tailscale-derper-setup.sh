#!/usr/bin/env bash
# tailscale-derper-setup.sh
# Script to install/build/run a Tailscale DERP (derper) server.
# Usage: ./tailscale-derper-setup.sh <step>
# Steps:
#   1 - Install or prepare derper binary
#   2 - Prepare certificates (existing or self-signed)
#   3 - Show derper run command
#   4 - Output derp-map JSON and systemd service file

set -euo pipefail
IFS=$'\n\t'

# ======== User-configurable variables ========
DERP_HOST="a.com"
DERP_PORT=19277
STUN_PORT=19277
CERT_DIR="/root/niv"
DERP_USER="root"
BIN_DEST_DIR="/usr/bin"         # where to install derper binary if custom
USE_CUSTOM_BIN=true              # true=use ./derper, false=build with go
VERIFY_CLIENTS=true              # default enable --verify-clients
SHORT_NAME="mvp"
SERVICE_FILE="/etc/systemd/system/derper.service"

DERP_CERT_CRT="${CERT_DIR}/${DERP_HOST}.crt"
DERP_CERT_KEY="${CERT_DIR}/${DERP_HOST}.key"

# ======== Helper functions ========
info(){ echo -e "[INFO] $*"; }
warn(){ echo -e "[WARN] $*"; }
err(){ echo -e "[ERROR] $*"; exit 1; }

# Step 1: install Go or use local binaries
step1(){
  echo "=== Step 1: Obtain derper binary ==="
  if [[ "${USE_CUSTOM_BIN}" == true ]]; then
    if [[ -x ./derper ]]; then
      sudo mv ./derper "${BIN_DEST_DIR}/derper"
      info "Moved custom derper to ${BIN_DEST_DIR}/derper"
    else
      err "Custom binary not found."
    fi
  else
    if ! command -v go >/dev/null 2>&1; then
      info "Installing latest Go..."
      GO_VER=$(curl -s https://go.dev/VERSION?m=text | head -n1 | sed 's/go//')
      wget -q https://go.dev/dl/go${GO_VER}.linux-amd64.tar.gz
      sudo rm -rf /usr/local/go
      sudo tar -C /usr/local -xzf go${GO_VER}.linux-amd64.tar.gz
      rm -f go${GO_VER}.linux-amd64.tar.gz
      export PATH="$PATH:/usr/local/go/bin"
    fi
    info "Installing derper via go install"
    export GOPROXY=${GOPROXY:-https://goproxy.cn,direct}
    go install tailscale.com/cmd/derper@latest
    if [[ -x "$HOME/go/bin/derper" ]]; then
      sudo ln -sf "$HOME/go/bin/derper" "${BIN_DEST_DIR}/derper"
      info "Linked derper binary to ${BIN_DEST_DIR}/derper"
    else
      err "go install did not produce derper binary."
    fi
  fi
}

# Step 2: Prepare certificates
step2(){
  echo "=== Step 2: Certificate preparation ==="
  echo "Looking for cert files in ${CERT_DIR}"
  read -rp "Use existing cert files? [y/N] " use_existing
  if [[ "${use_existing,,}" =~ ^y ]]; then
    if [[ ! -f "${DERP_CERT_CRT}" || ! -f "${DERP_CERT_KEY}" ]]; then
      err "Cert files not found."
    fi
    info "Using existing certs."
  else
    read -rp "Generate self-signed cert? [Y/n] " selfsign
    if [[ ! "${selfsign,,}" =~ ^n ]]; then
      mkdir -p "${CERT_DIR}"
      openssl genpkey -algorithm RSA -out "${DERP_CERT_KEY}"
      openssl req -new -key "${DERP_CERT_KEY}" -out "${CERT_DIR}/${DERP_HOST}.csr" -subj "/CN=${DERP_HOST}"
      openssl x509 -req -days 3650 -in "${CERT_DIR}/${DERP_HOST}.csr" -signkey "${DERP_CERT_KEY}" -out "${DERP_CERT_CRT}" -extfile <(printf "subjectAltName=DNS:${DERP_HOST}")
      rm -f "${CERT_DIR}/${DERP_HOST}.csr"
      info "Self-signed cert created at ${CERT_DIR}"
    else
      err "No certs available."
    fi
  fi
}

# Step 3: Show derper command
step3(){
  echo "=== Step 3: Derper run command ==="
  VERIFY_FLAG=""
  if [[ "${VERIFY_CLIENTS}" == true ]]; then
    VERIFY_FLAG="--verify-clients"
  fi

  CMD="${BIN_DEST_DIR}/derper -a :${DERP_PORT} -http-port -1 -stun-port ${STUN_PORT} -hostname ${DERP_HOST} --certmode manual -certdir ${CERT_DIR} ${VERIFY_FLAG}"
  echo "Run this command to start derper:"
  echo "  ${CMD}"
}

# Step 4: Output derp-map JSON and systemd service file
step4(){
  echo "=== Step 4: DERP map JSON ==="
  IPV4=$(curl -s 4.ipw.cn || echo "127.0.0.1")
  REGION_ID=933
  cat <<EOF
{
  "Regions": {
    "${REGION_ID}": {
      "RegionID": ${REGION_ID},
      "RegionCode": "${SHORT_NAME}",
      "Nodes": [
        {
          "Name": "${SHORT_NAME}",
          "RegionID": ${REGION_ID},
          "HostName": "${DERP_HOST}",
          "IPv4": "${IPV4}",
          "DERPPort": ${DERP_PORT},
          "STUNPort": ${STUN_PORT},
          "InsecureForTests": true,
          "CanPort80": false
        }
      ]
    }
  }
}
EOF

  echo "=== Step 4: systemd service file ==="
  VERIFY_FLAG=""
  if [[ "${VERIFY_CLIENTS}" == true ]]; then
    VERIFY_FLAG="--verify-clients"
  fi
  SERVICE_CONTENT="[Unit]\nDescription=Tailscale derper service\nAfter=network.target\n\n[Service]\nType=simple\nUser=${DERP_USER}\nExecStart=${BIN_DEST_DIR}/derper -a :${DERP_PORT} -http-port -1 -stun-port ${STUN_PORT} -hostname ${DERP_HOST} --certmode manual -certdir ${CERT_DIR} ${VERIFY_FLAG}\nRestart=on-failure\nRestartSec=5\n\n[Install]\nWantedBy=multi-user.target\n"
  echo "--- systemd service content ---"
  echo -e "${SERVICE_CONTENT}"
  read -rp "Write to ${SERVICE_FILE} and enable? [y/N] " write_service
  if [[ "${write_service,,}" =~ ^y ]]; then
    tmpfile=$(mktemp)
    echo -e "${SERVICE_CONTENT}" > "${tmpfile}"
    sudo mv "${tmpfile}" "${SERVICE_FILE}"
    sudo systemctl daemon-reload
    sudo systemctl enable --now derper.service
    info "Service installed."
  fi
}

# Main dispatcher
case "${1:-all}" in
  1) step1 ;;
  2) step2 ;;
  3) step3 ;;
  4) step4 ;;
  all) step1; step2; step3; step4 ;;
  *)
    cat <<USAGE
Usage: $0 <step>
Steps:
  1 - Obtain derper
  2 - Prepare certificate
  3 - Show derper run command
  4 - Output DERP map JSON & systemd service file
USAGE
    ;;
esac
