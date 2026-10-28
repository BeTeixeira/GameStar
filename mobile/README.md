# GameStar — app mobile (React Native / Expo)

App mobile do GameStar, feito com **Expo SDK 57** e **Expo Router** (navegação
por arquivos). Conversa com a API FastAPI da pasta `backend/`: login, cadastro,
catálogo de jogos, busca, comentários/notas, "Minha lista", amigos, conta
especialista e seguidores vêm do backend.

> Requer **Node.js 20.19.4+** (recomendado 22 LTS). Com Node mais antigo o
> Metro não consegue gerar o app e o Expo Go mostra **erro 500**.

## Como rodar

1. Suba a API (veja o README da raiz). Ela precisa escutar na rede, não só em
   localhost, para o celular conseguir acessar:
   ```bash
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
2. Rode o app:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. Abra no celular com o app **Expo Go** (escaneando o QR code), pressione `a`
   para abrir no emulador Android, ou `w` para abrir no navegador.

O Expo Go precisa ser da mesma versão de SDK do projeto (57). O da loja já é.
No emulador, o `npx expo start` oferece instalar a versão certa sozinho.

### Endereço da API

O app descobre sozinho: usa o mesmo IP do servidor do Expo, porta 8000
(no navegador, `http://localhost:8000`). Para forçar outro endereço, crie um
arquivo `.env` nesta pasta com:

```
EXPO_PUBLIC_API_URL=http://192.168.0.10:8000
```

## APK para instalar no celular (acesso de qualquer lugar)

O APK chama a API pelo túnel **ngrok** (endereço fixo em `app.json` →
`extra.apiUrl`), então funciona fora de casa, até no 4G — desde que o PC
esteja ligado com a API e o ngrok rodando:

```powershell
cd backend
.\scripts\start_remote.ps1      # abre a API e o ngrok em duas janelas
```

Se o endereço do ngrok mudar, troque `extra.apiUrl` no `app.json` e publique
um update (veja abaixo) — não precisa de APK novo.

## Versões e atualizações

### Números de versão

| Onde | Campo | Quem muda |
|---|---|---|
| `app.json` | `version` (ex: `0.2.0-beta`) — versão que o usuário vê | **você**, antes de cada release |
| EAS (servidor) | `versionCode` do Android — precisa subir a cada APK | **automático** (`autoIncrement` no `eas.json`) |

O app ainda está em **beta**: a versão fica em `0.x` com o sufixo `-beta` até o
lançamento da `1.0.0`. `version` segue `MAIOR.MENOR.CORREÇÃO`: correção →
`0.2.1-beta`; função nova → `0.3.0-beta`. No lançamento oficial, vira `1.0.0`
(sem sufixo) e as Releases deixam de ser marcadas como pré-lançamento.

### Duas formas de levar mudanças ao celular

| Mudou... | Como entregar | Comando (em `mobile/`) |
|---|---|---|
| Só código JS/TS (telas, textos, lógica, estilos, `app.json` → `extra`) | **EAS Update**: o app baixa sozinho ao abrir, sem reinstalar | `npm run update -- --message "o que mudou"` |
| Algo nativo (versão do SDK, nova biblioteca nativa, permissões, ícone, `package`) | **APK novo** | `npm run build:apk` |

Na dúvida, publique o update: o `runtimeVersion` usa a política
**fingerprint**, que calcula uma "impressão digital" da parte nativa. Um update
só chega a APKs com a mesma parte nativa, então nunca entrega algo
incompatível — se a parte nativa mudou, o update fica esperando um APK novo.

O app verifica updates ao abrir e aplica na **próxima** abertura (abra, feche
e abra de novo para ver a mudança).

### Lançando uma versão (release)

1. Tudo que vai na versão já está na `main`.
2. Suba `version` no `app.json` (ex: `0.2.0-beta` → `0.3.0-beta`), comite e envie.
3. `npm run build:apk` — o link do APK aparece no terminal e em https://expo.dev
   (projeto `gamestar-app`).
4. Marque o commit e publique a Release no GitHub com o APK anexado:
   ```bash
   git tag -a app-v0.3.0-beta -m "GameStar 0.3.0-beta"
   git push origin app-v0.3.0-beta
   gh release create app-v0.3.0-beta gamestar-0.3.0-beta.apk --prerelease --title "GameStar 0.3.0 (beta)" --notes "o que mudou"
   ```

