@echo off
setlocal enabledelayedexpansion
title PC Manager - Desinstalador del Servicio de Telemetria

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [PC Manager] Solicitando permisos de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo =======================================================
echo   PC Manager - Desinstalador del Servicio de Windows
echo =======================================================
echo.

set "SERVICE_NAME=pc_manager_service"

echo 1. Deteniendo servicio...
sc.exe stop %SERVICE_NAME% >nul 2>&1
timeout /t 2 /nobreak >nul

echo 2. Eliminando servicio del sistema...
sc.exe delete %SERVICE_NAME%

echo.
echo Servicio eliminado de Windows Service Control Manager.
echo.
pause
