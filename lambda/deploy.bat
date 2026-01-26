@echo off
REM Simple deployment script for Windows
REM This packages your Lambda function into a .zip file

echo ========================================
echo Lambda Function Packager
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Creating deployment package...
if exist emergency-calling-lambda.zip del emergency-calling-lambda.zip
powershell -Command "Compress-Archive -Path emergency-calling-lambda.js,node_modules -DestinationPath emergency-calling-lambda.zip -Force"
if errorlevel 1 (
    echo ERROR: Failed to create zip file!
    pause
    exit /b 1
)

echo.
echo [3/3] Done!
echo.
echo ========================================
echo SUCCESS!
echo ========================================
echo.
echo File created: emergency-calling-lambda.zip
echo Size:
dir emergency-calling-lambda.zip | find ".zip"
echo.
echo Next steps:
echo 1. Go to AWS Lambda Console
echo 2. Upload this .zip file to your function
echo 3. Follow DEPLOYMENT-GUIDE.md for complete instructions
echo.
pause
