# Design: Integração das telas novas (especialista, admin, moderação, perfil e avisos)

Data: 2026-10-27

## Contexto

A branch `feat/telas-especialista-admin` (commit `3d1b6b7`) trouxe para o app mobile um tema
único ("Ultravioleta"), uma barra de abas embaixo (`BottomTabs`) e várias telas novas para o
especialista e para o admin. Parte dessas telas é só layout ("casca"), com dados fixos em
`src/data/adminPreview.ts` e um aviso `PreviewBanner`: Pedidos, Moderação, Pedir especialista,
Nova análise, Seguidores (aba "Seguidores") e Avisos. O backend não mudou nessa branch.

Este trabalho liga essas telas ao servidor, cria o que falta no backend e acrescenta duas
coisas pedidas agora: uma **conta de moderador** e uma **tela de perfil de qualquer usuário**.

O trabalho é feito numa branch nova criada a partir de `feat/telas-especialista-admin`
(nome sugerido: `feat/integracao-telas`).

## Intenção (o porquê)

- O app deve funcionar de ponta a ponta com o design novo. Nenhuma tela pode ficar com dados de exemplo.
- **O especialista é uma conta estritamente profissional.** Usuários podem segui-lo, mas ele
  não interage com usuários normais: não tem amigos, não segue de volta e não responde.
- **A moderação fica com os moderadores, no dia a dia.** O admin aparece só em casos extremos.
  O moderador circula pelo app procurando comentários ruins e também tem um log de denúncias
  para buscar e agir.

## Objetivos

1. Endpoint de seguidores do especialista e aba "Seguidores" ligada a ele.
2. Novo tipo de conta: **moderador**. Funciona como um usuário normal e, além disso, pode apagar
   comentários e banir ou silenciar usuários.
3. Denúncias de comentários feitas por usuários. Elas geram um log visível só para moderadores e admins.
4. Tela de perfil do usuário, aberta ao tocar no nome de alguém: nome, foto, bio e comentários,
   cada um na seção do seu jogo.
5. Nova análise completa para especialistas: título, prós, contras e "fixar no perfil".
6. Pedidos para virar especialista: o usuário pede e o admin aprova ou recusa.
7. Notificações com `expo-notifications`: lista "Avisos" no app e push no celular.
8. Números reais na Visão geral do admin.
9. Corrigir os problemas encontrados na revisão da branch (ver "Correções da revisão").

## Não-objetivos

- Respostas a comentários, curtidas ou qualquer conversa entre usuários.
- Moderar outras coisas além dos comentários (por exemplo nomes, fotos ou bios).
- Silenciar por tempo (o silêncio é ligado e desligado à mão).
- Painel web e e-mails.
- Configurar o Firebase/FCM. Isso é feito por quem administra o projeto Expo, e o documento só lista os passos.

## Anti-objetivos (o que tornaria isto um fracasso mesmo funcionando)

- Um especialista conseguir fazer amizade ou interagir com usuários normais por algum caminho da API.
- Um usuário comum (ou o próprio autor denunciado) enxergar o log de denúncias.
- Um moderador conseguir agir contra admins ou outros moderadores.
- Telas que fogem do design da branch nova (tema Ultravioleta, `BottomTabs`, `TopBar`/`BackBar`,
  `StatTile`, `Tag`, `FilterPills`, cards com `colors.card`/`cardBorder`).
- A tela de perfil público expor o e-mail das pessoas (hoje `GET /users/{id}` devolve e-mail para qualquer um).

## Restrições

- **Backend:** segue a organização em camadas da `main`. Cada recurso tem model em
  `domain/models`, schema em `domain/schemas`, interface em `domain/interfaces`, repositório em
  `infrastructure/repositories`, service em `services`, endpoint em `api/v1/endpoints` e a dependência
  em `api/dependencies.py`. Os erros saem do service como `NotFoundError`, `ForbiddenError`,
  `BadRequestError` ou `ConflictError` e viram resposta HTTP pelos handlers globais.
  As migrações são feitas com Alembic. Os testes de integração ficam em `tests/integration/` e usam
  SQLite em memória, como os que já existem.
