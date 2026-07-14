# MedSest Visita — Progresso do Desenvolvimento

## Status Geral
**Última atualização:** 2026-07-14
**Sessão atual:** #2
**Status:** Em desenvolvimento

---

## ✅ Concluído

### Backend
- [x] Setup inicial (FastAPI, SQLAlchemy, Alembic)
- [x] Models e migrations
- [x] Autenticação JWT (login, refresh com rotação, logout, me)
- [ ] CRUD Unidades
- [ ] CRUD Usuários
- [ ] CRUD Clientes
- [ ] CRUD Chamados + round-robin
- [ ] Execução de visita (iniciar, setores, cargos, fotos, finalizar)
- [ ] Fluxo de validação pelo cliente (tokens, endpoints públicos)
- [ ] Dashboard (KPIs + tipo de visita)
- [ ] Exportação Word
- [ ] Notificações (e-mail + WhatsApp)
- [x] Seed script

### Frontend
- [x] Design system + componentes base (tokens + Tailwind config)
- [ ] Autenticação (login, contexto, interceptors)
- [ ] Layout (Sidebar, Header, rotas por role)
- [ ] Dashboard
- [ ] Gestão de chamados (gestor)
- [ ] Módulo de visita tablet + offline/IndexedDB
- [ ] Páginas públicas de validação (cliente)
- [ ] Módulo de relatório (técnico interno)
- [ ] Cadastros admin
- [ ] PWA (service worker, manifest) — configurado no vite.config, faltam ícones/telas

### Infraestrutura
- [ ] DEPLOY.md
- [x] .gitignore
- [x] docker-compose.yml (ambiente local)

---

## 🔄 Em andamento
_Sessão #2 — Autenticação JWT concluída. Nada em aberto ao encerrar._

---

## ⏳ Pendente
Ordem sugerida a partir daqui:
4. Backend: CRUD unidades, usuários, clientes
5. Backend: CRUD chamados com round-robin e notificações
6. Backend: endpoints de execução de visita
7. Backend: fluxo de validação pelo cliente
8. Backend: dashboard
9. Backend: exportação Word
10+. Frontend (design system → auth → layout → dashboard → chamados → visita → validação → relatório → cadastros → PWA)

---

## 🐛 Problemas conhecidos / Decisões técnicas

**Sessão #1:**
- **Python 3.12.4** instalado na máquina de dev (prompt pedia 3.11+). Compatível.
- **Banco local: PostgreSQL 17.10 nativo** instalado via winget (`PostgreSQL.PostgreSQL.17`). Serviço `postgresql-x64-17` (automático). Superusuário `postgres` / senha `postgres`. Banco `medsest_db`, usuário `medsest_user` / senha `medsest_dev_password` (mesmas credenciais do docker-compose e do `.env`). Extensão `pgcrypto` habilitada. `psql` em `C:\Program Files\PostgreSQL\17\bin\`.
- Optou-se por Postgres nativo (não Docker) para o ambiente local. O `docker-compose.yml` continua válido como alternativa.
- **Migration + seed rodados com sucesso** contra o banco real: 11 tabelas, 1 unidade, 7 usuários, 3 clientes, 5 chamados (números 1–5, um em cada estado), 5 setores, 5 cargos, 3 validações. API valida boot com `/api/health` → 200.
- **gh CLI não instalado** — push para o GitHub feito com git puro. Repo: https://github.com/rafaelqbc-beep/Visita_MedSest
- **BUG corrigido no seed:** `chamados.numero_chamado` (SERIAL) não tinha `server_default` no model SQLAlchemy → o ORM enviava `NULL` explicitamente. Adicionado `server_default=text("nextval('chamados_numero_chamado_seq')")` em `models/chamado.py`. A sequence agora preenche automaticamente.
- **Nota Windows:** console é cp1252 — evitar emojis em `print()` de scripts (seed usa `[OK]`/`[AVISO]`). O IDE mostra erros de import do sqlalchemy porque aponta para o Python do sistema; selecionar o interpretador `backend/venv` resolve.

**Sessão #2 (2026-07-14) — Autenticação JWT:**
- Estrutura: `utils/jwt.py` (access 30min + refresh 7d, ambos com `jti` único), `utils/exceptions.py` (handler do formato `{detail, code}` + validação), `schemas/auth.py` e `schemas/usuario.py`, `middleware/auth.py` (`get_current_user` via HTTPBearer + `require_roles` factory), `routers/auth.py`.
- Endpoints: `POST /api/auth/login`, `POST /api/auth/refresh` (com **rotação** do refresh token), `POST /api/auth/logout`, `GET /api/auth/me`.
- **Refresh token em cookie httpOnly** (path `/api/auth`, `secure` só em produção, `samesite=lax`), persistido na tabela `refresh_tokens` para permitir revogação no logout.
- **bcrypt fixado em 4.0.1** — o 4.1+ removeu `bcrypt.__about__` que o passlib 1.7.4 lê (gerava warning "error reading bcrypt version").
- **jti no access token:** sem ele, dois logins/refresh no mesmo segundo geravam tokens idênticos (JWT tem resolução de segundos). Resolvido.
- **Validado com smoke test** (httpx.AsyncClient em event loop único — TestClient sync quebra o pool async do asyncpg): 15/15 checagens OK (login, /me com/sem token, refresh com novo token, logout, refresh revogado pós-logout, senha errada → `INVALID_CREDENTIALS`). Script foi removido após validar.
- **Dica de teste:** para testar a app async, usar `httpx.AsyncClient` + `ASGITransport` num só `asyncio.run`, nunca o `TestClient` síncrono (event loop novo por request quebra o pool asyncpg).
- Models usam SQLAlchemy 2.0 com `Mapped`/`mapped_column` (estilo declarativo 2.0) e tipos async.
- Enums do PostgreSQL (`role_enum`, `status_chamado`, etc.) criados via `sqlalchemy.Enum` com `name=` explícito, para bater com o schema SQL do prompt.
- UUIDs como PK usando `server_default=text("gen_random_uuid()")` (requer extensão `pgcrypto`/`pgcrypto` nativo do PG13+; `gen_random_uuid` é builtin no PG13+).
- Timestamps sempre `TIMESTAMPTZ` em UTC; conversão para America/Sao_Paulo será feita na camada de apresentação.

---

## 📋 Notas da última sessão

**Sessão #1 (2026-07-14):**
Criada toda a fundação do projeto: estrutura de pastas monorepo, arquivos raiz (.gitignore, README, docker-compose), base do backend (config, database, main) com todos os models e a migration inicial, seed.py, e a base do frontend (package.json, vite.config com PWA, tailwind com design tokens da paleta MedSest, tsconfig, types).

**Para a próxima sessão (#3):** implementar os CRUDs de **unidades, usuários e clientes** (com `tipo_visita_padrao` no cliente), reaproveitando `require_roles` para autorização e o formato `{detail, code}` de erro. Ler este PROGRESS.md, os models e `routers/auth.py`/`middleware/auth.py` antes de começar. O banco local (PostgreSQL 17) já está com migration + seed aplicados; para subir a API: `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload` (docs em /docs).
