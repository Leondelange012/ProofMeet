#!/bin/bash

# Test Meeting Sync Script
# This script triggers a manual meeting sync and displays the results

API_URL="https://proofmeet-api-production.up.railway.app"
ADMIN_SECRET="${ADMIN_SECRET_KEY:-your-admin-secret-here}"

echo "🔄 Triggering meeting sync..."
echo "API: $API_URL/api/admin/sync-meetings"
echo ""

# Trigger sync
response=$(curl -s -X POST \
  -H "X-Admin-Secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  "$API_URL/api/admin/sync-meetings")

echo "📊 Sync Results:"
echo "$response" | jq '.'

echo ""
echo "✅ Check Railway logs for detailed sync progress"
echo ""

# Get meeting stats
echo "📈 Meeting Statistics:"
stats=$(curl -s -H "X-Admin-Secret: $ADMIN_SECRET" \
  "$API_URL/api/admin/meeting-stats")

echo "$stats" | jq '.'
