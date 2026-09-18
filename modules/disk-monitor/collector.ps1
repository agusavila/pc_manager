# PC Manager - Módulo de Monitoreo de Almacenamiento
# Script Colector de Telemetría Nativa (PowerShell)
# White-Label, Cero Simulación, Lectura Real de Hardware

$ErrorActionPreference = 'SilentlyContinue'

# 1. Verificar si el Servicio de Windows (SYSTEM) ha generado telemetría reciente
$telemetryPath = "$env:ProgramData\PCManager\telemetry\storage_smart.json"
if (Test-Path $telemetryPath) {
    $raw = Get-Content -Raw -Path $telemetryPath -ErrorAction SilentlyContinue
    if ($raw) {
        $cached = $raw | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($cached -and $cached.timestamp) {
            $ts = [DateTime]$cached.timestamp
            if ((Get-Date).ToUniversalTime().Subtract($ts).TotalSeconds -lt 90) {
                Write-Output $raw
                exit 0
            }
        }
    }
}

# 2. Colector de respaldo directo si el servicio no está en ejecución
$pdisks = @(Get-PhysicalDisk -ErrorAction SilentlyContinue)
$counters = @(Get-PhysicalDisk -ErrorAction SilentlyContinue | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue)
$parts = @(Get-Partition -ErrorAction SilentlyContinue | Select-Object DiskNumber, PartitionNumber, DriveLetter, Size)
$vols = @(Get-Volume -ErrorAction SilentlyContinue | Select-Object DriveLetter, FileSystemLabel, FileSystem, HealthStatus, SizeRemaining, Size, DriveType)

$disks = @(Get-Disk -ErrorAction SilentlyContinue | ForEach-Object {
    $d = $_
    $p = $pdisks | Where-Object { [string]$_.DeviceId -eq [string]$d.Number } | Select-Object -First 1
    $c = $counters | Where-Object { [string]$_.DeviceId -eq [string]$d.Number } | Select-Object -First 1

    # Detección exhaustiva de tecnología
    $driveType = 'Almacenamiento'
    $isUsb = ($d.BusType -eq 'USB' -or $d.IsRemovable -or ($p -and $p.BusType -eq 'USB'))
    if ($isUsb) {
        $driveType = 'USB'
    } elseif ($p -and $p.BusType -eq 'NVMe') {
        $driveType = 'NVMe'
    } elseif ($p -and $p.MediaType -eq 'SSD') {
        $driveType = 'SSD'
    } elseif ($p -and $p.MediaType -eq 'HDD') {
        $driveType = 'HDD'
    } elseif ($d.BusType) {
        $driveType = [string]$d.BusType
    }

    $isHdd = ($driveType -eq 'HDD' -or ($p -and $p.MediaType -eq 'HDD'))

    # Desgaste SMART: Solo para medios flash (SSD / NVMe). Para HDDs NUNCA se calcula desgaste de celdas.
    $healthPercent = $null
    if (-not $isHdd -and $c -and $c.Wear -ne $null) {
        $healthPercent = [Math]::Max(0, 100 - [int]$c.Wear)
    }

    # Particiones y Volúmenes asignados al disco
    $diskPartitions = @($parts | Where-Object { [string]$_.DiskNumber -eq [string]$d.Number })
    $diskVols = @($diskPartitions | ForEach-Object {
        $ltr = $_.DriveLetter
        if ($ltr) {
            $vols | Where-Object { [string]$_.DriveLetter -eq [string]$ltr }
        }
    })

    # Detección de sistemas de archivos reales (NTFS, exFAT, FAT32, ReFS, etc.)
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

# Eventos reales del sistema (Controladores de disco, NTFS y subsistema de almacenamiento)
$events = @(Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName=@('disk','Ntfs','stornvme','partmgr'); Id=7,55,98,153} -MaxEvents 10 -ErrorAction SilentlyContinue | ForEach-Object {
    [PSCustomObject]@{
        TimeCreated = $_.TimeCreated.ToString('yyyy-MM-dd HH:mm:ss')
        Id = $_.Id
        ProviderName = $_.ProviderName
        Message = $_.Message
    }
})

[PSCustomObject]@{
    service_active = $false
    disks = $disks
    events = $events
    timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
} | ConvertTo-Json -Depth 5
