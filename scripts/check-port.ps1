# Checks whether this app's dev server answers on the given port. ASCII only on purpose:
# Windows PowerShell 5.1 misreads UTF-8 files without a BOM. User-facing messages live in the .bat file.
# Exit code: 0 = this app is already running, 1 = nothing answers (port is free), 2 = another program uses the port
param([int]$Port = 5173)

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

$r = Get-Page $Port
if ($null -eq $r) { exit 1 }
if ($r.Content -match '<title>Todo List</title>') { exit 0 }
exit 2
