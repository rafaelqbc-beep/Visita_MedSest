# MedSest Visita — Progresso do Desenvolvimento

## Status Geral
**Última atualização:** 2026-07-15
**Sessão atual:** #5
**Status:** Em desenvolvimento

---

## ⚠️ MUDANÇA DE ESCOPO — leia antes de usar o prompt original

**O prompt original descreve um fluxo de validação do cliente por e-mail
(token, páginas públicas, botões "Concordo"/"Fazer comentários", rodadas de
revisão). ESSE FLUXO FOI SUBSTITUÍDO em 15/07/2026, a pedido do cliente.**

**Fluxo atual — conferência e assinatura no local:**
1. O técnico externo executa a visita (setores, cargos, fotos).
2. Ao terminar, **confere os dados junto ao cliente ali mesmo** e edita o que for necessário.
3. O **cliente assina no tablet** (dedo/caneta) e informa **nome e CPF**.
4. O **técnico externo assina** também.
5. Clica em **Finalizar Visita** → status vira `FINALIZADO` e os dados ficam liberados para o **técnico interno** elaborar o PGR.
6. O cliente recebe, por e-mail, apenas uma **cópia em PDF do relatório assinado** (recibo, sem pedir nenhuma ação).

**O que deixou de existir (NÃO implementar):**
- Status `AGUARDANDO_VALIDACAO` e `AGUARDANDO_LIBERACAO`
- Tabela `validacoes_cliente`, tokens `secrets.token_urlsafe(64)`, rodadas de validação
- Endpoints públicos `/api/public/validacao/*` e o rate limiting deles
- Páginas públicas `/validacao/{token}/aprovar` e `/comentar` (`ValidacaoPage`, `AprovarPage`, `ComentarPage`)
- `validacao_service.py`, `routers/validacao_publica.py`
- Notificações: `notificar_validacao_cliente`, `notificar_comentarios_recebidos`, `notificar_reenvio_validacao`
- Endpoint `PUT /api/chamados/{id}/reenviar-validacao`
- Componente `ComentariosCliente.tsx` e o card âmbar de "cliente solicitou revisão"
- KPIs do dashboard "aguardando validação" e "aguardando liberação"

**Por que a impressão digital não foi implementada:** navegador não acessa
leitor biométrico — WebAuthn faz autenticação por biometria mas nunca entrega
a imagem da digital, e exigiria cadastro prévio. Capturar digital de verdade
exigiria leitor USB/Bluetooth + app nativo, o que quebraria a proposta de PWA.
A assinatura desenhada no canvas com o dedo cobre o caso de uso (quem não sabe
assinar faz uma marca), e nome + CPF + timestamp + geolocalização dão a
rastreabilidade que o e-mail dava antes.

---

## ✅ Concluído

