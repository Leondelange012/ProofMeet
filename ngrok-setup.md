# Quick Remote Access with Ngrok

## For Immediate Testing (No Deployment):

1. **Download Ngrok**: https://ngrok.com/download
2. **Expose Frontend**: `ngrok http 3000`
3. **Expose Backend**: `ngrok http 5000` (in another terminal)
4. **Share URLs** with your contributor

## Result:
- Frontend: `https://abc123.ngrok.io`
- Backend: `https://def456.ngrok.io`
- **Limitation**: URLs change each time you restart ngrok
