param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot ".env.deploy"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing .env.deploy. Copy .env.deploy.example to .env.deploy and fill in your Hostinger FTP details."
}

Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()

    if (-not $line -or $line.StartsWith("#")) {
        return
    }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
        return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim()

    if ($name -eq "FTP_PASS" -and [string]::IsNullOrWhiteSpace($value) -and -not [string]::IsNullOrWhiteSpace($env:FTP_PASS)) {
        return
    }

    [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

$requiredVars = @("FTP_PROTOCOL", "FTP_HOST", "FTP_PORT", "FTP_USER", "FTP_REMOTE_DIR")

foreach ($varName in $requiredVars) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($varName))) {
        throw "Set $varName in .env.deploy."
    }
}

$protocol = $env:FTP_PROTOCOL.ToLowerInvariant()

if ($protocol -notin @("ftp", "ftps")) {
    throw "FTP_PROTOCOL must be ftp or ftps."
}

if (-not $DryRun -and [string]::IsNullOrWhiteSpace($env:FTP_PASS)) {
    $securePassword = Read-Host "FTP password for $($env:FTP_USER)@$($env:FTP_HOST)" -AsSecureString
    $credential = [System.Net.NetworkCredential]::new("", $securePassword)
    $env:FTP_PASS = $credential.Password
}

$curl = Get-Command curl.exe -ErrorAction Stop
$excludeNames = @(
    ".env.deploy",
    ".env.deploy.example",
    ".gitignore",
    "deploy-ftp.sh",
    "deploy-hostinger.ps1"
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

Write-Host "Hostinger deploy target: $($env:FTP_PROTOCOL)://$($env:FTP_HOST):$($env:FTP_PORT)/$($env:FTP_REMOTE_DIR)"
Write-Host "Files selected: $($files.Count)"

foreach ($file in $files) {
    $relativePath = Get-RelativeDeployPath -BasePath $PSScriptRoot -FilePath $file.FullName
    $remotePath = "$($env:FTP_REMOTE_DIR.TrimEnd('/'))/$relativePath"
    $url = "ftp://$($env:FTP_HOST):$($env:FTP_PORT)/$remotePath"

    if ($DryRun) {
        Write-Host "DRY RUN $relativePath"
        continue
    }

    Write-Host "Uploading $relativePath"

    $curlArgs = @(
        "--fail",
        "--show-error",
        "--silent",
        "--connect-timeout",
        "30",
        "--max-time",
        "90",
        "--ftp-create-dirs",
        "--user",
        "$($env:FTP_USER):$($env:FTP_PASS)",
        "--upload-file",
        $file.FullName,
        $url
    )

    if ($protocol -eq "ftps") {
        $curlArgs = @("--ssl-reqd") + $curlArgs
    }

    & $curl.Source @curlArgs

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to upload $relativePath. curl exit code: $LASTEXITCODE"
    }
}

if ($DryRun) {
    Write-Host "Dry run finished. No files were uploaded."
} else {
    Write-Host "Deploy finished."
}