- **Bancos:** precisa funcionar em SQLite (demonstração e testes) e em Azure SQL (`mssql+aioodbc`).
  Os enums usam `native_enum=False`, como os atuais.
- **Mobile:** segue a organização da `main`:
  - cada arquivo em `src/app/` é uma tela;
  - as peças reutilizáveis ficam em `src/components/`, e as das abas do admin em `src/components/admin/`;
  - os tipos da API e as conversões ficam em `src/types/index.ts`;
  - o estado global fica em `src/context/`;
  - todas as cores vêm de `src/theme/colors.ts`;
  - os comentários "TEXTO EDITÁVEL / CAMINHO" seguem o estilo atual;
  - os textos visíveis são em português, e os nomes no código seguem o que já existe.
  
  O visual segue a branch nova.
- **Push não funciona no Expo Go** (Android, SDK 53+). Lá o app precisa funcionar normalmente
  sem push, com a lista de Avisos ainda funcionando.

## Decisões

### 1. Especialista: seguidores e "sem interação"

- `GET /api/v1/users/me/followers`: lista quem segue a conta logada, do mais recente para o mais
  antigo. Só especialistas podem chamar; outras contas recebem 403.
- Aba Seguidores do especialista:
  - a sub-aba "SEGUIDORES" mostra a lista real, com foto e nome, e tem busca;
  - a sub-aba "SEGUINDO" continua como está;
  - a lista de seguidores é **só leitura**: tocar num seguidor não faz nada. O especialista não interage
    com usuários normais.
- No backend, pedidos de amizade de ou para especialistas passam a ser recusados (400). Amizades
  antigas de quem virar especialista não são apagadas, apenas ficam escondidas, porque a aba Amigos
  não existe para especialistas. *(Decisão minha.)*

### 2. Conta de moderador

- `UserRole` ganha `moderator`, e os papéis ficam `user`, `moderator` e `admin`. O moderador continua
  com `account_type = normal`. Uma conta especialista não pode ser moderadora *(decisão minha)*.
- **Quem cria moderadores:** o admin, pela tela `admin/conta/[id]`, com as ações "Tornar moderador" e
  "Remover moderador". Endpoint: `PUT /api/v1/users/{id}/role` com `{ "role": "user" | "moderator" }`,
  só para admin. Não é possível tornar alguém admin pela API.
- **Poderes do moderador** (o admin tem todos também):
  - apagar o comentário de qualquer pessoa;
  - **banir**: desativa a conta (`is_active = false`, o mesmo efeito do "desativar" do admin) e desfaz
    o banimento. **Quem baniu fica registrado** num novo campo, `users.deactivated_by_role`
    (`moderator` ou `admin`, vazio se a conta está ativa). O "desativar" do admin grava `admin`.
    **O moderador só desfaz banimentos feitos por moderadores**; tentar reativar uma conta desativada
    pelo admin dá 403. O admin desfaz qualquer um. Nas estatísticas e no filtro de Contas, banidas e
    desativadas aparecem num só grupo, "Banidas/Desativadas", com a indicação de quem baniu (opção A, escolhida no
    brainstorming);
  - **silenciar**: a pessoa continua usando o app, mas não pode criar nem editar comentários (403 com
    mensagem clara). Novo campo `users.is_muted`. Também é possível tirar o silêncio.
  - O moderador **não age** sobre admins nem sobre outros moderadores (403).
- **No app**, o moderador vê as abas de usuário normal mais uma quinta aba, "Moderação" (`/moderacao`).
  A home dele continua sendo o catálogo. Na tela do jogo, ele vê a lixeira em todos os comentários.
  Na tela de perfil, vê as ações de moderação (ver item 4).
- O admin continua com sua aba "Moderação" (`/admin/moderacao`), com o mesmo conteúdo.

### 3. Denúncias e log de moderação

- **Na tela do jogo**, cada comentário que não é seu tem um ícone de bandeira "Denunciar". Ele abre a
  escolha do motivo: Ofensivo, Spam, Spoiler ou Outro. Repetir a denúncia do mesmo comentário não dá
  erro e não conta duas vezes. Ao enviar, aparece a mensagem "Denúncia enviada".
