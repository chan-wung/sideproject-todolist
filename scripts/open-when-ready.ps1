# Waits until this app's server answers, then opens the browser (avoids opening a blank page before the server is up).
# Browser data is stored per browser, so Chrome is tried first like before; the default browser is the fallback.
# ASCII only on purpose (see check-port.ps1).
# Exit code: 0 = opened, 1 = server was not ready in time
param([int]$Port = 5173, [int]$TimeoutSec = 90)

function Get-Page([int]$Port) {
  # Dev servers may listen on IPv4 only or IPv6 only, and 'localhost' does not always fall back, so try all three.
  foreach ($h in @('localhost', '127.0.0.1', '[::1]')) {
    try {
      return Invoke-WebRequest -UseBasicParsing -Uri "http://${h}:$Port/" -TimeoutSec 2
    } catch {
    }
  }
  return $null
}

$url = "http://localhost:$Port/"
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
  $r = Get-Page $Port
  if ($null -ne $r -and $r.Content -match '<title>Todo List</title>') {
    try { Start-Process chrome $url } catch { Start-Process $url }
    exit 0
  }
  Start-Sleep -Seconds 1
}
exit 1
