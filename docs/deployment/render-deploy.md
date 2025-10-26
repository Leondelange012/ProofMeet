# Deploy ProofMeet to Render

## Simple All-in-One Deployment:

1. **Create Render Account**: https://render.com
2. **Connect GitHub**: Link your repository
3. **Create Web Service**:
   - Select your repo
   - Choose "Docker" or "Node.js"
   - Set build command: `cd backend && npm install && npm run build`
   - Set start command: `cd backend && npm start`

## Environment Variables:
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-production-secret
```

## Result:
- **URL**: `https://proofmeet.onrender.com`
- **Cost**: FREE tier available (spins down after inactivity)
- **Database**: Can add PostgreSQL for $7/month
