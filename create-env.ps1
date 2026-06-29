# PowerShell script to create .env.local file for frontend
# Run this script: .\create-env.ps1

$envContent = @"
# Frontend Environment Variables
# Next.js automatically loads .env.local files

# Backend API URL
# Update this if your backend runs on a different port or domain
NEXT_PUBLIC_API_URL=http://localhost:5200/api

# Add other public environment variables here
# Note: Only variables prefixed with NEXT_PUBLIC_ are exposed to the browser
"@

$envContent | Out-File -FilePath ".env.local" -Encoding utf8 -NoNewline
Write-Host "✅ Frontend .env.local file created successfully!" -ForegroundColor Green

