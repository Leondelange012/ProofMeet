# Test Finalization Service Locally

## Quick Local Test:

1. **Start your local backend:**
```bash
cd backend
npm run dev
```

2. **In another terminal, trigger finalization manually:**
```bash
curl -X POST http://localhost:5000/api/court-rep/finalize-pending-meetings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Replace `YOUR_TOKEN_HERE` with your actual token from:
- Browser console: `JSON.parse(localStorage.getItem('proofmeet-auth-v2')).token`

3. **Watch the console output** - you'll see all the detailed logs immediately!

## Get Your Token:

1. Open browser console on Court Rep Dashboard
2. Run: `JSON.parse(localStorage.getItem('proofmeet-auth-v2')).token`
3. Copy the token value
4. Use it in the curl command above

## Alternative - Use Browser:

On Court Rep Dashboard, open console and run:
```javascript
fetch('http://localhost:5000/api/court-rep/finalize-pending-meetings', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + JSON.parse(localStorage.getItem('proofmeet-auth-v2')).token
  }
}).then(r => r.json()).then(console.log)
```

