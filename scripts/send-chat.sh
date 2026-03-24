#!/bin/bash

# Check if required arguments are provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./scripts/send-chat.sh <USER_ID> <MESSAGE_TEXT>"
  echo "Example: ./scripts/send-chat.sh \"user_3B3nE734bK5MmA4T8SZtwE4BDSv\" \"Hello, BackForge! Can you help me create a task for 'Push Notification Testing'?\""
  USER_ID="user_3B3nE734bK5MmA4T8SZtwE4BDSv"
  TEXT="Hello, BackForge! Can you help me create a task for 'Push Notification Testing'?"
else
  USER_ID=$1
  TEXT=$2
fi

TIMEZONE=$(date +%Z)

echo "Sending message for User: $USER_ID..."
echo "Message: $TEXT"

curl -H "Content-Type: application/json" \
     -X POST "https://back-forge-ai.vercel.app/api/chat" \
     -d "{
  \"userId\": \"$USER_ID\",
  \"text\": \"$TEXT\",
  \"timezone\": \"$TIMEZONE\"
}"

echo -e "\n\nDone!"
