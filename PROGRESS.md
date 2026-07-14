# MedSest Visita — Progresso do Desenvolvimento

## Status Geral
**Última atualização:** 2026-07-14
**Sessão atual:** #3
**Status:** Em desenvolvimento

---

## ✅ Concluído

### Backend
- [x] Setup inicial (FastAPI, SQLAlchemy, Alembic)
- [x] Models e migrations
- [x] Autenticação JWT (login, refresh com rotação, logout, me)
- [x] CRUD Unidades
- [x] CRUD Usuários
- [x] CRUD Clientes (com tipo_visita_padrao)
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
_Sessão #3 — CRUDs de unidades, usuários e clientes concluídos. Nada em aberto ao encerrar._

---

## ⏳ Pendente
Ordem sugerida a partir daqui:
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

**Sessão #3 (2026-07-14) — CRUDs unidades/usuários/clientes:**
- Infra reutilizável: `schemas/common.py` (`PageParams`, `Page[T]` genérico, helper `paginate()` com COUNT + LIMIT/OFFSET) e `utils/validators.py` (`validar_cnpj` com dígitos verificadores, `formatar_cnpj`).
- **Unidades** (`/api/unidades`): list (search nome/cnpj, filtro ativo, paginado) / get / post / put. CNPJ validado e único (409). Escrita só ADMIN; leitura qualquer autenticado. UF normalizada p/ maiúscula.
- **Usuários** (`/api/usuarios`): list (search, filtros role/unidade/ativo) / get / post / put. Senha hasheada no create/update (campo `senha` → `senha_hash`). E-mail único (409). Leitura ADMIN+GESTOR; escrita só ADMIN.
- **Clientes** (`/api/clientes`): list (search, filtros unidade/tipo_visita/ativo) / get / post / put. `tipo_visita_padrao` incluído. CNPJ opcional mas validado quando presente. FKs `gestor_comercial_id` (precisa ser role GESTOR) e `unidade_medsest_id` validadas → 422. Acesso ADMIN+GESTOR.
- Padrão dos routers: `_get_or_404`, `require_roles(...)` para autorização, `model_dump(exclude_unset=True)` no PUT, erros `{detail, code}` (ex.: `CNPJ_DUPLICADO`, `EMAIL_DUPLICADO`, `GESTOR_INVALIDO`).
- **Validado com smoke test** (httpx.AsyncClient): 21/21 checagens OK — validação CNPJ (422), duplicidade (409), autorização por role (403 técnico), paginação, filtros, hash de senha (novo usuário loga), troca de senha. Dados de teste foram limpos do banco após validar (seed permanece: 1 unidade / 7 usuários / 3 clientes). Script removido.
- **Detalhe:** para gerar CNPJ válido em teste, brute-force dos 2 dígitos verificadores sobre um prefixo de 12 dígitos usando o próprio `validar_cnpj`.
- Models usam SQLAlchemy 2.0 com `Mapped`/`mapped_column` (estilo declarativo 2.0) e tipos async.
- Enums do PostgreSQL (`role_enum`, `status_chamado`, etc.) criados via `sqlalchemy.Enum` com `name=` explícito, para bater com o schema SQL do prompt.
- UUIDs como PK usando `server_default=text("gen_random_uuid()")` (requer extensão `pgcrypto`/`pgcrypto` nativo do PG13+; `gen_random_uuid` é builtin no PG13+).
- Timestamps sempre `TIMESTAMPTZ` em UTC; conversão para America/Sao_Paulo será feita na camada de apresentação.

---

## 📋 Notas da última sessão

**Sessão #1 (2026-07-14):**
Criada toda a fundação do projeto: estrutura de pastas monorepo, arquivos raiz (.gitignore, README, docker-compose), base do backend (config, database, main) com todos os models e a migration inicial, seed.py, e a base do frontend (package.json, vite.config com PWA, tailwind com design tokens da paleta MedSest, tsconfig, types).

**Para a próxima sessão (#4):** implementar o **CRUD de Chamados com round-robin e notificações** — criar chamado (tipo_visita obrigatório, atribui técnico interno via round-robin `services/round_robin.py`, dispara notificação ao técnico externo), editar (regras por status/role), cancelar, listar/filtrar (por status, técnico, cliente, tipo_visita) com permissões por role. As notificações (e-mail/WhatsApp) podem começar como stubs que gravam em `notificacoes_log` e ficam prontas para plugar SMTP/Twilio depois. Reaproveitar `schemas/common.py` (paginação) e `require_roles`. Ler os models `chamado.py`, `round_robin.py`, `notificacao.py`. Banco já pronto; subir API: `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload`.
