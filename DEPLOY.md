# MedSest Visita — Guia de Deploy (VPS)

Runbook para colocar o sistema no ar num VPS Ubuntu (22.04+), com HTTPS.
Arquitetura de produção:

```
Navegador ──HTTPS──► Nginx ──┬─ /            → frontend (build estático em /var/www/medsest/frontend)
                             ├─ /api/        → uvicorn (127.0.0.1:8000, systemd)
                             └─ /uploads/    → arquivos em disco (/var/www/medsest/uploads)
                                              PostgreSQL local (127.0.0.1:5432)
```

> **HTTPS é obrigatório.** Sem ele o PWA (service worker), a geolocalização e o cookie
> de sessão (`secure`) não funcionam. O passo do certbot resolve isso.

> ⚠️ **Troque `app.medsest.com.br` pelo domínio real** em todos os passos, e aponte o
> DNS (registro A) do domínio para o IP do VPS **antes** de rodar o certbot.

---

## 1. Pacotes do sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip postgresql nginx git curl
# Node 20 (para buildar o frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# Certbot (HTTPS grátis via Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
```

## 2. Usuário e diretórios

```bash
sudo adduser --system --group --home /var/www/medsest medsest
sudo mkdir -p /var/www/medsest/{app,frontend,uploads}
sudo chown -R medsest:medsest /var/www/medsest
```

## 3. Banco de dados

```bash
sudo -u postgres psql <<'SQL'
CREATE USER medsest_user WITH PASSWORD 'TROQUE_POR_SENHA_FORTE';
CREATE DATABASE medsest_db OWNER medsest_user;
-- pgcrypto (gen_random_uuid): criada como superusuário porque a migration precisa dela
\c medsest_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL
```

## 4. Backend

```bash
# Clonar o repositório
sudo -u medsest git clone https://github.com/rafaelqbc-beep/Visita_MedSest.git /var/www/medsest/app
cd /var/www/medsest/app/backend

# venv + dependências
sudo -u medsest python3 -m venv venv
sudo -u medsest venv/bin/pip install --upgrade pip
sudo -u medsest venv/bin/pip install -r requirements.txt

# Configuração de produção
sudo -u medsest cp .env.production.example .env
sudo -u medsest nano .env     # preencher: DATABASE_URL (senha), SECRET_KEY, domínio
# Gerar a SECRET_KEY:  openssl rand -hex 32

# Migrations (cria o schema)
sudo -u medsest venv/bin/alembic upgrade head
```

**Criar o primeiro admin** (o resto — unidades, usuários, clientes — o admin cria pela
tela de cadastros, já que a #17 está pronta):

```bash
cd /var/www/medsest/app/backend
sudo -u medsest venv/bin/python -c "
import asyncio
from app.database import AsyncSessionLocal
from app.models.usuario import Usuario
from app.models.enums import RoleEnum
from app.utils.security import hash_password
async def main():
    async with AsyncSessionLocal() as db:
        db.add(Usuario(nome='Administrador MedSest', email='SEU_EMAIL@medsest.com.br',
                       senha_hash=hash_password('SUA_SENHA_FORTE'), role=RoleEnum.ADMIN))
        await db.commit()
        print('admin criado')
asyncio.run(main())
"
```

> ❌ **Não rode `python seed.py` em produção** — ele cria dados de teste (clientes e
> chamados fictícios). O seed é só para desenvolvimento.

## 5. Serviço do backend (systemd)

```bash
sudo cp /var/www/medsest/app/deploy/medsest-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now medsest-api
sudo systemctl status medsest-api          # deve estar "active (running)"
curl -s http://127.0.0.1:8000/api/health   # {"status":"ok",...}
```

## 6. Frontend (build)

```bash
cd /var/www/medsest/app/frontend
sudo -u medsest npm ci
sudo -u medsest npm run build
# Publica o build onde o nginx serve
sudo rsync -a --delete dist/ /var/www/medsest/frontend/
sudo chown -R medsest:medsest /var/www/medsest/frontend
```

> O frontend chama `/api` no mesmo domínio (o nginx faz o proxy), então **não** precisa
> configurar URL de API.

## 7. Nginx

```bash
sudo cp /var/www/medsest/app/nginx/medsest.conf /etc/nginx/sites-available/medsest
sudo nano /etc/nginx/sites-available/medsest     # trocar o server_name pelo domínio real
sudo ln -s /etc/nginx/sites-available/medsest /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 8. HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d app.medsest.com.br
# Escolha redirecionar HTTP→HTTPS. A renovação é automática (systemd timer do certbot).
sudo certbot renew --dry-run   # confirma que a renovação funcionará
```

## 9. Primeiro acesso

Abra `https://app.medsest.com.br`, entre com o admin criado no passo 4, e monte a
operação pela interface:
1. **Unidades** → criar a unidade MedSest.
2. **Usuários** → criar gestor, técnicos externos e internos.
3. **Clientes** → cadastrar as empresas atendidas.

