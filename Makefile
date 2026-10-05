# ==============================================================================
# Makefile for Sharp A/C IR Remote & Learner for Android
# ==============================================================================

.PHONY: help install build dev launch logcat clean

# Default target
help:
	@echo "Sharp A/C IR Remote & Learner - Build & Install Targets:"
	@echo "  make install   - Build latest app, generate APK, and install directly to Android phone"
	@echo "  make build     - Build production web app and Android APK"
	@echo "  make dev       - Run local Vite dev server on port 3000"
	@echo "  make launch    - Launch Sharp AC Remote app on connected Android phone"
	@echo "  make logcat    - View live IR blaster transmission logs from phone"
	@echo "  make clean     - Clean build directories (dist and android/build)"

# Build and install directly onto connected Android phone
install:
	@powershell -ExecutionPolicy Bypass -File "scripts/build-and-install-apk.ps1"

# Build production assets and Android APK
build:
	@npm run build
	@powershell -ExecutionPolicy Bypass -Command "& 'scripts/build-and-install-apk.ps1' -NoInstall"

# Run Vite dev server
dev:
	@npm run dev

# Launch app on phone
launch:
	@powershell -Command "$$adb = if (Get-Command adb -ErrorAction SilentlyContinue) { 'adb' } elseif (Test-Path \"$$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe\") { \"$$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe\" } else { 'adb' }; & $$adb shell am start -n com.sharp.remote.ir/.MainActivity"

# Stream live IR transmission logs
logcat:
	@powershell -Command "$$adb = if (Get-Command adb -ErrorAction SilentlyContinue) { 'adb' } elseif (Test-Path \"$$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe\") { \"$$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe\" } else { 'adb' }; & $$adb logcat -s SharpAcRemote WebViewConsole"

# Clean build folders
clean:
	@npm run clean
	@powershell -Command "if (Test-Path 'android/build') { Remove-Item -Recurse -Force 'android/build' }"
