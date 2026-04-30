param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot ".env.deploy"

if (Test-Path -LiteralPath $envFile) {
    Get-Content -LiteralPath $envFile | ForEach-Object {
        $line = $_.Trim()

        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $parts = $line -split "=", 2
        if ($parts.Count -ne 2) {
            return
        }

        [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
    }
}

if ([string]::IsNullOrWhiteSpace($env:SSH_HOST) -and -not [string]::IsNullOrWhiteSpace($env:FTP_HOST)) {
    $env:SSH_HOST = $env:FTP_HOST
}

if ([string]::IsNullOrWhiteSpace($env:SSH_PORT)) {
    $env:SSH_PORT = "65002"
}

if ([string]::IsNullOrWhiteSpace($env:SSH_REMOTE_DIR) -and -not [string]::IsNullOrWhiteSpace($env:FTP_REMOTE_DIR)) {
    $env:SSH_REMOTE_DIR = $env:FTP_REMOTE_DIR
}

$requiredVars = @("SSH_HOST", "SSH_PORT", "SSH_USER", "SSH_REMOTE_DIR")

foreach ($varName in $requiredVars) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($varName))) {
        throw "Set $varName in .env.deploy or in the current PowerShell session."
    }
}

$scp = Get-Command scp.exe -ErrorAction Stop
$ssh = Get-Command ssh.exe -ErrorAction Stop

$excludeNames = @(
    ".env.deploy",
    ".env.deploy.example",
    ".gitignore",
    "deploy-ftp.sh",
    "deploy-hostinger.ps1",
    "deploy-hostinger-ssh.ps1"
)

function Get-RelativeDeployPath {
    param(
        [string]$BasePath,
        [string]$FilePath
    )

    $baseUri = [System.Uri]::new(($BasePath.TrimEnd("\") + "\"))
    $fileUri = [System.Uri]::new($FilePath)

    return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fileUri).ToString())
}

$files = Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | Where-Object {
    $relativePath = Get-RelativeDeployPath -BasePath $PSScriptRoot -FilePath $_.FullName
    $isExcludedPath = $relativePath.StartsWith(".git/") -or $relativePath.StartsWith(".vscode/")

    -not $isExcludedPath -and $_.Name -notin $excludeNames
}

$target = "$($env:SSH_USER)@$($env:SSH_HOST)"
$remoteRoot = $env:SSH_REMOTE_DIR.TrimEnd("/")

Write-Host "Hostinger SSH deploy target: $target`:$remoteRoot"
Write-Host "SSH port: $($env:SSH_PORT)"
Write-Host "Files selected: $($files.Count)"

foreach ($file in $files) {
    $relativePath = Get-RelativeDeployPath -BasePath $PSScriptRoot -FilePath $file.FullName
    $remotePath = "$remoteRoot/$relativePath"
    $remoteDir = Split-Path -Path $remotePath -Parent

    if ($DryRun) {
        Write-Host "DRY RUN $relativePath"
        continue
    }

    Write-Host "Uploading $relativePath"

    & $ssh.Source -p $env:SSH_PORT $target "mkdir -p '$remoteDir'"

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create remote directory $remoteDir. ssh exit code: $LASTEXITCODE"
    }

    & $scp.Source -P $env:SSH_PORT $file.FullName "$target`:$remotePath"

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to upload $relativePath. scp exit code: $LASTEXITCODE"
    }
}

if ($DryRun) {
    Write-Host "Dry run finished. No files were uploaded."
} else {
    Write-Host "SSH deploy finished."
}
