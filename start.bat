@echo off
chcp 65001 >nul
echo ===================================================
echo   UAV Survey Operations Tracker ^& Mission Logger
echo   ระบบติดตามภารกิจอากาศยานไร้คนขับ กรมที่ดิน
echo ===================================================
echo.
echo กำลังเริ่มระบบ Web App บน http://localhost:3000 ...
echo.

:: รอให้ Node.js เริ่มทำงาน 1 วินาทีก่อนเปิดเบราว์เซอร์อัตโนมัติ เพื่อป้องกันปัญหา Connection Refused
start "" cmd /c "timeout /t 1 >nul & start http://localhost:3000"
node server.js

pause
