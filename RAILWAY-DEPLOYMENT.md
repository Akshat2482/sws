# Deploy to Railway - Step by Step

## Step 1: Sign Up for Railway
1. Go to: **https://railway.app**
2. Click **"Login"** in the top right
3. Choose **"Login with GitHub"**
4. Authorize Railway to access your GitHub

## Step 2: Create New Project
1. Click **"New Project"** button
2. Select **"Deploy from GitHub repo"**
3. Choose your **`sws`** repository (or whatever your repo is named)
4. Railway will automatically detect it's a Node.js app

## Step 3: Add Environment Variables
1. Click on your deployed service
2. Go to the **"Variables"** tab
3. Click **"+ New Variable"** and add each one:

```
AWS_IOT_ENDPOINT=a2jxq81rsqt8vu-ats.iot.us-east-1.amazonaws.com
AWS_REGION=us-east-1
AWS_IOT_TOPIC=sws-data
AWS_IOT_PRIVATE_KEY_PATH=./certs/private.pem.key
AWS_IOT_CERTIFICATE_PATH=./certs/certificate.pem.crt
AWS_IOT_CA_PATH=./certs/AmazonRootCA1.pem
PORT=3000
VAPID_PUBLIC_KEY=BDvqN8ASdjk6gruoXAD4u49xp6V3eT_RbhOEn6rtaLiszyRCyFhWCd_ZaawuuPh-PEeg2qe76rUFlWTx-ajz-DA
VAPID_PRIVATE_KEY=1lADGPHf91LvCFcHKJykI2AgzAnLgyoTSs-h17NdzKI
VAPID_SUBJECT=mailto:akshat@smartweatherstation.com
```

## Step 4: Handle Certificates
Your app needs the `certs/` folder. You have 2 options:

### Option A: Push Certs to GitHub (Quick - for school project)
**MAKE SURE YOUR REPO IS PRIVATE!**

```bash
# Check if certs are in .gitignore
# If they are, remove that line temporarily
git add certs/
git commit -m "Add certificates for Railway deployment"
git push origin develop
```

Then in Railway, trigger a redeploy (it should auto-deploy after the push).

### Option B: Don't commit certs (if repo is public)
You'll need to use AWS Secrets Manager or another solution. Let me know if you need help with this.

## Step 5: Get Your Railway URL
1. In Railway dashboard, click on your service
2. Go to **"Settings"** tab
3. Scroll to **"Networking"** section
4. Click **"Generate Domain"**
5. Railway will give you a URL like: `https://sws-production-xxxx.up.railway.app`
6. **Copy this URL!**

## Step 6: Update Your Frontend
1. Open `index.html`
2. Find line 677 (search for `SERVER_URL`)
3. Replace:
   ```javascript
   const SERVER_URL = 'http://localhost:3000';
   ```
   With:
   ```javascript
   const SERVER_URL = 'https://sws-production-xxxx.up.railway.app';
   ```
   (Use YOUR actual Railway URL)

## Step 7: Test Your Server
1. Visit: `https://your-railway-url.up.railway.app/health`
2. You should see: `{"status":"ok","awsIotConnected":true,...}`

## Step 8: Upload to S3
1. Upload the updated `index.html` to your S3 bucket
2. Test notifications on your live site!

## Troubleshooting

### Server shows "awsIotConnected": false
- Check that you added ALL environment variables
- Check that certs folder is uploaded
- View logs in Railway dashboard → Deployments → View logs

### Can't generate domain
- Make sure deployment succeeded (check Deployments tab)
- Wait 1-2 minutes after deployment completes

### CORS errors
- Railway automatically uses HTTPS, which is good
- Your server.js already has CORS enabled
- Make sure you're using the full Railway URL with `https://`

---

## Quick Checklist
- [ ] Signed up for Railway with GitHub
- [ ] Created project from GitHub repo
- [ ] Added all environment variables
- [ ] Pushed certs to GitHub (if repo is private)
- [ ] Generated domain in Railway
- [ ] Updated SERVER_URL in index.html
- [ ] Tested /health endpoint
- [ ] Uploaded to S3
- [ ] Tested notifications on live site

---

**Need help?** Check the Railway logs in the dashboard!