Instale como app no tablet/celular pelo botão **"Instalar app"** (ou pelo menu do
navegador no iOS).

---

## Atualização / redeploy

```bash
cd /var/www/medsest/app
sudo -u medsest git pull

# Backend (se houver mudança de dependência ou migration)
cd backend
sudo -u medsest venv/bin/pip install -r requirements.txt
sudo -u medsest venv/bin/alembic upgrade head
sudo systemctl restart medsest-api          # ⚠️ ver o aviso abaixo

# Frontend
cd ../frontend
sudo -u medsest npm ci && sudo -u medsest npm run build
sudo rsync -a --delete dist/ /var/www/medsest/frontend/
```

> ⚠️ **SEMPRE reiniciar o `medsest-api` depois de rodar migrations.** O asyncpg guarda o
> plano das queries por conexão; trocar o schema com o serviço no ar faz a **primeira
> request de cada conexão do pool** falhar com `InvalidCachedStatementError` (HTTP 500).
> Reiniciar recria o pool. (Vale a mesma lição do dev — ver CLAUDE.md/PROGRESS.)

---

## Backup

```bash
# Banco (diário via cron recomendado)
pg_dump -U medsest_user -h 127.0.0.1 medsest_db | gzip > /var/backups/medsest-$(date +%F).sql.gz
# Uploads (fotos + assinaturas)
tar czf /var/backups/medsest-uploads-$(date +%F).tar.gz -C /var/www/medsest uploads
```

Os **uploads ficam fora do diretório do código** (`/var/www/medsest/uploads`) de
propósito: o redeploy do frontend/backend não os toca.

---

## Segurança — checklist

- [ ] `ENVIRONMENT=production` no `.env` (liga o cookie `secure`).
- [ ] `SECRET_KEY` única e forte (`openssl rand -hex 32`), nunca a do exemplo.
- [ ] Senha forte no PostgreSQL; banco só escuta em `127.0.0.1` (padrão).
- [ ] Firewall: liberar só 80/443/22 (`sudo ufw allow 'Nginx Full' && sudo ufw allow OpenSSH && sudo ufw enable`).
- [ ] Trocar a senha do admin após o primeiro acesso, se usou uma provisória.
- [ ] Renovação do certbot testada (`--dry-run`).

## E-mail (quando as credenciais chegarem)

Preencher `SMTP_HOST/PORT/USER/PASSWORD/FROM_NAME` no `.env` e reiniciar o
`medsest-api`. Enquanto vazio, as notificações são registradas como FALHOU sem
quebrar nada (ver `services/notificacoes.py`). WhatsApp foi descartado por ora.

## Troubleshooting

| Sintoma | Onde olhar |
|---|---|
| API não sobe | `journalctl -u medsest-api -f` (erro de `.env`/DB) |
| 502 no navegador | uvicorn caiu ou porta errada — `systemctl status medsest-api` |
| 1ª request 500 após deploy | migration sem restart — `systemctl restart medsest-api` |
| Login não mantém sessão | `ENVIRONMENT=production` faltando (cookie não vira `secure`) |
| PWA não instala / sem geoloc | HTTPS não ativo — revisar certbot/nginx |
| Foto não sobe | `client_max_body_size` no nginx e `UPLOAD_DIR` gravável pelo user `medsest` |
