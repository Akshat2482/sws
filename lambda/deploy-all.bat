@echo off
REM Deploy all Lambda functions for Smart Weather Station
REM Creates .zip files for all 3 Lambda functions

echo ========================================
echo Smart Weather Station - Lambda Packager
echo ========================================
echo.
echo This will package ALL Lambda functions:
echo  1. Emergency Calling (Twilio)
echo  2. Push Notifications (Web Push)
echo  3. Subscription API (API Gateway)
echo.
echo ========================================
echo.

cd /d "%~dp0"

REM ==================== Emergency Calling Lambda ====================
echo [1/3] Packaging Emergency Calling Lambda...
echo.

if exist emergency-calling-lambda.zip del emergency-calling-lambda.zip

REM Install dependencies
echo Installing dependencies for emergency calling...
copy /y package.json package-temp.json >nul
call npm install --silent
if errorlevel 1 (
    echo ERROR: npm install failed for emergency calling!
    pause
    exit /b 1
)

REM Create zip
powershell -Command "Compress-Archive -Path emergency-calling-lambda.js,node_modules -DestinationPath emergency-calling-lambda.zip -Force"
if errorlevel 1 (
    echo ERROR: Failed to create emergency-calling-lambda.zip!
    pause
    exit /b 1
)

echo ✅ emergency-calling-lambda.zip created
echo.

REM ==================== Push Notification Lambda ====================
echo [2/3] Packaging Push Notification Lambda...
echo.

if exist push-notification-lambda.zip del push-notification-lambda.zip

REM Install dependencies
echo Installing dependencies for push notifications...
if exist node_modules rmdir /s /q node_modules
copy /y package-push.json package.json >nul
call npm install --silent
if errorlevel 1 (
    echo ERROR: npm install failed for push notifications!
    pause
    exit /b 1
)

REM Create zip
powershell -Command "Compress-Archive -Path push-notification-lambda.js,node_modules -DestinationPath push-notification-lambda.zip -Force"
if errorlevel 1 (
    echo ERROR: Failed to create push-notification-lambda.zip!
    pause
    exit /b 1
)

echo ✅ push-notification-lambda.zip created
echo.

REM ==================== Subscription API Lambda ====================
echo [3/3] Packaging Subscription API Lambda...
echo.

if exist subscription-api-lambda.zip del subscription-api-lambda.zip

REM Install dependencies
echo Installing dependencies for subscription API...
if exist node_modules rmdir /s /q node_modules
copy /y package-api.json package.json >nul
call npm install --silent
if errorlevel 1 (
    echo ERROR: npm install failed for subscription API!
    pause
    exit /b 1
)

REM Create zip
powershell -Command "Compress-Archive -Path subscription-api-lambda.js,node_modules -DestinationPath subscription-api-lambda.zip -Force"
if errorlevel 1 (
    echo ERROR: Failed to create subscription-api-lambda.zip!
    pause
    exit /b 1
)

echo ✅ subscription-api-lambda.zip created
echo.

REM Restore original package.json
copy /y package-temp.json package.json >nul
del package-temp.json

REM ==================== Summary ====================
echo ========================================
echo SUCCESS! All Lambda functions packaged
echo ========================================
echo.
echo Created files:
dir *.zip | find ".zip"
echo.
echo Next steps:
echo 1. Open SERVERLESS-DEPLOYMENT-GUIDE.md
echo 2. Follow step-by-step instructions
echo 3. Upload these .zip files to AWS Lambda
echo.
pause