### Backend
- [x] Setup inicial (FastAPI, SQLAlchemy, Alembic)
- [x] Models e migrations
- [x] Autenticação JWT (login, refresh com rotação, logout, me)
- [x] CRUD Unidades
- [x] CRUD Usuários
- [x] CRUD Clientes (com tipo_visita_padrao)
- [x] CRUD Chamados + round-robin
- [ ] Execução de visita (iniciar, setores, cargos, fotos, finalizar)
- [ ] Assinaturas no local (upload canvas cliente/técnico + finalizar visita)
- [ ] Dashboard (KPIs + tipo de visita)
- [ ] Exportação Word
- [ ] Notificações (e-mail + WhatsApp) — **estrutura pronta, envio real pendente** (ver sessão #5)
- [x] Seed script

### Frontend
- [x] Design system + componentes base (tokens + Tailwind config)
- [ ] Autenticação (login, contexto, interceptors)
- [ ] Layout (Sidebar, Header, rotas por role)
- [ ] Dashboard
- [ ] Gestão de chamados (gestor)
- [ ] Módulo de visita tablet + offline/IndexedDB
- [ ] Tela de conferência + assinaturas no canvas (cliente e técnico)
- [ ] Módulo de relatório (técnico interno)
- [ ] Cadastros admin
- [ ] PWA (service worker, manifest) — configurado no vite.config, faltam ícones/telas

### Infraestrutura
- [ ] DEPLOY.md
- [x] .gitignore
- [x] docker-compose.yml (ambiente local)

---

## 🔄 Em andamento
_Sessão #5 — CRUD de chamados + round-robin + notificações concluído. Nada em aberto ao encerrar._

---

## ⏳ Pendente
Ordem sugerida a partir daqui:
6. Backend: endpoints de execução de visita (iniciar, setores, cargos, fotos)
7. Backend: assinaturas + finalizar visita (upload das 2 assinaturas, PDF recibo ao cliente)
8. Backend: dashboard
9. Backend: exportação Word (embutir as assinaturas no documento)
10+. Frontend (auth → layout → dashboard → chamados → visita → conferência/assinaturas → relatório → cadastros → PWA)

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

**Sessão #4 (2026-07-15) — Mudança de escopo: assinatura no local:**
- Ver o bloco **⚠️ MUDANÇA DE ESCOPO** no topo deste arquivo. Momento oportuno: o fluxo de e-mail estava previsto para a sessão #7 e não tinha sido implementado — só existiam a tabela, o enum e colunas.
- **Migration `0002_assinatura_no_local`** (reversível, testada com round-trip `downgrade base` → `upgrade head`):
  - `validacoes_cliente` removida (+ índices)
  - `chamados`: removidas `dt_email_validacao_enviado`, `dt_cliente_aprovou`, `dt_cliente_comentou`, `rodadas_validacao`
  - `chamados`: adicionadas `assinatura_cliente_caminho/nome/cpf`, `dt_assinatura_cliente`, `assinatura_tecnico_caminho`, `dt_assinatura_tecnico`, `geoloc_assinatura_latitude/longitude`
  - enum `status_chamado` recriado com 4 valores. **PostgreSQL não remove valores de ENUM** — foi preciso `RENAME TO ..._old` → `CREATE TYPE` novo → `ALTER COLUMN ... USING CASE` → `DROP TYPE old`. Chamados em validação foram mapeados para `EM_ANDAMENTO` (ainda não assinados).
- **Assinaturas gravadas como arquivo** em `uploads/assinaturas/`, com o caminho no banco — mesmo padrão de `fotos_setor`. Mantém o DB leve e facilita embutir no Word depois. O seed gera PNGs placeholder reais para os caminhos não apontarem para o vazio.
- `validar_cpf` + `formatar_cpf` adicionados em `utils/validators.py` (o CPF do cliente virou dado de prova).
- **BUG corrigido:** os CNPJs do seed eram inválidos pelo dígito verificador (o seed insere via model, sem passar pelo schema Pydantic). Se alguém abrisse um cliente semeado e salvasse pela API, tomaria 422. Trocados por CNPJs válidos (mesmos prefixos, DV corrigido): unidade `12.345.678/0001-95`, clientes `11.111.111/0001-91`, `22.222.222/0001-91`, `33.333.333/0001-91`.
- Seed reestruturado para cobrir os 4 status: PENDENTE / EM_ANDAMENTO (parcial) / FINALIZADO assinado / FINALIZADO exportado / CANCELADO.
- Validado: migration nos 2 sentidos, seed limpo, API sobe e faz login (200), frontend compila.

**Sessão #5 (2026-07-15) — CRUD de Chamados + round-robin + notificações:**
- **Decisões tomadas com o usuário** (o prompt era ambíguo nos dois pontos):
  - **Cancelar:** ADMIN **+ GESTOR_COMERCIAL** (não só ADMIN). O gestor abriu o chamado; exigir um admin para cada cancelamento travaria a operação.
  - **Escopo do ADMIN:** vê **todas as unidades** (com `?unidade_id` opcional). O gestor comercial fica restrito à unidade dele.
- **`services/round_robin.py`** — `get_proximo_tecnico_interno(unidade_id, db)`. Técnicos internos ativos da unidade ordenados por `(created_at, id)` — ordem estável, para a sequência não mudar conforme os registros são atualizados. A linha de controle é lida com **`SELECT ... FOR UPDATE`**: sem o lock, dois chamados criados simultaneamente leriam o mesmo `ultimo_tecnico_interno_id` e cairiam no mesmo técnico, furando o rodízio. Se o último técnico saiu/foi desativado, a sequência recomeça do primeiro. Retorna `None` se a unidade não tem técnico interno ativo.
- **`services/notificacoes.py`** — `notificar_novo_chamado` (e-mail + WhatsApp ao técnico externo) e `notificar_reagendamento` (e-mail ao gestor). **⚠️ O envio real NÃO está implementado** (falta configurar SMTP/fastapi-mail e Twilio). Cada tentativa é registrada em `notificacoes_log` com status **`FALHOU`** e o motivo em `detalhes`. **Isso é proposital:** marcar `ENVIADO` para uma mensagem que nunca saiu tornaria o log de auditoria mentiroso. Quando as credenciais forem configuradas e o envio implementado (`_enviar_email` / `_enviar_whatsapp` têm os TODOs), as mesmas chamadas passam a registrar `ENVIADO` sem mudar os call sites.
- **`routers/chamados.py`** — endpoints:
  - `GET /api/chamados` — paginado, filtros: status, tipo_visita, cliente_id, tecnico_externo_id, tecnico_interno_id, unidade_id (só ADMIN), periodo_inicio/fim (sobre `dt_abertura`), search (nº do chamado ou razão social). Ordenado por `numero_chamado` desc.
  - `GET /api/chamados/{id}`, `POST`, `PUT`, `PUT /{id}/cancelar`, `PUT /{id}/reagendar`
- **Escopo por perfil** (`_aplicar_escopo` + `_pode_ver`): ADMIN tudo · GESTOR só a unidade dele · TÉCNICO EXTERNO só onde é o responsável · **TÉCNICO INTERNO só os atribuídos a ele E com status `FINALIZADO`** — é isso que implementa a regra "os dados só são liberados depois de assinados no local".
- Chamado inacessível retorna **404, não 403** — não revela a existência de chamados de outros.
- **Chamado travado:** com status `FINALIZADO`/`CANCELADO` o PUT só aceita trocar `tecnico_externo_id`/`tecnico_interno_id` (regra "gestor pode remanejar técnicos a qualquer momento"); qualquer outro campo → 409 `CHAMADO_TRAVADO`.
- `POST`: `tipo_visita` obrigatório; unidade herdada do cliente (fallback: unidade do usuário); gestor = usuário logado se for GESTOR, senão `gestor_comercial_id` do body ou do cliente; técnico interno via round-robin; `dt_abertura` = now; status PENDENTE; dispara `notificar_novo_chamado`.
- `reagendar`: só **TÉCNICO_EXTERNO** e só em chamado `PENDENTE` (grava `data_visita_alterada` e avisa o gestor). O gestor muda a data pelo PUT normal — quem reagenda notifica o gestor, então não faria sentido o próprio gestor usar esse endpoint.
- `ChamadoListItem` traz `cliente_razao_social`, `cliente_cidade` e os nomes dos técnicos via `selectinload`, para o frontend não precisar buscar cada relação.
- **Não implementado de propósito:** motivo do cancelamento (não existe coluna; exigiria migration — avaliar se a operação sentir falta).
- **Validado com smoke test:** 35/35 checagens OK — destaque para a **sequência circular do round-robin B → C → A → B** (o seed deixa o último em A), escopo de cada um dos 4 perfis, notificações registradas nos 2 canais, filtros, reagendamento e as travas de cancelamento. Dados de teste removidos e o round-robin restaurado para o estado do seed (último = A). Script removido.

**Decisões técnicas gerais:**
- Models usam SQLAlchemy 2.0 com `Mapped`/`mapped_column` (estilo declarativo 2.0) e tipos async.
- Enums do PostgreSQL (`role_enum`, `status_chamado`, etc.) criados via `sqlalchemy.Enum` com `name=` explícito, para bater com o schema SQL do prompt.
- UUIDs como PK usando `server_default=text("gen_random_uuid()")` (requer extensão `pgcrypto`/`pgcrypto` nativo do PG13+; `gen_random_uuid` é builtin no PG13+).
- Timestamps sempre `TIMESTAMPTZ` em UTC; conversão para America/Sao_Paulo será feita na camada de apresentação.

---

## 📋 Notas da última sessão

**Sessão #1 (2026-07-14):**
Criada toda a fundação do projeto: estrutura de pastas monorepo, arquivos raiz (.gitignore, README, docker-compose), base do backend (config, database, main) com todos os models e a migration inicial, seed.py, e a base do frontend (package.json, vite.config com PWA, tailwind com design tokens da paleta MedSest, tsconfig, types).

**Para a próxima sessão (#6):** implementar os **endpoints de execução da visita** — `PUT /api/chamados/{id}/iniciar` (captura geolocalização, grava `dt_inicio_visita`, status → `EM_ANDAMENTO`, só o técnico externo do chamado) e o CRUD de **setores** (`/api/setores`), **cargos** (`/api/cargos`) e **upload de fotos** (`/api/fotos`, validar MIME e tamanho máx. 10MB, salvar em `uploads/` com caminho no banco). Regra central: só o técnico externo responsável edita, e só enquanto o chamado está `EM_ANDAMENTO`. Reaproveitar `require_roles`, `_get_visivel_ou_404`/escopo de `routers/chamados.py`, `schemas/common.py` e `utils/file_handler.py` (ainda não existe — criar). Ler `models/setor.py`, `cargo.py`, `foto.py` e `routers/chamados.py`. A sessão #7 vem depois com as assinaturas + finalizar visita.

Banco já pronto; subir API: `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload`.
