#!/usr/bin/env pwsh

Write-Host "Starting Job Finder AI..." -ForegroundColor Green

# Start the server
Write-Host "Starting Express server on http://localhost:3000" -ForegroundColor Cyan
node src/server.js
