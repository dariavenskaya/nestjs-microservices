#!/bin/sh
set -eu
mkdir -p "${DATA_DIR:-/data}" "${UPLOAD_DIR:-/uploads}"
chown node:node "${DATA_DIR:-/data}" "${UPLOAD_DIR:-/uploads}"
exec su-exec node node dist/service-a/src/main.js
