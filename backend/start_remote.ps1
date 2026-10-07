# Sobe a API e o túnel ngrok, para o app instalado no celular (APK) funcionar
# de qualquer lugar. Abre duas janelas; feche-as para desligar.
#
# Uso (dentro de backend/):  .\start_remote.ps1
#
# Pré-requisito (uma vez só): ngrok instalado e com o authtoken configurado
#   winget install --id Ngrok.Ngrok --exact
#   ngrok config add-authtoken <seu-token>
#
# O ngrok grátis usa sempre o mesmo domínio da conta (o endereço que está em
# Frontapp/eas.json). Se trocar de conta ngrok, o domínio muda e é preciso
# gerar o APK de novo com o endereço novo.

$backend = $PSScriptRoot

# ngrok no PATH ou, se o terminal foi aberto antes da instalação, na pasta do winget
$ngrok = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $ngrok) {
    $ngrok = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok*\ngrok.exe" -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ngrok) {
    Write-Error "ngrok não encontrado. Instale com: winget install --id Ngrok.Ngrok --exact"
    exit 1
}

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$backend'; .\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
)

Start-Process powershell -ArgumentList @("-NoExit", "-Command", "& '$ngrok' http 8000")

Write-Host "API e ngrok iniciando em duas janelas novas."
Write-Host "Teste no navegador: https://crispness-doily-brilliant.ngrok-free.dev/docs"
