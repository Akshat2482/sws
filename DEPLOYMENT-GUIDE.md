# Smart Weather Station - Server Deployment Guide

## Problem
Your web page is hosted on AWS S3, but the notification server needs to run somewhere accessible to the internet. Currently, it's hardcoded to `localhost:3000`, which only works on your local machine.

## Solution
Deploy your server to a cloud platform and update your frontend to use the deployed URL.

---

## Option 1: Deploy to Heroku (Recommended - Free Tier Available)

### Step 1: Install Heroku CLI
Download and install from: https://devcenter.heroku.com/articles/heroku-cli

### Step 2: Login to Heroku
```bash
heroku login
```

### Step 3: Create a Heroku App
```bash
cd "C:\Akshat 2025\sws"
heroku create sws-notification-server
```
(Replace `sws-notification-server` with your preferred app name)

### Step 4: Set Environment Variables
```bash
heroku config:set AWS_IOT_ENDPOINT=a2jxq81rsqt8vu-ats.iot.us-east-1.amazonaws.com
heroku config:set AWS_REGION=us-east-1
heroku config:set AWS_IOT_TOPIC=sws-data
heroku config:set VAPID_PUBLIC_KEY=BDvqN8ASdjk6gruoXAD4u49xp6V3eT_RbhOEn6rtaLiszyRCyFhWCd_ZaawuuPh-PEeg2qe76rUFlWTx-ajz-DA
heroku config:set VAPID_PRIVATE_KEY=1lADGPHf91LvCFcHKJykI2AgzAnLgyoTSs-h17NdzKI
heroku config:set VAPID_SUBJECT=mailto:akshat@smartweatherstation.com
```

### Step 5: Add AWS IoT Certificates
You need to upload your certificates. Create a `certs` folder in your project:
```bash
# Make sure your certs folder exists and contains:
# - private.pem.key
# - certificate.pem.crt
# - AmazonRootCA1.pem
```

**IMPORTANT**: Since Heroku doesn't support file uploads directly, you have two options:

#### Option A: Use AWS Secrets Manager (Recommended for Production)
Store certificates in AWS Secrets Manager and fetch them in your server code.

#### Option B: Commit Certs to Private Repo (Quick Solution)
If this is a school project and security isn't critical:
```bash
# Remove certs from .gitignore temporarily
# Commit and push (make sure repo is PRIVATE!)
git add certs/
git commit -m "Add certificates for deployment"
```

### Step 6: Deploy to Heroku
```bash
git push heroku develop:main
```

### Step 7: Check if Server is Running
```bash
heroku logs --tail
heroku open
```

Your server URL will be: `https://sws-notification-server.herokuapp.com`

### Step 8: Update Frontend Code
Edit `index.html` line 677 and change:
```javascript
const SERVER_URL = 'https://sws-notification-server.herokuapp.com';
```

### Step 9: Redeploy to AWS S3
Upload the updated `index.html` to your S3 bucket.

---

## Option 2: Deploy to Render.com (Free, No Credit Card Required)

### Step 1: Create Account
Go to https://render.com and sign up.

### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the `sws` repository

### Step 3: Configure Service
- **Name**: sws-notification-server
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Plan**: Free

### Step 4: Add Environment Variables
In the Render dashboard, add:
```
AWS_IOT_ENDPOINT=a2jxq81rsqt8vu-ats.iot.us-east-1.amazonaws.com
AWS_REGION=us-east-1
AWS_IOT_TOPIC=sws-data
VAPID_PUBLIC_KEY=BDvqN8ASdjk6gruoXAD4u49xp6V3eT_RbhOEn6rtaLiszyRCyFhWCd_ZaawuuPh-PEeg2qe76rUFlWTx-ajz-DA
VAPID_PRIVATE_KEY=1lADGPHf91LvCFcHKJykI2AgzAnLgyoTSs-h17NdzKI
VAPID_SUBJECT=mailto:akshat@smartweatherstation.com
```

### Step 5: Deploy
Click "Create Web Service" and wait for deployment.

Your server URL will be: `https://sws-notification-server.onrender.com`

### Step 6: Update Frontend
Edit `index.html` line 677:
```javascript
const SERVER_URL = 'https://sws-notification-server.onrender.com';
```

### Step 7: Redeploy to S3
Upload the updated `index.html` to your S3 bucket.

---

## Option 3: Deploy to Railway (Easiest Setup)

### Step 1: Create Account
Go to https://railway.app and sign up with GitHub.

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `sws` repository

### Step 3: Add Environment Variables
In Railway dashboard → Variables, add all the environment variables from your `.env` file.

### Step 4: Deploy
Railway will automatically deploy. Your URL will be something like:
`https://sws-production-xxxx.up.railway.app`

### Step 5: Update Frontend
Edit `index.html` line 677 with your Railway URL.

### Step 6: Redeploy to S3
Upload the updated `index.html` to your S3 bucket.

---

## Troubleshooting

### Error: "Failed to subscribe to notifications"
- Check that your server is running: Visit `https://your-server-url.com/health`
- Check browser console for CORS errors
- Make sure you updated the `SERVER_URL` in `index.html`

### Server crashes on startup
- Check logs: `heroku logs --tail` or check platform dashboard
- Verify all environment variables are set
- Make sure certificates are uploaded correctly

### CORS Errors
Your `server.js` already has CORS enabled. If you still get errors, make sure your server is deployed with HTTPS.

---

## Testing Your Deployment

1. Visit your S3 website: `https://your-bucket-name.s3.amazonaws.com/index.html`
2. Open browser console (F12)
3. Click the notification bell icon
4. Configure thresholds and click "Save & Enable"
5. Check for any errors in console
6. Visit `https://your-server-url.com/api/status` to verify server is running

---

## Important Notes

1. **Free Tier Limitations**:
   - Heroku: App sleeps after 30 min of inactivity (first request will be slow)
   - Render: App sleeps after 15 min of inactivity
   - Railway: 500 hours/month free

2. **Security Warning**: Your code contains AWS credentials and API keys. For a production app:
   - Never commit credentials to GitHub
   - Use environment variables
   - Rotate keys regularly
   - Use AWS IAM roles instead of access keys

3. **Certificate Storage**: The AWS IoT certificates need to be accessible to your server. Consider:
   - Using environment variables for small certs
   - AWS Secrets Manager for production
   - Encrypted storage

---

## Quick Start (Recommended Path)

**For a school project, I recommend Railway:**
1. Sign up at railway.app with GitHub
2. Deploy from GitHub repo
3. Add environment variables
4. Copy the deployed URL
5. Update `SERVER_URL` in `index.html` (line 677)
6. Upload to S3
7. Done!

---

## Need Help?
- Check server health: `https://your-server-url.com/health`
- View API status: `https://your-server-url.com/api/status`
- Check logs in your platform dashboard