- **Tabela `review_reports`**, que é o log:
  - `id`, `reporter_id`, `reason`, `created_at`;
  - `review_id`: guarda o id do comentário **sem chave estrangeira**. Ele continua servindo para agrupar
    as denúncias mesmo depois que o comentário some;
  - uma cópia do comentário no momento da denúncia: `review_body`, `review_rating`, `review_author_id` e `game_id`;
  - **o log sobrevive a tudo**: `reporter_id`, `review_author_id`, `game_id` e `resolved_by_id` usam
    `ON DELETE SET NULL`. Junto com a cópia do comentário, o registro guarda os nomes do autor e do jogo
    no momento da denúncia, para o log continuar legível *(decisão minha)*;
  - **se o comentário sumir sem ação do moderador** (o autor apagou, ou a conta ou o jogo foi excluído),
    as denúncias **continuam pendentes**. O card mostra "comentário apagado pelo autor" e mantém o texto
    copiado, para o moderador ainda poder silenciar ou banir o autor. Assim ninguém apaga a prova antes
    de alguém ver *(decisão minha)*;
  - **se o autor editar o comentário**, o card mostra o texto copiado na denúncia. Quando o comentário
    ainda existe, mostra também o texto atual;
  - `status`: `pending`, `kept` (mantido) ou `removed` (apagado);
  - `resolved_by_id` e `resolved_at`.
  - Restrição de unicidade em (`review_id`, `reporter_id`).
- **Endpoints**, só para moderador e admin, com o prefixo `/api/v1/moderation`:
  - `GET /reports?status=pending|kept|removed&q=` lista as denúncias **agrupadas por comentário**. Cada grupo
    traz o autor, o jogo, o texto, a quantidade de denunciantes, os motivos e a data mais recente. O `q`
    busca pelo nome do autor ou do jogo.
  - `POST /reviews/{review_id}/keep` marca todas as denúncias pendentes daquele comentário como `kept`.
  - `DELETE /reviews/{review_id}` apaga o comentário, marca as denúncias pendentes como `removed` e avisa
    o autor (ver item 7). Também funciona para um comentário sem denúncia.
  - `GET /reviews/recent?q=` traz os comentários mais recentes do app, para o moderador circular por eles.
  - `POST /users/{id}/ban`, `POST /users/{id}/unban`, `POST /users/{id}/mute` e `POST /users/{id}/unmute`.
- **Tela Moderação** (o design da branch `admin/moderacao.tsx`, agora com dados reais):
  - abas "DENÚNCIAS · n" (pendentes), "RECENTES" e "HISTÓRICO" (mantidas e apagadas), além da busca;
  - cada card mostra autor · jogo, os selos de motivo, o texto, "Denunciado por N usuário(s) · quando" e
    os botões **Manter**, **Apagar** e **Silenciar autor** (ou **Banir autor**);
  - tocar no nome do autor abre a tela de perfil dele.
  
  O conteúdo vira um componente compartilhado (`src/components/moderation/`), usado por `/moderacao` e
  por `/admin/moderacao`.
- O antigo `DELETE /reviews/{id}` passa a aceitar moderador, além do autor e do admin. Quando quem apaga é
  um moderador ou o admin, o efeito é o mesmo de `DELETE /moderation/reviews/{id}`: as denúncias viram
  `removed` e o autor recebe o aviso *(decisão minha)*.

### 4. Tela de perfil do usuário

- Ao tocar no nome de alguém, abre a tela de perfil dele. A rota é a da branch: `/perfil-publico/[id]`.
  O toque funciona em todos estes lugares:
  - nos comentários da tela do jogo (qualquer autor, não só especialistas);
  - na lista de amigos e nos pedidos de amizade;
  - na aba "Seguindo";
  - nos cards da Moderação.
  
  Exceção: a lista de seguidores do especialista, que é só leitura (item 1).
- **Conteúdo**, como pedido: nome, foto de perfil, bio e os comentários **separados por seção de cada
  jogo**. Cada seção mostra a capa e o título do jogo e embaixo o comentário (nota, texto e data). Tocar no
  título do jogo abre a página do jogo.
