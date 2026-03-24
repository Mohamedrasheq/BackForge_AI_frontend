#!/bin/bash

# Check if token is provided
if [ -z "$1" ]; then
  echo "Usage: ./scripts/send-push.sh <EXPO_PUSH_TOKEN> [TITLE] [BODY]"
  echo "Example: ./scripts/send-push.sh \"ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]\" \"Hello\" \"This is a test\""
  exit 1
fi

TOKEN=${1:-"ExponentPushToken[BnqINILV09nkN4xvAmpo0h]"}
TITLE=${2:-"BackForge AI Test"}
BODY=${3:-"Test notification from terminal"}

echo "Sending push notification to $TOKEN..."

curl -H "Content-Type: application/json" \
     -X POST "https://exp.host/--/api/v2/push/send" \
     -d "{
  \"to\": \"$TOKEN\",
  \"title\": \"$TITLE\",
  \"body\": \"$BODY\",
  \"data\": { \"screen\": \"home\" },
  \"sound\": \"default\",
  \"priority\": \"high\"
}"

echo -e "\nDone!"
