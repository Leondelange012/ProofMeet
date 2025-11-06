#!/bin/bash
# Manual trigger for Railway redeployment
# Usage: bash scripts/trigger-redeploy.sh

echo "🚀 Triggering Railway redeployment..."
echo "This will force rebuild and restart the backend service"

# Make a dummy change to trigger redeploy
date > .railway-deploy-trigger
git add .railway-deploy-trigger
git commit -m "Trigger Railway redeploy - $(date)"
git push origin main

echo "✅ Push complete. Railway will automatically detect and redeploy."
echo "Monitor deployment at: https://railway.app"

