@echo off
echo ===================================================
echo [Biz Insight] AI 식당 경영 솔루션을 실행합니다.
echo ===================================================
echo.
echo 1. 필요한 패키지가 있는지 확인합니다...
if not exist node_modules (
    echo 패키지를 설치하는 중입니다... (처음에만 실행됩니다)
    call npm install
)

echo.
echo 2. 프로그램을 시작합니다...
echo 브라우저가 자동으로 열립니다.
echo 실행 중인 창을 끄면 프로그램도 종료됩니다.
echo.
echo [실행 중...]
start http://localhost:5173
call npm run dev
pause
