#!/usr/bin/env bash
#
# Builds the Android app on Expo servers with EAS Build.
#
# Usage:
#   scripts/build-android.sh [preview|production]
#
# Profiles:
#   preview     Makes an APK that you can install on a device. This is the default.
#   production  Makes an AAB for Google Play.
#
# The script runs interactively because the first build must ask you to create
# the EAS project and the Android keystore.

set -euo pipefail

readonly DEFAULT_PROFILE="preview"
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly EAS_CLI=(npx --yes eas-cli@latest)

# Stops the script if the profile is not in eas.json.
#
# Arguments:
#   $1: The build profile name.
validate_profile() {
  case "$1" in
    preview | production) ;;
    *)
      echo "Unknown profile: $1. Use preview or production." >&2
      exit 1
      ;;
  esac
}

# Opens the Expo login prompt if no Expo account is logged in on this machine.
ensure_expo_login() {
  if ! "${EAS_CLI[@]}" whoami >/dev/null 2>&1; then
    "${EAS_CLI[@]}" login
  fi
}

# Starts the cloud build and waits for it to finish.
#
# Arguments:
#   $1: The build profile name.
start_cloud_build() {
  (cd "$PROJECT_ROOT" && "${EAS_CLI[@]}" build --platform android --profile "$1")
}

# Runs the build steps in order.
#
# Arguments:
#   $1: The build profile name. Optional.
main() {
  local profile="${1:-$DEFAULT_PROFILE}"

  validate_profile "$profile"
  ensure_expo_login
  start_cloud_build "$profile"
}

main "$@"
