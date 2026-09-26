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

REM Buscar y resolver ruta canónica absoluta de pc_manager_service.exe
set "BIN_PATH="
if exist "%SCRIPT_DIR%..\src-tauri\target\debug\pc_manager_service.exe" (
    for %%F in ("%SCRIPT_DIR%..\src-tauri\target\debug\pc_manager_service.exe") do set "BIN_PATH=%%~fF"
) else if exist "%SCRIPT_DIR%..\src-tauri\target\release\pc_manager_service.exe" (
    for %%F in ("%SCRIPT_DIR%..\src-tauri\target\release\pc_manager_service.exe") do set "BIN_PATH=%%~fF"
) else if exist "%SCRIPT_DIR%pc_manager_service.exe" (
    for %%F in ("%SCRIPT_DIR%pc_manager_service.exe") do set "BIN_PATH=%%~fF"
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

echo 2. Desplegando binario en ubicacion del sistema...
set "SVC_BIN_DIR=%ProgramData%\PCManager\bin"
if not exist "%SVC_BIN_DIR%" mkdir "%SVC_BIN_DIR%"
copy /Y "%BIN_PATH%" "%SVC_BIN_DIR%\pc_manager_service.exe" >nul
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo copiar el binario del servicio a %SVC_BIN_DIR%.
    pause
    exit /b 1
)
set "INSTALLED_BIN=%SVC_BIN_DIR%\pc_manager_service.exe"

echo 3. Registrando servicio en Windows Service Control Manager...
sc.exe query %SERVICE_NAME% >nul 2>&1
if %errorlevel% equ 0 (
    echo    Actualizando ruta y configuracion del servicio...
    sc.exe config %SERVICE_NAME% binPath= "\"%INSTALLED_BIN%\"" start= auto DisplayName= "%DISPLAY_NAME%"
) else (
    echo    Creando nuevo servicio de Windows...
    sc.exe create %SERVICE_NAME% binPath= "\"%INSTALLED_BIN%\"" start= auto DisplayName= "%DISPLAY_NAME%"
)
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo registrar el servicio en Windows Service Control Manager.
    pause
    exit /b 1
)

echo 3. Configurando carpeta de telemetria con permisos universales de lectura...
set "TELEMETRY_DIR=%ProgramData%\PCManager\telemetry"
if not exist "%TELEMETRY_DIR%" mkdir "%TELEMETRY_DIR%"
icacls "%TELEMETRY_DIR%" /grant "*S-1-5-32-545:(OI)(CI)R" /t /q >nul 2>&1

echo 4. Iniciando servicio...
sc.exe start %SERVICE_NAME% >nul 2>&1
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
