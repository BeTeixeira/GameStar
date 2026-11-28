# Deploy na Oracle Cloud (Always Free)

Servidor 24/7 e gratuito para o alpha: uma VM da Oracle roda a API, o Postgres e o
Caddy (HTTPS automático) com Docker. O domínio vem do DuckDNS, também gratuito.

```
celular ──HTTPS──> seunome.duckdns.org ──> VM Oracle
                                            ├─ caddy (80/443, certificado Let's Encrypt)
                                            ├─ api   (FastAPI, só na rede interna)
                                            └─ db    (Postgres 16, só na rede interna)
```

Arquivos usados: [`deploy/oracle/`](../deploy/oracle/) (`docker-compose.yml`, `Caddyfile`,
`.env.example`, `backup.sh`).

Tempo estimado: 1 a 2 horas na primeira vez.

---

## 1. Criar a conta na Oracle

1. Acesse <https://cloud.oracle.com/free> e clique em **Start for free**.
2. Preencha os dados. O cartão é só para verificação: uma conta Free não gera cobrança.
3. **Home Region**: escolha **Brazil East (São Paulo)**. Ela não pode ser trocada depois,
   e as máquinas gratuitas só podem ser criadas nela.
4. Espere o email de conta ativa (pode levar de minutos a algumas horas).

## 2. Criar o domínio no DuckDNS

1. Entre em <https://www.duckdns.org> com Google ou GitHub.
2. Crie um subdomínio, por exemplo `gamestar-alpha` → `gamestar-alpha.duckdns.org`.
3. Deixe a aba aberta: o IP da VM entra aqui no passo 4.

## 3. Criar a VM

No painel da Oracle: **Menu → Compute → Instances → Create instance**.

| Campo | Valor |
|---|---|
| Name | `gamestar` |
| Image | **Canonical Ubuntu 24.04** (clique em *Change image*) |
| Shape | *Change shape* → **Ampere** → `VM.Standard.A1.Flex`, **2 OCPUs** e **12 GB** de memória |
| Networking | deixe criar a VCN nova, com **Assign a public IPv4 address** marcado |
| SSH keys | **Generate a key pair for me** → baixe a **chave privada** (guarde bem, sem ela não entra) |
| Boot volume | padrão (50 GB) |

Clique em **Create**. Quando ficar *Running*, copie o **Public IP address**.

> **"Out of capacity"?** É comum na Ampere gratuita. Tente outro *Availability Domain*
> (se houver), ou tente de novo mais tarde; de madrugada costuma ter vaga.

## 4. Apontar o domínio e abrir as portas

**DuckDNS:** cole o IP público da VM no campo *current ip* do seu subdomínio e clique em
**update ip**.

**Firewall da Oracle (Security List):**

1. Na página da instância: clique na **Subnet** → **Security Lists** → *Default Security List*.
2. **Add Ingress Rules**, duas regras com Source CIDR `0.0.0.0/0`, protocolo TCP:
   - Destination port `80`
   - Destination port `443`

## 5. Entrar na VM e instalar o Docker

No PowerShell do seu PC (troque o caminho da chave e o IP):

```powershell
icacls "C:\caminho\ssh-key.key" /inheritance:r /grant:r "$($env:USERNAME):R"
ssh -i "C:\caminho\ssh-key.key" ubuntu@IP_DA_VM
```

Já dentro da VM:

```bash
# Atualizações e firewall interno do Ubuntu da Oracle (ele bloqueia 80/443 por padrão)
sudo apt update && sudo apt -y upgrade
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

Entre de novo com o mesmo `ssh` (para o grupo `docker` valer).

## 6. Baixar o projeto e configurar

```bash
git clone https://github.com/BeTeixeira/GameStar.git
cd GameStar/deploy/oracle
cp .env.example .env
openssl rand -hex 32   # rode duas vezes: um valor para SECRET_KEY, outro para POSTGRES_PASSWORD
nano .env
```

No `.env`, preencha:

- `DOMAIN=gamestar-alpha.duckdns.org` (o seu subdomínio)
- `SECRET_KEY=` e `POSTGRES_PASSWORD=` com os valores gerados
- `CORS_ALLOW_ORIGINS=https://gamestar-alpha.duckdns.org`
- `GITHUB_REDIRECT_URI`, só se usar login com GitHub

Salve com `Ctrl+O`, `Enter`, `Ctrl+X`.

## 7. Subir

```bash
docker compose up -d --build     # a primeira vez leva alguns minutos
docker compose ps                # os três serviços devem ficar "running"/"healthy"
docker compose logs -f caddy     # espere "certificate obtained successfully", depois Ctrl+C
curl https://gamestar-alpha.duckdns.org/health    # {"status":"ok"}
```

As migrações do banco rodam sozinhas a cada subida da API.

## 8. Admin e catálogo de jogos

O banco começa vazio. Crie o admin dentro da VM:

```bash
docker compose exec api python scripts/create_admin.py \
  --email SEU_EMAIL --password UMA_SENHA_FORTE --username admin
```

Depois, no PowerShell do seu PC, dentro de `backend/`, cadastre os jogos na API nova:

```powershell
.\scripts\seed_games.ps1 -BaseUrl https://gamestar-alpha.duckdns.org -Email SEU_EMAIL -Password UMA_SENHA_FORTE
```

## 9. Backup diário

Na VM:

```bash
chmod +x ~/GameStar/deploy/oracle/backup.sh
mkdir -p ~/backups
crontab -e
```

Adicione a linha (backup às 4h, guarda 14 dias de banco e fotos em `~/backups`):

```
0 4 * * * /home/ubuntu/GameStar/deploy/oracle/backup.sh >> /home/ubuntu/backups/backup.log 2>&1
```

Para restaurar o banco a partir de um backup:

```bash
gunzip -c ~/backups/db-AAAA-MM-DD.sql.gz | docker compose exec -T db psql -U gamestar -d gamestar
```

## 10. Apontar o app para o servidor

1. Em `mobile/app.json`, troque `extra.apiUrl` para `https://gamestar-alpha.duckdns.org`.
2. Gere o APK novo: `eas build --profile preview --platform android`.
   (Depois disso, mudanças só de JavaScript chegam por `eas update`.)

O ngrok e o `start_remote.ps1` deixam de ser necessários.

---

## Atualizar o servidor

Depois de um merge na `main`:

```bash
cd ~/GameStar && git pull
cd deploy/oracle && docker compose up -d --build
```

## Comandos úteis

| Para | Comando (em `~/GameStar/deploy/oracle`) |
|---|---|
| Ver logs da API | `docker compose logs -f api` |
| Reiniciar tudo | `docker compose restart` |
| Parar tudo | `docker compose down` (os dados ficam nos volumes) |
| Abrir o banco | `docker compose exec db psql -U gamestar -d gamestar` |
| Uso de disco | `df -h` e `docker system df` |

## Problemas comuns

- **Certificado não sai / `curl` dá erro de SSL**: confira se o DuckDNS aponta para o IP
  certo (`ping gamestar-alpha.duckdns.org`) e se as portas 80/443 estão abertas nos dois
  lugares (Security List e `iptables`, passos 4 e 5).
- **502 Bad Gateway**: a API não subiu. Veja `docker compose logs api`.
- **App mostra "Sem conexão"**: teste `https://SEU_DOMINIO/health` no navegador do celular.
- **VM recolhida por ociosidade**: a Oracle pode recolher VMs gratuitas muito ociosas por
  7 dias. Se acontecer, a opção mais simples é converter a conta para *Pay As You Go*
  (continua grátis dentro dos limites Always Free) e criar um alerta de orçamento de US$ 1.
