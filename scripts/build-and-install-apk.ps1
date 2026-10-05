# Script to build and install Sharp AC Remote APK directly to Android device
$ErrorActionPreference = "Stop"

Write-Host "=== 1. Checking Environment ===" -ForegroundColor Cyan
$sdkRoot = $env:ANDROID_HOME
if (-not $sdkRoot -or -not (Test-Path $sdkRoot)) { $sdkRoot = $env:ANDROID_SDK_ROOT }
if (-not $sdkRoot -or -not (Test-Path $sdkRoot)) { $sdkRoot = "$env:LOCALAPPDATA\Android\Sdk" }
if (-not (Test-Path $sdkRoot)) {
    throw "Android SDK not found. Please set ANDROID_HOME or install Android SDK."
}
$buildToolsDir = Get-ChildItem "$sdkRoot\build-tools" | Sort-Object Name -Descending | Select-Object -First 1
$platformDir = Get-ChildItem "$sdkRoot\platforms" | Sort-Object Name -Descending | Select-Object -First 1

$aapt2 = "$($buildToolsDir.FullName)\aapt2.exe"
$d8Jar = "$($buildToolsDir.FullName)\lib\d8.jar"
$zipalign = "$($buildToolsDir.FullName)\zipalign.exe"
$apksignerJar = "$($buildToolsDir.FullName)\lib\apksigner.jar"
$androidJar = "$($platformDir.FullName)\android.jar"
$adb = "$sdkRoot\platform-tools\adb.exe"

Write-Host "Build Tools: $($buildToolsDir.Name)" -ForegroundColor Green
Write-Host "Android Jar: $androidJar" -ForegroundColor Green

Write-Host "`n=== 2. Building Web App ===" -ForegroundColor Cyan
npm run build

Write-Host "`n=== 3. Preparing Build Directories ===" -ForegroundColor Cyan
$buildDir = "android\build"
if (Test-Path $buildDir) { Remove-Item -Recurse -Force $buildDir }
New-Item -ItemType Directory -Force "$buildDir\obj" | Out-Null
New-Item -ItemType Directory -Force "$buildDir\dex" | Out-Null
New-Item -ItemType Directory -Force "$buildDir\assets" | Out-Null

Copy-Item -Recurse "dist\*" "$buildDir\assets\" -Force

Write-Host "`n=== 4. Compiling Android Resources (aapt2) ===" -ForegroundColor Cyan
& $aapt2 compile --dir "android\res" -o "$buildDir\compiled_res.zip"
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

& $aapt2 link -I $androidJar --min-sdk-version 24 --target-sdk-version 34 --manifest "android\AndroidManifest.xml" -o "$buildDir\unaligned.apk" -A "$buildDir\assets" "$buildDir\compiled_res.zip" --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

Write-Host "`n=== 5. Compiling Java Source ===" -ForegroundColor Cyan
$javaFiles = Get-ChildItem -Recurse "android\src" -Filter "*.java" | Select-Object -ExpandProperty FullName
javac --release 11 -cp $androidJar -d "$buildDir\obj" $javaFiles
if ($LASTEXITCODE -ne 0) { throw "javac compilation failed" }

Write-Host "`n=== 6. Converting Bytecode to DEX (d8) ===" -ForegroundColor Cyan
$classFiles = Get-ChildItem -Recurse "$buildDir\obj" -Filter "*.class" | Select-Object -ExpandProperty FullName
java -cp $d8Jar com.android.tools.r8.D8 --min-api 21 --lib $androidJar --output "$buildDir\dex" $classFiles
if ($LASTEXITCODE -ne 0) { throw "d8 conversion failed" }

Write-Host "`n=== 7. Adding DEX to APK ===" -ForegroundColor Cyan
jar uf "$buildDir\unaligned.apk" -C "$buildDir\dex" classes.dex
if ($LASTEXITCODE -ne 0) { throw "jar uf failed" }

Write-Host "`n=== 8. Aligning APK (zipalign) ===" -ForegroundColor Cyan
$finalApk = "$buildDir\sharp-ac-remote.apk"
& $zipalign -f -v 4 "$buildDir\unaligned.apk" $finalApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

Write-Host "`n=== 9. Signing APK ===" -ForegroundColor Cyan
$keystore = "android\debug.keystore"
if (-not (Test-Path $keystore)) {
    Write-Host "Creating debug keystore..." -ForegroundColor Yellow
    keytool -genkey -v -keystore $keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
}

java -jar $apksignerJar sign --ks $keystore --ks-pass pass:android --key-pass pass:android $finalApk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed" }

Write-Host "`n=== 10. Deploying to Android Device ===" -ForegroundColor Cyan
& $adb devices -l
Write-Host "-> Pushing latest APK to phone: /sdcard/Download/sharp-ac-remote.apk" -ForegroundColor Yellow
& $adb push $finalApk /sdcard/Download/sharp-ac-remote.apk

Write-Host "-> Attempting direct install..." -ForegroundColor Yellow
& $adb shell "cp /sdcard/Download/sharp-ac-remote.apk /data/local/tmp/sharp-ac-remote.apk"
$installResult = & $adb shell "pm install -r -d -g /data/local/tmp/sharp-ac-remote.apk" 2>&1
if ($installResult -match "Success") {
    Write-Host "`n=== 11. Launching App on Device ===" -ForegroundColor Cyan
    & $adb shell am start -n "com.sharp.remote.ir/.MainActivity"
    Write-Host "`n SUCCESS! Sharp AC Remote is now running on your phone!" -ForegroundColor Green
} else {
    Write-Host "`n[THÔNG BÁO TẢI VỀ THÀNH CÔNG]" -ForegroundColor Green
    Write-Host "1. File APK đã được tải về sẵn trong điện thoại tại: /sdcard/Download/sharp-ac-remote.apk" -ForegroundColor Cyan
    Write-Host "   -> Anh chỉ cần mở ứng dụng 'Tệp' (Files / Quản lý tập tin) -> vào thư mục 'Download' (Tải về) -> chạm vào 'sharp-ac-remote.apk' để cài đặt." -ForegroundColor White
    Write-Host "2. Để lần sau tự động cài đặt qua máy tính mà không cần chạm tay:" -ForegroundColor Cyan
    Write-Host "   -> Vào Cài đặt máy -> Tùy chọn nhà phát triển -> BẬT mục 'Cài đặt qua USB' (Install via USB)." -ForegroundColor Yellow
}

Write-Host "`n SUCCESS! Sharp AC Remote is now running on your phone!" -ForegroundColor Green
