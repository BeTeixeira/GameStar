param(
    [string]$Email    = "cardosodobruski@gmail.com",
    [string]$Password = "Senha123",
    [string]$BaseUrl  = "http://localhost:8000"
)

$form = "username=$([uri]::EscapeDataString($Email))&password=$([uri]::EscapeDataString($Password))"
$loginResp = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/token" `
    -Method Post -ContentType "application/x-www-form-urlencoded" -Body $form
$token = $loginResp.access_token
if (-not $token) { Write-Error "Login falhou."; exit 1 }
Write-Host "Login OK" -ForegroundColor Green

$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# Busca todos os jogos
$games = Invoke-RestMethod -Uri "$BaseUrl/api/v1/games?limit=100" -Headers $headers

# Mapeamento: titulo -> { cover portrait, descricao longa }
$updates = @{
    "The Witcher 3: Wild Hunt" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/library_600x900.jpg"
        desc  = "Em um universo de fantasia sombria, Geralt de Rivia - um cacador de monstros profissional conhecido como Witcher - embarca em uma busca pela filha adotiva que desapareceu. Enquanto isso, o implacavel Exercito Fantasma avanca sobre o Continente. O jogo oferece um mundo aberto vasto com centenas de horas de conteudo, escolhas morais complexas e um dos melhores roteiros ja escritos para um videogame. Suas duas expansoes, Hearts of Stone e Blood and Wine, sao consideradas obras-primas por si so."
    }
    "Red Dead Redemption 2" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_600x900.jpg"
        desc  = "America, 1899. O fim da era dos foras-da-lei se aproxima. Arthur Morgan e o bando Van der Linde se veem em fuga apos um assalto fracassado em uma cidade da fronteira. Com agentes federais e os melhores cacadores de recompensas fechando o cerco, o bando precisa roubar, lutar e abrir caminho pelo coração de uma America brutal e impiedosa. Considerado um dos melhores jogos ja criados, RDR2 entrega narrativa cinematografica, mundo aberto vivo e personagens inesqueciveis."
    }
    "Cyberpunk 2077" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/library_600x900.jpg"
        desc  = "Night City, 2077. Uma megalopole obcecada com poder, glamour e modificacao corporal. Voce e V, um mercenario fora-da-lei em busca de um implante unico - a chave para a imortalidade. Com a voz de uma lenda do rock dentro de sua cabeca, navegue por uma cidade brutal que recompensa ousadia. Cyberpunk 2077 e um RPG de acao de mundo aberto com ramificacoes narrativas profundas, construcao de personagem extensa e uma trilha sonora iconica."
    }
    "Elden Ring" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg"
        desc  = "Criado em colaboracao com George R. R. Martin, Elden Ring e um RPG de acao em mundo aberto ambientado nas Terras Intermedias. O Anel Dourado foi destruido e seus fragmentos espalhados por governantes corrompidos. Como Maculado, voce deve recuperar os cacos, forjar um novo Anel e tornar-se o Lorde Supremo. Com um dos mapas mais bem desenhados dos games, combate desafiador e profundo lore, Elden Ring conquistou o titulo de Jogo do Ano 2022."
    }
    "God of War" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/library_600x900.jpg"
        desc  = "Muito alem dos campos da Grecia, Kratos vive como homem nas terras geladas da mitologia nordica. A morte de sua esposa o deixa com a tarefa de cumprir sua ultima vontade: espalhar suas cinzas no ponto mais alto dos Nove Reinos. Junto ao filho Atreus, Kratos enfrenta deuses e monstros enquanto tenta proteger os segredos de seu passado. Uma jornada de pai e filho que redefiniu os padres narrativos dos games de acao."
    }
    "Hades" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/library_600x900.jpg"
        desc  = "Zagreus, filho do deus da morte, esta determinado a fugir do Submundo grego contra a vontade do proprio pai. A cada tentativa fracassada de fuga voce fica mais forte, aprende mais sobre os misterios do Olimpo e aprofunda seus relacionamentos com deuses e personagens memoraveis. Hades revolucionou o genero roguelike ao integrar narrativa progressiva com cada run, vencendo o BAFTA de Melhor Jogo em 2021."
    }
    "Hollow Knight" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/367520/library_600x900.jpg"
        desc  = "Um cavaleiro solitario desce as ruinas de Hallownest, um antigo reino de insetos soterrado sob a superficie. Explore um vasto e interconectado mundo subterraneo repleto de inimigos mortais, segredos enterrados e criaturas que outrora foram grandes. Com controles precisos, arte desenhada a mao e uma atmosfera melancolia unica, Hollow Knight e considerado um dos melhores metroidvanias de todos os tempos, com mais de 40 horas de conteudo pelo preco de indie."
    }
    "Dark Souls III" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/374320/library_600x900.jpg"
        desc  = "As fogueiras estao se apagando e o fim dos tempos se aproxima. Como Cinza Sem Sorte, voce e convocado para coletar as Cinzas dos Senhores e restaurar a chama. Dark Souls III e o capitulo final da saga que definiu o genero souls-like: combate tecnico e punitivo, level design magistral e um lore rico escondido em descricoes de itens. Boss fights iconicas como Pontifex Sulyvahn e Principe Lothric ficam na memoria para sempre."
    }
    "Sekiro: Shadows Die Twice" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/814380/library_600x900.jpg"
        desc  = "Sengoku, Japao feudal. O Lobo, um shinobi de um braco, falha em proteger seu jovem senhor e acorda com um braco prostetico forjado para a guerra. Sekiro abandona as mecanicas de RPG da serie Souls em favor de um sistema de combate baseado em postura e deflexao que exige maestria absoluta. Com narrativa profundamente japonesa, chefes lendarios e o nivel de desafio mais elevado da FromSoftware, Sekiro ganhou o GOTY 2019."
    }
    "Grand Theft Auto V" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/library_600x900.jpg"
        desc  = "Los Santos, California ficticia. Tres criminosos com passados e motivacoes completamente diferentes se unem para planejar uma serie de golpes audaciosos contra agencias do governo, bancos e rivais do crime organizado. GTA V e uma satira afiada da cultura americana moderna, com um dos mundos abertos mais detalhados e vivos ja criados. O modo online GTA Online expandiu o jogo por mais de uma decada com atualizacoes constantes."
    }
    "Persona 5 Royal" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/1687950/library_600x900.jpg"
        desc  = "Toquio, ano letivo. Um estudante transferido descobre o poder de entrar no Metaverso - uma realidade alternativa formada pelos desejos distorcidos das pessoas. Junto aos Phantom Thieves, ele rouba os coracoes de adultos corruptos para forcalos a confessar seus crimes. Persona 5 Royal combina JRPG de dungeon-crawling com simulacao de vida social, trilha sonora de jazz excepcional e uma narrativa sobre rebeldia e justica. Considerado um dos melhores JRPGs de todos os tempos."
    }
    "Persona 3 Reload" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/2161700/library_600x900.jpg"
        desc  = "A meia-noite, entre um dia e outro, existe uma hora oculta chamada Dark Hour. Monstros conhecidos como Sombras habitam esse horario e devoram as almas humanas. Um estudante do ensino medio descobre ter a capacidade de invocar uma Persona - o alter ego de sua psique - e se une ao SEES para investigar e destruir as Sombras. Remake completo do classico de 2006 com graficos modernos, novas cenas e mecanicas atualizadas mantendo a essencia emocional do original."
    }
    "Shin Megami Tensei V: Vengeance" = @{
        cover = "https://cdn.cloudflare.steamstatic.com/steam/apps/2306960/library_600x900.jpg"
        desc  = "Toquio, dias atuais. Um estudante e misteriosamente transportado para Da'at - uma versao pos-apocaliptica de Toquio dominada por demonios. Fundindo-se com uma entidade misteriosa, ele se torna o Nahobino, um ser alem de humanos e demonios. SMT V Vengeance e a versao definitiva do aclamado JRPG, adicionando uma nova rota narrativa completa, novos demonios e parceiras. Prepare-se para escolher entre Lei, Caos ou Neutralidade e determinar o destino da criacao."
    }
}

$ok = 0; $fail = 0
foreach ($game in $games) {
    if ($updates.ContainsKey($game.title)) {
        $u = $updates[$game.title]
        $body = @{ cover_image_url = $u.cover; description = $u.desc } | ConvertTo-Json -Compress
        try {
            Invoke-RestMethod -Uri "$BaseUrl/api/v1/games/$($game.id)" -Method Patch -Headers $headers -Body $body | Out-Null
            Write-Host "  OK  $($game.title)" -ForegroundColor Cyan
            $ok++
        } catch {
            Write-Host "  ERRO $($game.title): $_" -ForegroundColor Red
            $fail++
        }
    }
}

Write-Host ""
Write-Host "$ok jogos atualizados, $fail erros." -ForegroundColor Yellow
