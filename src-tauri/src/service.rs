// PC Manager - Modo Servicio Nativo de Windows (Pre-logon)
// Arquitectura Core-Modular, Gobernanza de Solo Lectura (Regla 5 y Regla 8)

#[cfg(target_os = "windows")]
pub mod win_service {
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::thread;
    use std::time::Duration;
    use windows_sys::Win32::System::Services::{
        SetServiceStatus, StartServiceCtrlDispatcherW,
        SERVICE_ACCEPT_SHUTDOWN, SERVICE_ACCEPT_STOP, SERVICE_CONTROL_INTERROGATE,
        SERVICE_CONTROL_SHUTDOWN, SERVICE_CONTROL_STOP, SERVICE_RUNNING, SERVICE_START_PENDING,
        SERVICE_STATUS, SERVICE_STATUS_HANDLE, SERVICE_STOPPED, SERVICE_STOP_PENDING,
        SERVICE_TABLE_ENTRYW, SERVICE_WIN32_OWN_PROCESS,
    };

    static RUNNING: AtomicBool = AtomicBool::new(false);
    static mut STATUS_HANDLE: usize = 0;

    unsafe extern "system" fn service_handler(control: u32) {
        let handle = STATUS_HANDLE as SERVICE_STATUS_HANDLE;
        match control {
            SERVICE_CONTROL_STOP | SERVICE_CONTROL_SHUTDOWN => {
                RUNNING.store(false, Ordering::SeqCst);
                let mut status = SERVICE_STATUS {
                    dwServiceType: SERVICE_WIN32_OWN_PROCESS,
                    dwCurrentState: SERVICE_STOP_PENDING,
                    dwControlsAccepted: 0,
                    dwWin32ExitCode: 0,
                    dwServiceSpecificExitCode: 0,
                    dwCheckPoint: 1,
                    dwWaitHint: 3000,
                };
                SetServiceStatus(handle, &mut status);
            }
            SERVICE_CONTROL_INTERROGATE => {
                let mut status = SERVICE_STATUS {
                    dwServiceType: SERVICE_WIN32_OWN_PROCESS,
                    dwCurrentState: if RUNNING.load(Ordering::SeqCst) {
                        SERVICE_RUNNING
                    } else {
                        SERVICE_STOPPED
                    },
                    dwControlsAccepted: SERVICE_ACCEPT_STOP | SERVICE_ACCEPT_SHUTDOWN,
                    dwWin32ExitCode: 0,
                    dwServiceSpecificExitCode: 0,
                    dwCheckPoint: 0,
                    dwWaitHint: 0,
                };
                SetServiceStatus(handle, &mut status);
            }
            _ => {}
        }
    }

    unsafe extern "system" fn service_main(_argc: u32, _argv: *mut *mut u16) {
        use windows_sys::Win32::System::Services::RegisterServiceCtrlHandlerW;

        let svc_name: Vec<u16> = "pc_manager_service\0".encode_utf16().collect();
        let handle = RegisterServiceCtrlHandlerW(svc_name.as_ptr(), Some(service_handler));
        if handle == 0 as SERVICE_STATUS_HANDLE {
            return;
        }
        STATUS_HANDLE = handle as usize;

        let mut status = SERVICE_STATUS {
            dwServiceType: SERVICE_WIN32_OWN_PROCESS,
            dwCurrentState: SERVICE_START_PENDING,
            dwControlsAccepted: 0,
            dwWin32ExitCode: 0,
            dwServiceSpecificExitCode: 0,
            dwCheckPoint: 0,
            dwWaitHint: 3000,
        };
        SetServiceStatus(handle, &mut status);

        RUNNING.store(true, Ordering::SeqCst);

        status.dwCurrentState = SERVICE_RUNNING;
        status.dwControlsAccepted = SERVICE_ACCEPT_STOP | SERVICE_ACCEPT_SHUTDOWN;
        SetServiceStatus(handle, &mut status);

        // Bucle de telemetría de hardware de bajo nivel en segundo plano (Solo Lectura)
        while RUNNING.load(Ordering::SeqCst) {
            collect_and_write_storage_telemetry();
            thread::sleep(Duration::from_secs(8));
        }

        status.dwCurrentState = SERVICE_STOPPED;
        status.dwControlsAccepted = 0;
        SetServiceStatus(handle, &mut status);
    }

    pub fn collect_once() {
        collect_and_write_storage_telemetry();
    }

