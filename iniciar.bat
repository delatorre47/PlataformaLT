@echo off
echo Iniciando PlataformaLT...

REM Iniciar backend
start cmd /k "cd backend && node server.js"

timeout /t 3 > nul

REM Abrir la plataforma en el navegador predeterminado
start "" "http://localhost:3000"
exit
