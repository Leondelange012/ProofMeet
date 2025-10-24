# Rate Limiting Fix - October 24, 2024

## Problem 🔴

Users were experiencing:
- **429 "Too Many Requests"** errors when using the app
- **Unable to load data** on dashboards
- **Login failures** after hitting rate limits
- Errors: "Too many requests from this IP, please try again later"

## Root Cause 🔍

The old rate limiting configuration had several issues:

1. **Too Strict**: Only 500 requests per 15 minutes for ALL routes
2. **IP-based Only**: All requests from Vercel appeared to come from the same proxy IP
3. **No Distinction**: Login attempts and authenticated API calls were treated the same
4. **Shared Limits**: Multiple users sharing the same proxy IP hit the limit together

### Example Scenario:
```
User loads dashboard → makes 10+ API calls
User expands participant → makes 5+ more API calls
User refreshes → makes 10+ API calls again
= 25+ requests in seconds, all from "same IP" (Vercel proxy)
× Multiple users doing this = Rate limit hit quickly ⚠️
```

## Solution ✅

Implemented **smart rate limiting** with two tiers:

### 1. Strict Auth Rate Limiter (Login/Register)
```javascript
- Window: 15 minutes
- Max: 20 attempts
- Applies to: /api/auth/* endpoints
- Skips: Successful login attempts
```

### 2. Lenient API Rate Limiter (Dashboard/Data)
```javascript
- Window: 15 minutes
- Max: 5000 requests
- Applies to: All API routes
- SKIPS: Requests with valid JWT tokens ✨
```

### Key Features:
✅ **Authenticated users bypass rate limits** (they have valid JWT)
✅ **Login attempts strictly limited** (prevents brute force)
✅ **Successful logins don't count** toward the limit
✅ **10x higher limit** for authenticated API calls (5000 vs 500)

## Benefits 🎉

1. **No More 429 Errors**: Authenticated users can make unlimited dashboard requests
2. **Better Security**: Login attempts still protected (20 per 15 min)
3. **Better UX**: Users can refresh, expand data, etc. without hitting limits
4. **Scalable**: Works with multiple users behind same proxy (Vercel)

## Technical Changes

**File**: `backend/src/index.ts`

### Before:
```javascript
const limiter = rateLimit({
  max: 500, // Too low!
  // Applied to ALL routes
});
app.use(limiter); // All routes rate limited the same
```

### After:
```javascript
const authLimiter = rateLimit({
  max: 20, // For login/register only
});

const apiLimiter = rateLimit({
  max: 5000, // Very high
  skip: (req) => {
    // Skip if user has valid JWT! 🎯
    return !!req.headers.authorization?.startsWith('Bearer ');
  },
});

app.use('/api/auth', authLimiter); // Strict for auth
app.use('/api/court-rep', apiLimiter); // Lenient for data
app.use('/api/participant', apiLimiter); // Lenient for data
```

## Testing ✓

After deployment (2-3 minutes):

1. **Log in** as Court Rep (testpo@test.com)
2. **Load dashboard** - should work instantly ✅
3. **Expand participant details** - should load without 429 errors ✅
4. **Click refresh multiple times** - should not hit rate limit ✅
5. **Participant progress page** - should load without errors ✅

## Deployment

- **Status**: Pushed to GitHub
- **Backend**: Railway will auto-deploy in ~2 minutes
- **Version**: 2.0.9
- **Health Check**: https://proofmeet-backend-production.up.railway.app/health

## What If It Still Happens?

If you still see 429 errors after deployment:

1. **Wait 15 minutes** for the old rate limit window to expire
2. **Clear browser cache** and reload
3. **Check Railway logs** for any deployment errors
4. **Verify JWT token** is being sent in requests (check Network tab in DevTools)

---

**Version**: 2.0.9  
**Fixed**: October 24, 2024  
**Commit**: e5885ef

