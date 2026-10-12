@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title H Archive

where node >nul 2>nul
if errorlevel 1 (
  echo [H Archive] Node.js 를 찾을 수 없습니다.
  echo https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [H Archive] 처음 실행입니다. 필요한 패키지를 설치합니다...
  call npm install
  if errorlevel 1 (
    echo [H Archive] 패키지 설치에 실패했습니다. 네트워크 연결을 확인해 주세요.
    echo.
    pause
    exit /b 1
  )
)

echo [H Archive] 개발 서버를 시작합니다. 브라우저가 자동으로 열립니다.
echo [H Archive] 종료하려면 이 창에서 Ctrl+C 를 누르세요.
echo.
call npm run dev -- --open

echo.
pause
