# MedSest Visita — Progresso do Desenvolvimento

## Status Geral
**Última atualização:** 2026-07-14
**Sessão atual:** #1
**Status:** Em desenvolvimento

---

## ✅ Concluído

### Backend
- [x] Setup inicial (FastAPI, SQLAlchemy, Alembic)
- [x] Models e migrations
- [ ] Autenticação JWT
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
_Sessão #1 — Setup + Fundação Backend. Nada em aberto ao encerrar._

---

## ⏳ Pendente
Ordem sugerida a partir daqui:
3. Backend: autenticação JWT
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
- **Docker não instalado** localmente ainda — `docker-compose.yml` criado, mas para rodar o banco será preciso instalar Docker Desktop ou um PostgreSQL local.
- **gh CLI não instalado** — push para o GitHub feito com git puro.
- Models usam SQLAlchemy 2.0 com `Mapped`/`mapped_column` (estilo declarativo 2.0) e tipos async.
- Enums do PostgreSQL (`role_enum`, `status_chamado`, etc.) criados via `sqlalchemy.Enum` com `name=` explícito, para bater com o schema SQL do prompt.
- UUIDs como PK usando `server_default=text("gen_random_uuid()")` (requer extensão `pgcrypto`/`pgcrypto` nativo do PG13+; `gen_random_uuid` é builtin no PG13+).
- Timestamps sempre `TIMESTAMPTZ` em UTC; conversão para America/Sao_Paulo será feita na camada de apresentação.

---

## 📋 Notas da última sessão

**Sessão #1 (2026-07-14):**
Criada toda a fundação do projeto: estrutura de pastas monorepo, arquivos raiz (.gitignore, README, docker-compose), base do backend (config, database, main) com todos os models e a migration inicial, seed.py, e a base do frontend (package.json, vite.config com PWA, tailwind com design tokens da paleta MedSest, tsconfig, types).

**Para a próxima sessão (#2):** implementar autenticação JWT no backend (login/refresh/logout/me, middleware, hash bcrypt). Ler este PROGRESS.md e os models antes de começar. Rodar `docker-compose up -d` (ou PostgreSQL local) + `alembic upgrade head` + `python seed.py` para ter o banco pronto.
