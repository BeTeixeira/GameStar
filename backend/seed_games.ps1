param(
    [string]$Email    = "cardosodobruski@gmail.com",
    [string]$Password = "Senha123",
    [string]$BaseUrl  = "http://localhost:8000"
)

# ---------- login ----------
$form = "username=$([uri]::EscapeDataString($Email))&password=$([uri]::EscapeDataString($Password))"
$loginResp = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/token" `
    -Method Post `
    -ContentType "application/x-www-form-urlencoded" `
    -Body $form
$token = $loginResp.access_token
if (-not $token) { Write-Error "Login falhou."; exit 1 }
Write-Host "Login OK" -ForegroundColor Green

$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# ---------- jogos ----------
$games = @(
    @{
        title = "The Witcher 3: Wild Hunt"
        genre = "RPG"
        developer = "CD Projekt Red"
        release_date = "2015-05-19"
        description = "RPG de mundo aberto em universo de fantasia sombria. Siga o cacador de monstros Geralt de Rivia."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg"
    },
    @{
        title = "Red Dead Redemption 2"
        genre = "Acao/Aventura"
        developer = "Rockstar Games"
        release_date = "2019-11-05"
        description = "Uma epica historia de honra e lealdade no crepusculo da era dos foras-da-lei americanos."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg"
    },
    @{
        title = "Cyberpunk 2077"
        genre = "RPG"
        developer = "CD Projekt Red"
        release_date = "2020-12-10"
        description = "RPG de acao em mundo aberto ambientado em Night City, megalopole obcecada com poder e modificacao corporal."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg"
    },
    @{
        title = "Elden Ring"
        genre = "Souls-like"
        developer = "FromSoftware"
        release_date = "2022-02-25"
        description = "RPG de acao em mundo aberto criado com George R. R. Martin. Explore as Terras Intermedias."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg"
    },
    @{
        title = "God of War"
        genre = "Acao/Aventura"
        developer = "Santa Monica Studio"
        release_date = "2022-01-14"
        description = "Kratos e seu filho Atreus embarcam numa jornada pelos reinos da mitologia nordica."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/header.jpg"
    },
    @{
        title = "Hades"
        genre = "Roguelike"
        developer = "Supergiant Games"
        release_date = "2020-09-17"
        description = "Desafie o deus da morte enquanto tenta escapar do submundo grego neste roguelike de acao premiado."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg"
    },
    @{
        title = "Hollow Knight"
        genre = "Metroidvania"
        developer = "Team Cherry"
        release_date = "2017-02-24"
        description = "Explore um vasto reino subterraneo de insetos e herois. Enfrente inimigos mortais e descubra misterios antigos."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/367520/header.jpg"
    },
    @{
        title = "Dark Souls III"
        genre = "Souls-like"
        developer = "FromSoftware"
        release_date = "2016-04-12"
        description = "O capitulo final da serie Dark Souls. Explore um mundo sombrio de mortos-vivos num RPG desafiador."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/374320/header.jpg"
    },
    @{
        title = "Sekiro: Shadows Die Twice"
        genre = "Acao/Aventura"
        developer = "FromSoftware"
        release_date = "2019-03-22"
        description = "Japao feudal sombrio e fantasioso. Reviva e lute como o lobo de um braco - um shinobi descartado."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/814380/header.jpg"
    },
    @{
        title = "Grand Theft Auto V"
        genre = "Acao/Aventura"
        developer = "Rockstar North"
        release_date = "2015-04-14"
        description = "Tres criminosos planejam golpes e vivem o submundo de Los Santos numa historia de gangsters moderna."
        cover_image_url = "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg"
    }
)

# ---------- insercao ----------
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
