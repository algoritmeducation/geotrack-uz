@echo off
title GeoTrack UZ - Mobile Server
color 0a

echo ===================================================
echo   GeoTrack UZ React Native Server Initialization   
echo ===================================================
echo [1/3] Configuring disk caches to alternative drive (D:)...
set "npm_config_cache=D:\npm-cache"
set "TMP=D:\npm_temp"
set "TEMP=D:\npm_temp"

cd /d d:\gps_wrk\GeoTrackWorker

echo.
echo [2/3] Installing core project modules... (This might take a few minutes)
call npm install --legacy-peer-deps

echo.
echo [3/3] Fetching hardware-level tracker dependencies...
call npx expo install expo-location expo-task-manager socket.io-client @react-native-async-storage/async-storage

echo.
echo ===================================================
echo   Starting Expo Dev Server! Scan QR Code below.    
echo   (Using --tunnel to bypass Android network issues)
echo ===================================================
call npx expo start --tunnel
pause