    fn collect_and_write_storage_telemetry() {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let script = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            $dir = "$env:ProgramData\PCManager\telemetry"
            if (-not (Test-Path $dir)) {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
                icacls $dir /grant "*S-1-5-32-545:(OI)(CI)R" /t /q | Out-Null
            }

            $pdisks = @(Get-PhysicalDisk -ErrorAction SilentlyContinue)
            $counters = @(Get-PhysicalDisk -ErrorAction SilentlyContinue | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue)
            $parts = @(Get-Partition -ErrorAction SilentlyContinue | Select-Object DiskNumber, PartitionNumber, DriveLetter, Size)
            $vols = @(Get-Volume -ErrorAction SilentlyContinue | Select-Object DriveLetter, FileSystemLabel, FileSystem, HealthStatus, SizeRemaining, Size, DriveType)

            $disks = @(Get-Disk -ErrorAction SilentlyContinue | ForEach-Object {
                $d = $_
                $p = $pdisks | Where-Object { [string]$_.DeviceId -eq [string]$d.Number } | Select-Object -First 1
                $c = $counters | Where-Object { [string]$_.DeviceId -eq [string]$d.Number } | Select-Object -First 1

                $driveType = 'Almacenamiento'
                $isUsb = ($d.BusType -eq 'USB' -or $d.IsRemovable -or ($p -and $p.BusType -eq 'USB'))
                if ($isUsb) { $driveType = 'USB' }
                elseif ($p -and $p.BusType -eq 'NVMe') { $driveType = 'NVMe' }
                elseif ($p -and $p.MediaType -eq 'SSD') { $driveType = 'SSD' }
                elseif ($p -and $p.MediaType -eq 'HDD') { $driveType = 'HDD' }
                elseif ($d.BusType) { $driveType = [string]$d.BusType }

                $isHdd = ($driveType -eq 'HDD' -or ($p -and $p.MediaType -eq 'HDD'))
                $healthPercent = $null
                if (-not $isHdd -and $c -and $c.Wear -ne $null) {
                    $healthPercent = [Math]::Max(0, 100 - [int]$c.Wear)
                }

                $diskPartitions = @($parts | Where-Object { [string]$_.DiskNumber -eq [string]$d.Number })
                $diskVols = @($diskPartitions | ForEach-Object {
                    $ltr = $_.DriveLetter
                    if ($ltr) {
                        $vols | Where-Object { [string]$_.DriveLetter -eq [string]$ltr }
                    }
                })

                $fileSystems = @($diskVols | Where-Object { $_.FileSystem } | ForEach-Object { [string]$_.FileSystem } | Select-Object -Unique)

                $serial = if ($p -and $p.SerialNumber) { [string]$p.SerialNumber.Trim() } else { [string]$d.SerialNumber }
                if (-not $serial -or $serial -eq '') { $serial = 'N/D' }

                $model = if ($p -and $p.Model) { [string]$p.Model.Trim() } else { [string]$d.Model }
                if (-not $model -or $model -eq '') { $model = $d.FriendlyName }

                [PSCustomObject]@{
                    DeviceId = [string]$d.Number
                    FriendlyName = [string]$d.FriendlyName
                    Model = $model
                    SerialNumber = $serial
                    BusType = if ($p -and $p.BusType) { [string]$p.BusType } else { [string]$d.BusType }
                    DriveType = $driveType
                    MediaType = if ($p -and $p.MediaType) { [string]$p.MediaType } else { if ($isUsb) { 'Removable' } else { 'Fixed' } }
                    IsHdd = [bool]$isHdd
                    HealthStatus = if ($p -and $p.HealthStatus) { [string]$p.HealthStatus } else { [string]$d.HealthStatus }
                    OperationalStatus = if ($p -and $p.OperationalStatus) { [string]$p.OperationalStatus } else { [string]$d.OperationalStatus }
                    HealthPercent = $healthPercent
                    Temperature = if ($c -and $c.Temperature -gt 0) { [int]$c.Temperature } else { $null }
                    ReadErrorsTotal = if ($c -and $c.ReadErrorsTotal -ne $null) { [int]$c.ReadErrorsTotal } else { 0 }
                    WriteErrorsTotal = if ($c -and $c.WriteErrorsTotal -ne $null) { [int]$c.WriteErrorsTotal } else { 0 }
                    ReadErrorsUncorrected = if ($c -and $c.ReadErrorsUncorrected -ne $null) { [int]$c.ReadErrorsUncorrected } else { 0 }
                    WriteErrorsUncorrected = if ($c -and $c.WriteErrorsUncorrected -ne $null) { [int]$c.WriteErrorsUncorrected } else { 0 }
                    PowerOnHours = if ($c -and $c.PowerOnHours -ne $null) { [int]$c.PowerOnHours } else { $null }
                    Size = [int64]$d.Size
                    IsRemovable = [bool]$isUsb
                    IsBoot = [bool]$d.IsBoot
                    IsSystem = [bool]$d.IsSystem
                    IsConnected = $true
                    FileSystems = $fileSystems
                    Partitions = $diskPartitions
                    Volumes = $diskVols
                }
            })

            $events = @(Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName=@('disk','Ntfs','stornvme','partmgr'); Id=7,55,98,153} -MaxEvents 12 -ErrorAction SilentlyContinue | ForEach-Object {
                [PSCustomObject]@{
                    TimeCreated = $_.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')
                    Id = $_.Id
                    ProviderName = $_.ProviderName
                    Message = $_.Message
                }
            })

            $payload = [PSCustomObject]@{
                service_active = $true
                disks = $disks
                events = $events
                timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
            } | ConvertTo-Json -Depth 5

            $targetFile = "$dir\storage_smart.json"
            $tempFile = "$dir\storage_smart.tmp"
            $payload | Set-Content -Path $tempFile -Encoding utf8
            Move-Item -Path $tempFile -Destination $targetFile -Force
        "#;

        let mut cmd = Command::new("powershell.exe");
        cmd.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script]);
        cmd.creation_flags(CREATE_NO_WINDOW);
        let _ = cmd.output();
    }

    pub fn run_service() -> Result<(), String> {
        let svc_name: Vec<u16> = "pc_manager_service\0".encode_utf16().collect();
        let service_table = [
            SERVICE_TABLE_ENTRYW {
                lpServiceName: svc_name.as_ptr() as *mut u16,
                lpServiceProc: Some(service_main),
            },
            SERVICE_TABLE_ENTRYW {
                lpServiceName: std::ptr::null_mut(),
                lpServiceProc: None,
            },
        ];

        let success = unsafe { StartServiceCtrlDispatcherW(service_table.as_ptr()) };
        if success == 0 {
            Err("Fallo al iniciar el despachador de servicios de Windows (StartServiceCtrlDispatcherW)".to_string())
        } else {
            Ok(())
        }
    }
}
