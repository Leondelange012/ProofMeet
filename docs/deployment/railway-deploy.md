# Deploy ProofMeet to Railway

## Quick Deployment Steps:

1. **Create Railway Account**: Go to https://railway.app and sign up
2. **Connect GitHub**: Link your GitHub account
3. **Push Code to GitHub**: Create a repo and push ProofMeet code
4. **Deploy on Railway**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your ProofMeet repository
   - Railway will auto-detect and deploy both frontend and backend

## Environment Variables to Set:
```
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret-here
CORS_ORIGIN=https://your-frontend-url.railway.app
```

## Expected Result:
- Backend: `https://proofmeet-backend.railway.app`
- Frontend: `https://proofmeet-frontend.railway.app`
- Cost: FREE (up to $5/month usage)