- **Quando o perfil é de um especialista**, também aparecem os elementos da vitrine que a branch já
  desenhou: o selo da área, o botão Seguir, os números (seguidores, análises e média) e a análise fixada
  primeiro, com título, prós e contras. *(Decisão minha: manter a vitrine do especialista que já existe.)*
- **Quando quem está vendo é moderador ou admin**, aparece também:
  - um bloco "Moderação" com o estado da conta (ativa ou banida, silenciada ou não);
  - os botões Silenciar/Tirar silêncio e Banir/Desbanir;
  - uma lixeira em cada comentário.
  
  O moderador não vê esse bloco no perfil de admins e de moderadores.
- **Backend:**
  - `GET /api/v1/users/{id}/profile` (com login) devolve um perfil público **sem e-mail**:
    `id`, `username`, `display_name`, `avatar_url`, `bio`, `account_type`, `expertise_area`, `company`,
    `followers_count`, `role`;
  - para moderador e admin, devolve também `is_active` e `is_muted`;
  - o antigo `GET /users/{id}`, que hoje é aberto e devolve o e-mail, passa a exigir login e responde só
    ao admin ou à própria conta. A tela de perfil passa a usar `/profile`. As telas do admin
    (`admin/conta/[id]` e `ExpertsAdmin`) continuam usando a rota antiga, e os testes são ajustados
    *(decisão minha)*;
  - os comentários continuam vindo de `GET /reviews/user/{id}`. A `ReviewResponse` passa a trazer
    `game_title` e `game_cover_url`, para a tela montar as seções sem depender do catálogo carregado.
- **Perfil privado:** os comentários já são públicos na página do jogo, então o perfil mostra os
  comentários mesmo de perfis privados. *(Decisão minha.)*

### 5. Nova análise (especialista)

- A `reviews` ganha `title` (até 120 caracteres), `pros` (até 500), `cons` (até 500) e `pinned` (booleano),
  todos opcionais.
- Só especialistas podem preencher título, prós, contras e fixar. Se uma conta comum enviar esses campos,
  recebe 400.
- Cada especialista tem **no máximo uma** análise fixada: fixar uma nova solta a anterior.
- A tela `especialista/nova-analise` (design da branch) é ligada a `POST /reviews`.
  - Com `?jogoId=` de um jogo que o especialista já analisou, a tela abre em modo edição (`PATCH /reviews/{id}`)
    e mostra o botão "Excluir análise".
  - Na tela do jogo, o botão de comentar do especialista leva a essa tela, em vez do formulário curto.
  - O `PreviewBanner` sai da tela.
- A análise completa (título, prós e contras) aparece na página do jogo dentro do comentário do especialista
  e na tela de perfil dele.

### 6. Pedidos para virar especialista

*(Não foi pedido explicitamente, mas as telas já existem na branch. Decisão minha: ligá-las.)*

- **Tabela `expert_requests`:**
  - `id`, `user_id`, `expertise_area`, `company`, `link` e `message`;
  - `status`: `pending`, `approved` ou `rejected`;
  - `rejection_reason`, `decided_by_id`, `created_at` e `decided_at`.
- **Regras:**
  - uma conta normal tem no máximo **um** pedido pendente por vez (409 se tentar outro);
  - moderadores e admins não pedem;
  - especialistas não pedem.
- **Endpoints:**
  - `POST /api/v1/expert-requests` cria o pedido;
  - `GET /api/v1/expert-requests/me` mostra o último pedido da conta, para a tela exibir "Pedido em análise"
    ou "Recusado: motivo";
  - para o admin: `GET /api/v1/expert-requests?status=` e `GET /api/v1/expert-requests/{id}`;
  - para o admin: `POST /{id}/approve` torna a conta especialista com a área e a empresa do pedido;
  - para o admin: `POST /{id}/reject` exige o motivo.
- **Telas:**
  - `pedir-especialista` é ligada a esses endpoints e mostra o estado do último pedido;
  - `admin/pedidos` e `admin/pedido/[id]` passam a usar dados reais. O link enviado vira um botão que
    abre o navegador.

