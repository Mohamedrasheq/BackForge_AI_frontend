#!/bin/bash

# Configuration with defaults
USER_ID=${1:-"user_3B3nE734bK5MmA4T8SZtwE4BDSv"}
PUSH_TOKEN=${2:-"ExponentPushToken[BnqINILV09nkN4xvAmpo0h]"}
PLATFORM=${3:-"android"}

echo "Registering Push Token for User: $USER_ID..."
echo "Token: $PUSH_TOKEN"
echo "Platform: $PLATFORM"

curl -H "Content-Type: application/json" \
     -X POST "https://back-forge-ai.vercel.app/api/register-device" \
     -d "{
  \"userId\": \"$USER_ID\",
  \"pushToken\": \"$PUSH_TOKEN\",
  \"platform\": \"$PLATFORM\"
}"

echo -e "\n\nDone!"
