# Setup script for Omni.Thooft Docker Stack on Windows
# This script prepares your Windows environment for deploying the Docker stack

Write-Host "Setting up Omni.Thooft Docker Stack on Windows..." -ForegroundColor Cyan

# Get the current username
$username = $env:USERNAME
$docsPath = "C:/Users/$username/Documents/Docker"

Write-Host "`n1. Creating required directories..." -ForegroundColor Yellow
$directories = @(
    "$env:USERPROFILE\Documents\Docker\pb_data",
    "$env:USERPROFILE\Documents\Docker\pb_migrations",
    "$env:USERPROFILE\Documents\Docker\pb_hooks"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "   Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "   Already exists: $dir" -ForegroundColor Gray
    }
}

# Copy pb_migrations and pb_hooks if they exist in the repo
Write-Host "`n2. Copying migration and hook files..." -ForegroundColor Yellow

if (Test-Path ".\pb_migrations") {
    Copy-Item -Path ".\pb_migrations\*" -Destination "$env:USERPROFILE\Documents\Docker\pb_migrations\" -Recurse -Force
    Write-Host "   Copied pb_migrations files" -ForegroundColor Green
}

if (Test-Path ".\pb_hooks") {
    Copy-Item -Path ".\pb_hooks\*" -Destination "$env:USERPROFILE\Documents\Docker\pb_hooks\" -Recurse -Force
    Write-Host "   Copied pb_hooks files" -ForegroundColor Green
}

Write-Host "`n3. Setting environment variable..." -ForegroundColor Yellow
# Set for current session
$env:OMNI_DOCS_PATH = $docsPath
Write-Host "   Set OMNI_DOCS_PATH=$docsPath (current session)" -ForegroundColor Green

# Ask if user wants to make it permanent
$makePermanent = Read-Host "`nDo you want to make OMNI_DOCS_PATH permanent? (y/n)"
if ($makePermanent -eq 'y' -or $makePermanent -eq 'Y') {
    [System.Environment]::SetEnvironmentVariable('OMNI_DOCS_PATH', $docsPath, 'User')
    Write-Host "   Environment variable set permanently for user" -ForegroundColor Green
    Write-Host "   Note: You may need to restart your terminal or Docker Desktop" -ForegroundColor Yellow
}

Write-Host "`n4. Checking for stack.env file..." -ForegroundColor Yellow
if (!(Test-Path ".\stack.env")) {
    Write-Host "   Creating stack.env template..." -ForegroundColor Yellow
    @"
# Environment variables for Omni.Thooft Stack
# Fill in your credentials below

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password_here

# Google Drive Configuration (optional)
GDRIVE_CLIENT_ID=
GDRIVE_CLIENT_SECRET=
"@ | Out-File -FilePath ".\stack.env" -Encoding UTF8
    Write-Host "   Created stack.env - PLEASE EDIT THIS FILE WITH YOUR CREDENTIALS" -ForegroundColor Red
} else {
    Write-Host "   stack.env already exists" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Edit 'stack.env' with your credentials"
Write-Host "2. If you made OMNI_DOCS_PATH permanent, restart your terminal/Docker Desktop"
Write-Host "3. Deploy the stack using Docker Desktop or:"
Write-Host "   docker compose -f docker-compose.windows.yml --env-file stack.env up -d"
Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
Write-Host "- Ensure Docker Desktop is running"
Write-Host "- Check that OMNI_DOCS_PATH is set: echo `$env:OMNI_DOCS_PATH"
Write-Host "- View logs: docker compose -f docker-compose.windows.yml logs"
