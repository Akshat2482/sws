@echo off
REM ========================================
REM Deploy Smart Weather Station to S3
REM ========================================

echo.
echo ========================================
echo  Smart Weather Station - S3 Deployment
echo ========================================
echo.

REM Replace this with your S3 bucket name
set BUCKET_NAME=your-bucket-name-here

echo Checking if AWS CLI is installed...
aws --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: AWS CLI not found!
    echo Please install: https://aws.amazon.com/cli/
    pause
    exit /b 1
)

echo.
echo Current bucket: %BUCKET_NAME%
echo.
set /p CONFIRM="Is this correct? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo Uploading files to S3...
echo.

REM Upload HTML files
echo [1/6] Uploading index.html...
aws s3 cp index.html s3://%BUCKET_NAME%/ --content-type "text/html" --cache-control "max-age=300"

REM Upload JavaScript files
echo [2/6] Uploading health-predictor.js...
aws s3 cp health-predictor.js s3://%BUCKET_NAME%/ --content-type "application/javascript" --cache-control "max-age=3600"

echo [3/6] Uploading voice-assistant.js...
aws s3 cp voice-assistant.js s3://%BUCKET_NAME%/ --content-type "application/javascript" --cache-control "max-age=3600"

REM Upload PWA files
echo [4/6] Uploading manifest.json...
aws s3 cp manifest.json s3://%BUCKET_NAME%/ --content-type "application/json" --cache-control "max-age=86400"

echo [5/6] Uploading service-worker.js...
aws s3 cp service-worker.js s3://%BUCKET_NAME%/ --content-type "application/javascript" --cache-control "max-age=3600"

REM Upload icons
echo [6/6] Uploading icons...
aws s3 cp icon-512.png s3://%BUCKET_NAME%/ --content-type "image/png" --cache-control "max-age=86400"

echo.
echo ========================================
echo  Deployment Complete!
echo ========================================
echo.
echo Your dashboard URL:
echo https://%BUCKET_NAME%.s3.amazonaws.com/index.html
echo.
echo Or if using CloudFront:
echo https://your-cloudfront-domain.cloudfront.net
echo.
pause