As tags do app usam o prefixo `app-v` (o backend, se for versionado, usa
`api-v`), porque os dois ficam no mesmo repositório. As versões já lançadas
ficam em **Releases** no GitHub, cada uma com o APK para baixar.

## Estrutura de pastas

```
src/
  app/                    ← cada arquivo aqui é uma TELA (rota)
    _layout.tsx             layout raiz (tema, login obrigatório, navegação em pilha)
    login.tsx               Login / cadastro (só conta normal) → rota "/login"
    index.tsx               Catálogo + busca                → rota "/"
    biblioteca.tsx          Minha lista (filtros)           → rota "/biblioteca"
    amigos.tsx              Amigos, pedidos e adicionar     → rota "/amigos"
    perfil.tsx              Perfil: foto/fundo (GIF), dados, senha, sair, excluir → rota "/perfil"
    jogo/[id].tsx           Detalhe do jogo, notas (usuários e especialistas) e comentários → rota "/jogo/<id>"
    admin/index.tsx         Painel do admin: jogos, usuários, especialistas → rota "/admin" (só admin)
    admin/jogo.tsx          Formulário de jogo (novo/editar)  → rota "/admin/jogo?id=<id>"
    admin/pedidos.tsx       Pedidos de conta especialista     → rota "/admin/pedidos" (só admin)
    admin/pedido/[id].tsx   Detalhe e decisão de um pedido    → rota "/admin/pedido/<id>"
    admin/moderacao.tsx     Moderação dentro do painel do admin → rota "/admin/moderacao"
    avisos.tsx              Central de avisos (notificações)  → rota "/avisos"
    moderacao.tsx           Painel do moderador: denúncias, silenciar, banir → rota "/moderacao"
    pedir-especialista.tsx  Pedido para virar especialista    → rota "/pedir-especialista"
    perfil-publico/[id].tsx Perfil público (nome, foto, bio, avaliações por jogo) → rota "/perfil-publico/<id>"
  services/api.ts         cliente HTTP da API (token, endereço, erros)
  types/index.ts          tipos do app + conversão das respostas da API
  context/
    AuthContext.tsx       login, cadastro, logout, usuário logado
    GamesContext.tsx      catálogo de jogos (GET /api/v1/games)
    LibraryContext.tsx    "Minha lista": status dos jogos (/library) + suas avaliações
    FollowContext.tsx     especialistas que você segue (/users/me/following)
    NotificationsContext.tsx  avisos e contador de não lidos (/notifications) + token de push
  theme/
    colors.ts             paleta de cores (light/dark)
    ThemeContext.tsx      lógica do toggle claro/escuro
  utils/confirm.ts        confirmação antes de excluir + formatar datas
  components/
    TopBar.tsx            barra superior com os ícones de navegação
    SearchBar.tsx         campo de busca
    GameCard.tsx          card de jogo (catálogo e minha lista)
    FriendCard.tsx        card de amigo
    FilterPills.tsx       chips de filtro/status
    StarRating.tsx        estrelas de avaliação (só leitura ou clicáveis)
    SelectField.tsx       caixa de seleção (ex: "Área de atuação")
    admin/                abas do painel do admin (GamesAdmin, UsersAdmin, ExpertsAdmin)
    moderation/           moderação (ModerationPanel, ReportCard, ModerationActions)
```

## Painel do admin

Contas com `role` admin veem um escudo na barra superior, que abre `/admin`:

| Aba | O que faz |
|---|---|
| Jogos | cadastrar, editar (título, gênero, desenvolvedora, data, capa por URL, sinopse) e excluir |
| Usuários | buscar por nome, usuário ou e-mail; desativar/reativar e excluir contas |
| Especialistas | tornar uma conta especialista **pelo ID da conta** (a pessoa vê o ID no próprio perfil), com confirmação; também volta para conta normal |

Na tela do jogo, o admin pode excluir o comentário de qualquer pessoa (moderação).
Para criar um admin local: `python scripts/create_admin.py` (pasta `backend/`).

## Conta especialista