### 7. Notificações (`expo-notifications`)

- **Backend:**
  - **tabela `notifications`:** `id`, `user_id`, `type`, `title`, `body`, `data` (JSON com a rota do app a
    abrir), `read_at` e `created_at`;
  - **tabela `push_tokens`:** `token` (único), `user_id`, `platform` e `created_at`;
  - **endpoints** (com login, prefixo `/api/v1/notifications`):
    - `GET` lista as notificações, as mais novas primeiro;
    - `GET /unread-count` devolve o total não lido;
    - `POST /{id}/read` e `POST /read-all` marcam como lidas;
    - `PUT /push-token` registra o token do aparelho;
    - `DELETE /push-token` remove o token, no logout.
  - **Envio do push:** um `NotificationService` grava a notificação e, se o usuário tiver tokens, envia
    para a API de push da Expo (`https://exp.host/--/api/v2/push/send`) com `httpx`.
    - Uma falha no envio só gera log e **nunca** quebra a ação que causou a notificação.
    - Tokens que a Expo marcar como `DeviceNotRegistered` são apagados.
    - Uma configuração `PUSH_ENABLED` (padrão `true`, desligada nos testes) controla o envio.
- **Eventos que geram aviso:**

  | Evento | Quem recebe | Abre |
  |---|---|---|
  | Novo seguidor | especialista | `/especialista/seguidores` |
  | Pedido de especialista aprovado ou recusado (com motivo) | quem pediu | `/perfil` |
  | Comentário apagado pela moderação | autor | `/jogo/{id}` |
  | Conta silenciada ou com silêncio retirado | a pessoa | `/avisos` |
  | Novo pedido de amizade (respeita `notify_friend_requests`) | quem recebe | `/amigos` |

  Denúncias novas **não** geram push. Elas aparecem como contador na aba Moderação *(decisão minha, para
  não lotar o celular dos moderadores)*.
- **App:**
  - instalar `expo-notifications` (e `expo-device`, para saber se é um aparelho de verdade) com
    `npx expo install` e incluir o plugin no `app.json`;
  - um `NotificationsContext` em `src/context/`:
    - depois do login, pede permissão, pega o token Expo usando o `projectId` do `app.json` e envia ao backend;
    - no logout, remove o token;
    - mantém o contador de não lidas;
    - tocar num push abre a rota que está em `data`.
  - No Expo Go, no emulador ou no navegador, a parte de push é pulada sem erro.
  - **Tela Avisos:**
    - passa a ser comum a todas as contas: `/avisos`, substituindo `especialista/avisos`;
    - mostra a lista, com as não lidas destacadas, e tocar num aviso abre a rota dele;
    - o sino na `TopBar` aparece para todas as contas, com o contador.
- **Para o push funcionar no APK** (feito por quem administra o projeto Expo, documentado no README do mobile):
  1. criar um projeto no Firebase;
  2. baixar o `google-services.json` e apontá-lo no `app.json`;
  3. enviar a chave de conta de serviço FCM com `eas credentials`;
  4. gerar um APK novo.

### 8. Visão geral do admin

- `GET /api/v1/admin/stats` (só admin) devolve:
  - contas: total, especialistas, moderadores, banidas/desativadas e silenciadas;
  - jogos e comentários;
  - pedidos pendentes e denúncias pendentes;
  - "atividade recente": os 5 eventos mais novos, juntando pedidos e denúncias, cada um com tipo, título,
    data e rota.
- A tela `admin/index` usa esse endpoint: alertas com os números reais, `StatTile`s reais e atividade
  real. O `PreviewBanner` sai.
- O painel do especialista ganha o número real de "Comentários recebidos". Como não existem respostas
  (não-objetivo), o cartão vira "Notas no catálogo", com o total de análises publicadas *(decisão minha)*.
  Os demais números já são reais.

### 9. Correções da revisão

- `admin/index` pedia `GET /users?limit=200`, acima do limite de 100, e recebia erro 422. A chamada é
  trocada pelo `/admin/stats`.
