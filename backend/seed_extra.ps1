param(
    [string]$Email    = "cardosodobruski@gmail.com",
    [string]$Password = "Senha123",
    [string]$BaseUrl  = "http://localhost:8000"
)

$form = "username=$([uri]::EscapeDataString($Email))&password=$([uri]::EscapeDataString($Password))"
$loginResp = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/token" `
    -Method Post `
    -ContentType "application/x-www-form-urlencoded" `
    -Body $form
$token = $loginResp.access_token
if (-not $token) { Write-Error "Login falhou."; exit 1 }

$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$games = @(
    @{
        title = "Persona 5 Royal"
        genre = "JRPG"
        developer = "Atlus"
        release_date = "2022-10-21"
        description = "Lidere os Phantom Thieves e roube os coracoes corrompidos. Uma historia sobre rebeldia, amizade e mudanca de destino."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/1687950/header.jpg"
    },
    @{
        title = "Persona 3 Reload"
        genre = "JRPG"
        developer = "Atlus"
        release_date = "2024-02-02"
        description = "Remake do classico JRPG. Explore o misterioso Dark Hour e enfrente Sombras com seu alter ego interior, a Persona."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/2161700/header.jpg"
    },
    @{
        title = "Shin Megami Tensei V: Vengeance"
        genre = "JRPG"
        developer = "Atlus"
        release_date = "2024-06-14"
        description = "Versao definitiva de SMT V. Navegue por Toquio pos-apocaliptico como o Nahobino e escolha o destino da criacao."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/2306960/header.jpg"
    }
)

$ok = 0; $fail = 0
foreach ($game in $games) {
    $body = $game | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Uri "$BaseUrl/api/v1/games" -Method Post -Headers $headers -Body $body | Out-Null
        Write-Host "  OK  $($game.title)" -ForegroundColor Cyan
        $ok++
    } catch {
        Write-Host "  ERRO $($game.title): $_" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "$ok jogos cadastrados, $fail erros." -ForegroundColor Yellow
