@echo off
setlocal enabledelayedexpansion
title PC Manager - Instalador del Servicio de Telemetria

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [PC Manager] Solicitando permisos de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo =======================================================
echo   PC Manager - Instalador del Servicio de Windows
echo =======================================================
echo.

set "SERVICE_NAME=pc_manager_service"
set "DISPLAY_NAME=PC Manager Hardware Telemetry Service"
set "SCRIPT_DIR=%~dp0"

REM Buscar el binario pc_manager_service.exe
set "BIN_PATH="
if exist "%SCRIPT_DIR%..\src-tauri\target\debug\pc_manager_service.exe" (
    set "BIN_PATH=%SCRIPT_DIR%..\src-tauri\target\debug\pc_manager_service.exe"
) else if exist "%SCRIPT_DIR%..\src-tauri\target\release\pc_manager_service.exe" (
    set "BIN_PATH=%SCRIPT_DIR%..\src-tauri\target\release\pc_manager_service.exe"
) else if exist "%SCRIPT_DIR%pc_manager_service.exe" (
    set "BIN_PATH=%SCRIPT_DIR%pc_manager_service.exe"
)

if not defined BIN_PATH (
    echo [ERROR] No se encontro pc_manager_service.exe.
    echo Por favor compile el proyecto primero con 'cargo build' dentro de src-tauri.
    pause
    exit /b 1
)

echo Binario localizado: %BIN_PATH%
echo.

echo 1. Deteniendo instancia previa del servicio si estuviera activa...
sc.exe stop %SERVICE_NAME% >nul 2>&1
timeout /t 1 /nobreak >nul

echo 2. Verificando registro del servicio...
sc.exe query %SERVICE_NAME% >nul 2>&1
if %errorlevel% equ 0 (
    echo    Actualizando ruta binaria del servicio existente...
    sc.exe config %SERVICE_NAME% binPath= "\"%BIN_PATH%\"" start= auto
) else (
    echo    Registrando nuevo servicio de Windows...
    sc.exe create %SERVICE_NAME% binPath= "\"%BIN_PATH%\"" start= auto DisplayName= "%DISPLAY_NAME%"
)

echo 3. Configurando carpeta de telemetria con permisos universales de lectura...
set "TELEMETRY_DIR=%ProgramData%\PCManager\telemetry"
if not exist "%TELEMETRY_DIR%" mkdir "%TELEMETRY_DIR%"
icacls "%TELEMETRY_DIR%" /grant "*S-1-5-32-545:(OI)(CI)R" /t /q >nul 2>&1

echo 4. Iniciando servicio...
sc.exe start %SERVICE_NAME%
timeout /t 2 /nobreak >nul

echo.
echo Estado actual del servicio:
sc.exe query %SERVICE_NAME% | findstr /i "STATE"

echo.
echo =======================================================
echo  Servicio configurado exitosamente.
echo  A partir de ahora, la aplicacion grafica (pc_manager.exe)
echo  operara en modo normal sin pedir permisos de Administrador.
echo =======================================================
echo.
pause
