# Deploy ProofMeet to Vercel + Railway

## Best Setup for Remote Testing:

### Backend on Railway:
1. Go to https://railway.app
2. Deploy backend only
3. Get backend URL: `https://proofmeet-backend.railway.app`

### Frontend on Vercel:
1. Go to https://vercel.com
2. Connect GitHub repo
3. Deploy frontend
4. Set environment variable: `VITE_API_BASE_URL=https://proofmeet-backend.railway.app/api`

## Result:
- **Frontend**: `https://proofmeet.vercel.app` (fast global CDN)
- **Backend**: `https://proofmeet-backend.railway.app` (reliable API)
- **Cost**: FREE for both services