O cadastro do app cria só **conta normal**. Para virar especialista
(Influencer, Jornalista, Dev, Empresa — lista em `EXPERT_AREAS`,
`src/types/index.ts`), a conta normal toca em **Quero ser especialista** no Perfil
e envia um pedido (tela `/pedir-especialista`: área, empresa, link e mensagem).
O admin analisa o pedido na aba **Pedidos** do painel (`/admin/pedidos`) e aprova
ou recusa com um motivo; a pessoa recebe um aviso com a decisão.
Quando uma conta já é especialista (`account_type` vindo da API), o app muda assim:

| Onde | Conta normal | Conta especialista |
|---|---|---|
| Detalhe do jogo | status "Na minha lista" | sem status; o comentário entra na **Nota especialista** |
| Comentários | — | selo "Especialista · Área" e botão **Seguir** para os outros usuários |
| Minha lista | filtros por status | só os jogos que avaliou |
| Perfil | "Na minha lista", perfil privado | **Seguidores**, empresa e área de atuação |
| Barra superior | botão de tema | sem botão de tema (fica no perfil); tocar no nome volta ao início |

## O que ainda NÃO vem do backend

| Funcionalidade                     | Situação hoje                                                  |
| ---------------------------------- | -------------------------------------------------------------- |
| Sessão de login                    | só em memória — fechar o app pede login de novo                 |

## Onde editar cada coisa

| Quero mudar...                              | Arquivo                                  |
| -------------------------------------------- | ----------------------------------------- |
| Mensagens de erro da tela de amigos          | `ERROR_MESSAGES` no topo de `src/app/amigos.tsx` |
| Ícones (Ionicons)                            | qualquer `<Ionicons name="..." />` — trocar o `name` já troca o ícone. Lista completa: https://icons.expo.fyi |
| Cores do app (claro/escuro)                  | `src/theme/colors.ts`                     |
| Texto fixo de tela (títulos, placeholders)   | procure o comentário `// TEXTO EDITÁVEL` no arquivo da tela em `src/app/` |
| Filtros da tela "Minha lista"                | array `FILTERS` no topo de `src/app/biblioteca.tsx` |
| Rótulos dos status (COMPLETO, JOGANDO...)    | `STATUS_LABELS` em `src/context/LibraryContext.tsx` |

Jogos, capas, comentários, amigos e a "Minha lista" vêm da API — edite pelo backend (`/docs`).

## Como adicionar navegação entre telas

O Expo Router usa **roteamento por arquivo**: o caminho do arquivo dentro de
`src/app/` já é a URL da tela. Não existe um arquivo central de rotas.

1. **Criar uma tela nova**: crie `src/app/nome-da-tela.tsx` e registre-a em
   `src/app/_layout.tsx` dentro do `<Stack.Protected guard={!!user}>` (assim ela
   só abre com usuário logado).
2. **Navegar até ela**:
   ```tsx
   import { useRouter } from "expo-router";
   const router = useRouter();
   router.push("/nome-da-tela");     // empilha (o "voltar" retorna)
   router.replace("/nome-da-tela");  // troca a tela atual (usado na TopBar)
   ```
3. **Telas com parâmetro** (como o detalhe do jogo): nomeie o arquivo com
   colchetes, ex. `src/app/jogo/[id].tsx`, navegue com
   `router.push(\`/jogo/${id}\`)`, e leia o parâmetro dentro da tela com
   `useLocalSearchParams()`.

## Notificações push (FCM)

O app avisa sobre novo seguidor, pedido de amizade (se a preferência do perfil
estiver ligada), decisão do pedido de especialista, comentário removido pela
moderação e conta silenciada ou liberada. Os avisos dentro do app (tela
`/avisos` e o sino da barra superior) funcionam sempre. O **push** é opcional e melhor esforço:

- Só funciona em um build de desenvolvimento ou produção (APK) em aparelho real.
  **Não funciona no Expo Go**, no simulador nem na web (o app pula o registro).
- Passos: crie um projeto no Firebase, baixe o `google-services.json` e
  referencie-o em `android.googleServicesFile` no `app.json`; envie as
  credenciais FCM com `eas credentials`; gere o build com `eas build`.
- No backend, ligue o envio com a configuração `PUSH_ENABLED=true`. Desligado,
  os avisos continuam sendo criados e aparecem no app, sem push.