- O filtro de Contas roda no app, sobre os primeiros 100 resultados. Ele passa a ser um parâmetro do
  backend: `GET /users?type=normais|especialistas|moderadores|banidas|admins`.
- O tipo `ApiUser` do app ganha `avatar_url`, `bio`, `company`, `is_muted` e `role` com moderador.
  Seguidores, Contas e Perfil passam a mostrar as fotos.
- As cores verdes fixas (`#2F9E6E` e `#4CC38A`) são substituídas por uma nova chave `success` em `colors.ts`.
- Saem `src/data/adminPreview.ts`, a pasta `src/data/` e o `PreviewBanner`, depois que nenhuma tela usar mais.
- O `mobile/README.md` ganha a estrutura de pastas e as telas novas, e o README da raiz ganha os endpoints
  novos, se ele os listar.
- O `login.tsx` continua sem `<Screen>`, porque o fundo ocupa a tela inteira, como a branch decidiu.

## Organização do código (novo)

Backend (cada item segue as camadas citadas nas Restrições):
- `review_report`: model, schema, interface, repositório e `ModerationService`, com o endpoint `moderation.py`.
- `expert_request`: model, schema, interface, repositório e `ExpertRequestService`, com o endpoint `expert_requests.py`.
- `notification` e `push_token`: models, schemas, interfaces, repositórios e `NotificationService`, com o
  endpoint `notifications.py`. O cliente HTTP da Expo fica em `infrastructure/push.py`.
- `admin.py` (stats) no endpoint, usando um `AdminService` ou repositórios já existentes.
- Uma migração Alembic por bloco (moderação, perfis de review, pedidos e notificações), ou uma só, a
  critério de quem construir.

Mobile:
- **Telas:**
  - `app/moderacao.tsx` (moderador);
  - `app/avisos.tsx` (todas as contas);
  - `app/especialista/avisos.tsx` sai, e o `_layout.tsx` é atualizado com a proteção da rota `moderacao`.
- **Componentes:**
  - `components/moderation/` (fila de denúncias, recentes e card de comentário moderável);
  - `components/ReportModal.tsx` (escolha do motivo);
  - componentes do perfil, se a tela crescer.
- **Contexto:** `context/NotificationsContext.tsx`.
- **`AuthContext`:** ganha `isModerator` (verdadeiro para moderador) e `canModerate` (moderador ou admin).
- **`BottomTabs`:** ganha as abas do moderador (as do usuário mais "Moderação", com o contador de denúncias pendentes).

## Verificação

- **Backend:** testes de integração novos, um arquivo por recurso:
  - `test_moderation.py`, `test_expert_requests.py`, `test_notifications.py` e `test_profile_public.py`;
  - também ampliar `test_experts.py` e `test_friends.py`.

  Os testes cobrem as regras: permissões (usuário, moderador e admin), o moderador sem poder sobre
  admin e moderador, o silenciado que não comenta, o log que sobrevive à exclusão do comentário, um
  pedido pendente por vez, o especialista sem amizade e o push desligado nos testes. Toda a suíte
  (`pytest`) precisa passar.
- **Migração:** `alembic upgrade head` num SQLite novo e no `gamestar.db` existente, sem perder dados.
- **Mobile:** `npx tsc --noEmit` sem erros.
- **Ponta a ponta:** subir a API e o app (web ou Expo Go) e percorrer os fluxos:
  - usuário denuncia → moderador vê → apaga → autor recebe o aviso;
  - usuário pede para ser especialista → admin aprova → conta vira especialista;
  - usuário segue especialista → especialista vê o seguidor e recebe o aviso;
  - toque em nomes abre o perfil;
  - especialista publica uma análise completa e fixada.
  
  O push real só é verificado num APK com o FCM configurado. Fora disso, ele é registrado como não verificado.

## Deixado para quem construir

- Nomes exatos de classes, arquivos e mensagens de erro, seguindo os padrões existentes.
- Paginação das listas novas (padrão `skip`/`limit` com máximo de 100, como as atuais).
- Uma ou várias migrações.
- Detalhes visuais menores dentro do design da branch (espaçamentos, ícones Ionicons).
