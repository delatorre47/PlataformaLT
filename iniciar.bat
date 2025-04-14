@echo off
title PlataformaLT pública (URL aleatoria)
echo Iniciando PlataformaLT con LocalTunnel...

REM Iniciar el backend en nueva ventana
start cmd /k "cd backend && node server.js"

REM Esperar unos segundos para asegurarse de que el servidor está activo
timeout /t 2 >nul

REM Iniciar LocalTunnel sin subdominio (URL aleatoria)
start cmd /k "lt --port 3000"

exit
