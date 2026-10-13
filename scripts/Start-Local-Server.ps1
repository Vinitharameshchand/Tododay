# DeskNotes Local Zero-Dependency HTTP Server (PowerShell Native)
# Runs without Node.js or Python!

$Port = 8080
$Folder = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Folder "index.html"))) {
    $Folder = $PSScriptRoot
}

# Detect local LAN IP for phone connection
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notlike '*Loopback*' -and 
    $_.IPAddress -notlike '169.254*' -and 
    $_.IPAddress -ne '127.0.0.1' 
} | Select-Object -ExpandProperty IPAddress -First 1)

if (-not $LocalIP) { $LocalIP = "localhost" }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         DeskNotes Desktop & Mobile Local Server          " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "💻 Desktop Widget URL: http://localhost:$Port" -ForegroundColor Green
Write-Host "📱 Phone Browser URL:  http://${LocalIP}:$Port" -ForegroundColor Magenta
Write-Host "----------------------------------------------------------"
Write-Host "Open the Phone URL on your mobile phone on the same Wi-Fi!"
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host "=========================================================="

# Launch Desktop Widget in borderless App mode
$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $EdgePath)) {
    $EdgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
if (Test-Path $EdgePath) {
    Start-Process -FilePath $EdgePath -ArgumentList "--app=http://localhost:$Port", "--window-size=900,700", "--window-position=1100,60"
} else {
    Start-Process "http://localhost:$Port"
}

# Start HttpListener
$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://+:$Port/")

try {
    $Listener.Start()
} catch {
    # If wildcard binding requires admin, fallback to localhost prefix
    $Listener = New-Object System.Net.HttpListener
    $Listener.Prefixes.Add("http://localhost:$Port/")
    $Listener.Start()
}

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".ico"  = "image/x-icon"
}

while ($Listener.IsListening) {
    $Context = $Listener.GetContext()
    $Request = $Context.Request
    $Response = $Context.Response

    $UrlPath = $Request.Url.AbsolutePath
    if ($UrlPath -eq "/" -or [string]::IsNullOrEmpty($UrlPath)) {
        $UrlPath = "/index.html"
    }

    $FilePath = Join-Path $Folder $UrlPath.TrimStart('/')

    if (Test-Path $FilePath -PathType Leaf) {
        $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
        $ContentType = $MimeTypes[$Ext]
        if (-not $ContentType) { $ContentType = "application/octet-stream" }

        $Response.ContentType = $ContentType
        $Response.AddHeader("Access-Control-Allow-Origin", "*")
        
        $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $Response.ContentLength64 = $Bytes.Length
        $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
    } else {
        $Response.StatusCode = 404
        $NotFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $Response.OutputStream.Write($NotFoundMsg, 0, $NotFoundMsg.Length)
    }

    $Response.OutputStream.Close()
}
