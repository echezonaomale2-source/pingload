# Pingload — Production Android Release APK
# Requires: Android SDK, JDK 17 (see repo .tools/jdk-17 or install Temurin 17)
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$jdk17 = Join-Path $repoRoot ".tools\jdk-17"
if (-not (Test-Path "$jdk17\bin\java.exe")) {
  $jdk17 = (Get-ChildItem "C:\Program Files\Eclipse Adoptium\jdk-17*" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
}
if (-not $jdk17 -or -not (Test-Path "$jdk17\bin\java.exe")) {
  Write-Error "JDK 17 not found. Install Temurin 17 or run from repo with .tools/jdk-17."
}

$env:JAVA_HOME = $jdk17
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

$mobileRoot = Split-Path $PSScriptRoot -Parent
Set-Location (Join-Path $mobileRoot "android")

Write-Host "Building release APK (production API baked via mobile/.env)..." -ForegroundColor Cyan
& .\gradlew.bat :app:assembleRelease --no-daemon

$apk = Join-Path $mobileRoot "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apk) {
  Write-Host "`nSUCCESS: $apk" -ForegroundColor Green
  Get-Item $apk | Select-Object FullName, @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}}
} else {
  Write-Error "APK not found. Check android\build-release.log"
}
