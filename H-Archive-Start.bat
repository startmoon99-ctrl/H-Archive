@echo off
chcp 65001 >nul
setlocal
title H Archive
cd /d "%~dp0"

if not exist "package.json" (
  echo [오류] 이 파일은 H Archive 프로젝트 폴더 안에 있어야 합니다.
  goto :fail
)

where node >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js가 설치되어 있지 않습니다. https://nodejs.org 에서 설치한 뒤 다시 실행하세요.
  goto :fail
)

if not exist "node_modules" (
  echo 처음 실행입니다. 필요한 패키지를 설치합니다...
  call npm install
  if errorlevel 1 goto :fail
)

echo.
echo H Archive 개발 서버를 시작합니다. 브라우저가 자동으로 열립니다.
echo 끝내려면 이 창에서 Ctrl + C 를 누르세요.
echo.
call npm run dev -- --open
if errorlevel 1 goto :fail
goto :eof

:fail
echo.
echo 문제가 발생했습니다. 위 메시지를 확인하세요.
pause
exit /b 1
