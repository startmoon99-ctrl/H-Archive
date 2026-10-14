@echo off
chcp 65001 >nul
setlocal
title H Archive - Mobile Test
cd /d "%~dp0"

rem 5183 포트에 이미 서버가 떠 있으면 새로 실행하지 않는다(vite.config.ts의 strictPort 때문에 두 번째 실행은 실패한다)
netstat -ano | findstr /R /C:":5183 .*LISTENING" >nul
if errorlevel 1 goto :launch
rem 모든 주소(0.0.0.0 / ::)에서 받고 있어야 휴대폰에서 접속할 수 있다. localhost만 받는 서버는 H-Archive-Start.bat으로 띄운 것이다
netstat -ano | findstr "LISTENING" | findstr /L /C:"0.0.0.0:5183 " /C:"[::]:5183 " >nul
if errorlevel 1 goto :local_only
echo H Archive가 이미 실행 중입니다. 같은 Wi-Fi의 휴대폰에서 아래 주소 중 하나로 접속하세요.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do for /f "tokens=*" %%b in ("%%a") do echo   http://%%b:5183
start "" "http://localhost:5183"
pause
goto :eof

:local_only
echo [안내] 이미 실행 중인 H Archive는 이 PC에서만 열리는 서버(H-Archive-Start.bat)입니다.
echo 휴대폰에서 접속하려면 그 창에서 Ctrl + C로 서버를 끈 뒤 이 파일을 다시 실행하세요.
start "" "http://localhost:5183"
pause
goto :eof

:launch

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
echo 같은 Wi-Fi에 연결된 휴대폰에서 아래에 표시되는 Network 주소를 여세요.
echo 접속이 안 되면 Windows 방화벽에서 Node.js의 개인 네트워크 접근을 허용해야 합니다.
echo 휴대폰에 저장한 기록은 그 휴대폰 브라우저에만 남습니다. PC와 공유되지 않습니다.
echo 끝내려면 이 창에서 Ctrl + C 를 누르세요.
echo.
call npm run dev:host
if errorlevel 1 goto :fail
goto :eof

:fail
echo.
echo 문제가 발생했습니다. 위 메시지를 확인하세요.
pause
exit /b 1
