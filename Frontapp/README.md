# GameStar — app mobile (React Native / Expo)

App mobile do GameStar, feito com **Expo SDK 57** e **Expo Router** (navegação
por arquivos). Conversa com a API FastAPI da pasta `backend/`: login, cadastro,
catálogo de jogos, busca, comentários/notas, "Minha lista" e amigos vêm do backend.

## Como rodar

1. Suba a API (veja o README da raiz). Ela precisa escutar na rede, não só em
   localhost, para o celular conseguir acessar:
   ```bash
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
2. Rode o app:
   ```bash
   cd Frontapp
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
.\start_remote.ps1      # abre a API e o ngrok em duas janelas
```

Se o endereço do ngrok mudar, troque `extra.apiUrl` no `app.json` e publique
um update (veja abaixo) — não precisa de APK novo.

## Versões e atualizações

### Números de versão

| Onde | Campo | Quem muda |
|---|---|---|
| `app.json` | `version` (ex: `1.0.1`) — versão que o usuário vê | **você**, antes de cada release |
| EAS (servidor) | `versionCode` do Android — precisa subir a cada APK | **automático** (`autoIncrement` no `eas.json`) |

`version` segue `MAIOR.MENOR.CORREÇÃO`: correção → `1.0.1`; função nova →
`1.1.0`; mudança que quebra compatibilidade (ex: API nova) → `2.0.0`.

### Duas formas de levar mudanças ao celular

| Mudou... | Como entregar | Comando (em `Frontapp/`) |
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
2. Suba `version` no `app.json` (ex: `1.0.1` → `1.1.0`), comite e envie.
3. `npm run build:apk` — o link do APK aparece no terminal e em https://expo.dev
   (projeto `gamestar-app`).
4. Marque o commit e publique a Release no GitHub com o APK anexado:
   ```bash
   git tag -a app-v1.1.0 -m "GameStar 1.1.0"
   git push origin app-v1.1.0
   gh release create app-v1.1.0 gamestar-1.1.0.apk --title "GameStar 1.1.0" --notes "o que mudou"
   ```

As tags do app usam o prefixo `app-v` (o backend, se for versionado, usa
`api-v`), porque os dois ficam no mesmo repositório. As versões já lançadas
ficam em **Releases** no GitHub, cada uma com o APK para baixar.

## Estrutura de pastas

```
app/                    ← cada arquivo aqui é uma TELA (rota)
  _layout.tsx             layout raiz (tema, login obrigatório, navegação em pilha)
  login.tsx               Login / cadastro                → rota "/login"
  index.tsx               Catálogo + busca                → rota "/"
  biblioteca.tsx          Minha lista (filtros)           → rota "/biblioteca"
  amigos.tsx              Amigos, pedidos e adicionar     → rota "/amigos"
  perfil.tsx              Dados da conta + sair           → rota "/perfil"
  jogo/[id].tsx           Detalhe do jogo + comentários   → rota "/jogo/<id>"

src/
  services/api.ts         cliente HTTP da API (token, endereço, erros)
  types/index.ts          tipos do app + conversão das respostas da API
  context/
    AuthContext.tsx       login, cadastro, logout, usuário logado
    GamesContext.tsx      catálogo de jogos (GET /api/v1/games)
    LibraryContext.tsx    "Minha lista": status dos jogos (/library) + suas avaliações
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
```

## O que ainda NÃO vem do backend

| Funcionalidade                     | Situação hoje                                                  |
| ---------------------------------- | -------------------------------------------------------------- |
| Nota dos especialistas             | aparece como "Em breve" no detalhe do jogo (papel de especialista ainda não existe) |
| Sessão de login                    | só em memória — fechar o app pede login de novo                 |

## Onde editar cada coisa

| Quero mudar...                              | Arquivo                                  |
| -------------------------------------------- | ----------------------------------------- |
| Mensagens de erro da tela de amigos          | `ERROR_MESSAGES` no topo de `app/amigos.tsx` |
| Ícones (Ionicons)                            | qualquer `<Ionicons name="..." />` — trocar o `name` já troca o ícone. Lista completa: https://icons.expo.fyi |
| Cores do app (claro/escuro)                  | `src/theme/colors.ts`                     |
| Texto fixo de tela (títulos, placeholders)   | procure o comentário `// TEXTO EDITÁVEL` no arquivo da tela em `app/` |
| Filtros da tela "Minha lista"                | array `FILTERS` no topo de `app/biblioteca.tsx` |
| Rótulos dos status (COMPLETO, JOGANDO...)    | `STATUS_LABELS` em `src/context/LibraryContext.tsx` |

Jogos, capas, comentários, amigos e a "Minha lista" vêm da API — edite pelo backend (`/docs`).

## Como adicionar navegação entre telas

O Expo Router usa **roteamento por arquivo**: o caminho do arquivo dentro de
`app/` já é a URL da tela. Não existe um arquivo central de rotas.

1. **Criar uma tela nova**: crie `app/nome-da-tela.tsx` e registre-a em
   `app/_layout.tsx` dentro do `<Stack.Protected guard={!!user}>` (assim ela
   só abre com usuário logado).
2. **Navegar até ela**:
   ```tsx
   import { useRouter } from "expo-router";
   const router = useRouter();
   router.push("/nome-da-tela");     // empilha (o "voltar" retorna)
   router.replace("/nome-da-tela");  // troca a tela atual (usado na TopBar)
   ```
3. **Telas com parâmetro** (como o detalhe do jogo): nomeie o arquivo com
   colchetes, ex. `app/jogo/[id].tsx`, navegue com
   `router.push(\`/jogo/${id}\`)`, e leia o parâmetro dentro da tela com
   `useLocalSearchParams()`.
