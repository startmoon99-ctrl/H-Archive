@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title H Archive - 모바일 테스트

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

echo [H Archive] 같은 Wi-Fi 에 연결된 기기에서 접속할 수 있도록 서버를 시작합니다.
echo.
echo   1. 아래에 표시되는 Network 주소를 휴대폰 브라우저에 입력하세요.
echo      예: http://192.168.0.10:5173
echo   2. 접속되지 않으면 Windows 방화벽에서 Node.js 의 개인 네트워크 접근을 허용해 주세요.
echo   3. 기록은 기기마다 따로 저장됩니다. PC 에서 만든 항목은 휴대폰에 보이지 않습니다.
echo   4. 종료하려면 이 창에서 Ctrl+C 를 누르세요.
echo.
call npm run dev:host

echo.
pause
