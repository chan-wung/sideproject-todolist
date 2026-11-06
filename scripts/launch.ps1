# 업무용 투두리스트 실행기 (투두리스트_실행.bat 이 호출한다)
# - 어느 폴더에서 실행하든(바로가기 포함) 프로젝트 폴더로 이동한다
# - 설치가 실패하면 멈추고, 이미 이 앱이 켜져 있으면 브라우저만 연다
# - 포트는 고정한다: 주소(포트)가 바뀌면 브라우저가 다른 저장소를 보게 되어 데이터가 사라진 것처럼 보인다
# - 다른 프로그램이 그 포트를 쓰고 있으면 그 프로그램을 종료하지 않고 안내만 한다
param(
  [int]$Port = 5173,
  [switch]$NoBrowser  # 테스트용: 브라우저를 열지 않는다
)

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
try { $Host.UI.RawUI.WindowTitle = '업무용 투두리스트' } catch { }

function Stop-WithMessage([string]$Message, [int]$Code) {
  Write-Host ''
  Write-Host $Message -ForegroundColor Red
  Write-Host ''
  try { Read-Host 'Enter 키를 누르면 닫힙니다' | Out-Null } catch { }
  exit $Code
}

function Open-Browser([int]$TimeoutSec) {
  if ($NoBrowser) { return }
  & (Join-Path $PSScriptRoot 'open-when-ready.ps1') -Port $Port -TimeoutSec $TimeoutSec
}

Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

# powershell 의 npm.ps1 은 실행 정책에 막힐 수 있어 npm.cmd 를 직접 부른다
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Stop-WithMessage 'Node.js 를 찾을 수 없습니다. Node.js 를 설치한 뒤 다시 실행해 주세요.' 1
}

if (-not (Test-Path -LiteralPath 'node_modules' -PathType Container)) {
  Write-Host ''
  Write-Host '초기 설치가 필요합니다. 패키지를 설치 중입니다. 최초 1회만 진행합니다...'
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage '패키지 설치에 실패했습니다. 인터넷 연결을 확인하고 다시 실행해 주세요.' 1
  }
  Write-Host '설치 완료!'
}

# 결과 0 = 이 앱이 이미 실행 중, 1 = 비어 있음, 2 = 다른 프로그램이 사용 중
& (Join-Path $PSScriptRoot 'check-port.ps1') -Port $Port
$state = $LASTEXITCODE

if ($state -eq 2) {
  Stop-WithMessage ("포트 $Port 를 다른 프로그램이 이미 사용 중입니다.`n" +
    "그 프로그램을 종료한 뒤 다시 실행해 주세요. 이 실행기는 다른 프로그램을 종료하지 않습니다.`n" +
    '포트가 바뀌면 브라우저에 저장된 데이터가 보이지 않으므로 다른 포트로 자동 전환하지 않습니다.') 1
}

if ($state -eq 0) {
  Write-Host '이미 실행 중입니다. 브라우저만 엽니다.'
  Open-Browser 5
  exit 0
}

Write-Host '======================================='
Write-Host '업무용 투두리스트 서버를 시작합니다...'
Write-Host ''
Write-Host '이 검은 창을 닫으면 투두리스트 접속이 끊어집니다.'
Write-Host '업무가 끝날 때까지 창을 최소화해 두세요.'
Write-Host "주소: http://localhost:$Port/"
Write-Host '======================================='

# 서버가 준비되면 브라우저가 열린다. 준비 전에 열어 빈 화면이 뜨지 않게 따로 기다린다.
if (-not $NoBrowser) {
  Start-Process powershell -WindowStyle Minimized -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'open-when-ready.ps1'), '-Port', $Port
  )
}

& npm.cmd run dev -- --port $Port --strictPort
$code = $LASTEXITCODE
Write-Host ''
Write-Host "서버가 종료되었습니다. 종료 코드: $code"
try { Read-Host 'Enter 키를 누르면 닫힙니다' | Out-Null } catch { }
exit $code
