# MedSest Visita — Progresso do Desenvolvimento

## Status Geral
**Última atualização:** 2026-07-15
**Sessão atual:** #11
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
- [x] Execução de visita (iniciar, setores, cargos, fotos, finalizar)
- [x] Assinaturas no local (upload canvas cliente/técnico + finalizar visita)
- [x] Dashboard (KPIs + tipo de visita)
- [x] Exportação Word + PDF do recibo do cliente (fpdf2)
- [ ] Notificações (e-mail + WhatsApp) — **estrutura pronta (4 eventos) e PDF anexado; só falta o envio real** (aguardando credenciais)
- [x] Seed script

> 🎉 **O backend está completo** (exceto o envio real das notificações, que depende de credenciais).

### Frontend
- [x] Design system + componentes base (tokens + Tailwind config)
- [x] Identidade visual: logo, símbolo vetorial, favicon e ícones do PWA
- [x] Autenticação (login, contexto, interceptor de refresh, rotas protegidas)
- [x] Layout (Sidebar com drawer, Header, rotas por role, indicador de conexão)
- [ ] Dashboard
- [ ] Gestão de chamados (gestor)
- [ ] Módulo de visita tablet + offline/IndexedDB
- [ ] Tela de conferência + assinaturas no canvas (cliente e técnico)
- [ ] Módulo de relatório (técnico interno)
- [ ] Cadastros admin
- [ ] PWA (service worker, manifest) — configurado, **ícones prontos**; faltam as telas

### Infraestrutura
- [ ] DEPLOY.md
- [x] .gitignore
- [x] docker-compose.yml (ambiente local)

---

## 🔄 Em andamento
_Sessão #11 — layout concluído. Nada em aberto ao encerrar._

---

## ⏳ Pendente
Ordem sugerida:
12. Frontend: dashboard (Recharts)
13. Frontend: gestão de chamados (gestor)
14. Frontend: módulo de visita tablet + offline/IndexedDB
15. Frontend: tela de conferência + assinaturas no canvas
16. Frontend: módulo de relatório (técnico interno)
17. Frontend: cadastros admin
18. PWA (ícones, service worker, telas)
19. DEPLOY.md

**Pendente sem sessão definida (depende de terceiros):**
- Envio real de e-mail/WhatsApp — aguardando credenciais SMTP/Twilio (o usuário avisou em 15/07 que está providenciando).

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

**Sessão #6 (2026-07-15) — Execução da visita (iniciar, setores, cargos, fotos):**
- **`services/visita.py`** — centraliza a regra de acesso aos dados da visita, reusada pelos 3 routers:
  - `get_chamado_visivel()` — leitura; mesma regra de escopo do `routers/chamados.py` (404, não 403, quando não pode ver).
  - `get_chamado_editavel()` — escrita; **só o técnico externo responsável (ou ADMIN, como válvula de escape) e só com status `EM_ANDAMENTO`**. Depois de FINALIZADO os dados estão assinados pelo cliente — alterá-los invalidaria a assinatura. Erros: `NAO_E_RESPONSAVEL` (403) e `VISITA_NAO_EDITAVEL` (409).
- **`PUT /api/chamados/{id}/iniciar`** — só o técnico externo do chamado, só a partir de `PENDENTE` (senão 409 `INICIO_INVALIDO`). Grava `dt_inicio_visita`, geolocalização e muda para `EM_ANDAMENTO`. **A geolocalização é opcional**: o técnico pode ter negado a permissão no navegador, e isso não pode impedir a visita de começar.
- **`utils/file_handler.py`** — `salvar_imagem()` e `remover_arquivo()`:
  - **Valida o conteúdo real com Pillow**, não só o `content_type` — o header vem do cliente e é falsificável. Um .txt renomeado para .jpg com `Content-Type: image/jpeg` é rejeitado (`ARQUIVO_INVALIDO`).
  - Aceita JPEG/PNG/WEBP; limite de `MAX_FILE_SIZE_MB` (413 `ARQUIVO_MUITO_GRANDE`); rejeita arquivo vazio.
  - **O nome do arquivo é gerado pelo servidor** (`uuid4` + extensão do formato detectado): o nome enviado pelo cliente nunca compõe o caminho em disco (evita path traversal e colisão). O nome original fica só no banco, em `nome_original`.
  - `remover_arquivo()` confere que o caminho resolvido está dentro de `UPLOAD_DIR` antes de apagar — protege contra caminho manipulado no banco.
- **Routers** `/api/setores`, `/api/cargos`, `/api/fotos` — CRUD completo com GET/POST/PUT/DELETE. Listagens **sem paginação de propósito**: são limitadas aos filhos de um único chamado/setor.
  - `GET /api/setores?chamado_id=` retorna os setores com **cargos e fotos aninhados** (`selectinload`) — é o que a tela de visita e o relatório consomem, evitando N chamadas.
  - `POST /api/fotos` é multipart (`setor_id`, `descricao`, `file`).
- **Arquivos órfãos:** o cascade do banco apaga cargos/fotos junto com o setor, mas os arquivos em disco não saem sozinhos — os caminhos são coletados e apagados antes do delete. No upload, se o INSERT falhar depois do arquivo gravado, o arquivo é removido.
- **Validado com smoke test:** 43/43 checagens OK — iniciar (técnico errado 404, gestor 403, duplo início 409, geoloc gravada), setores/cargos (CRUD, ordenação, aninhamento, gestor lê mas não escreve), fotos (upload JPG/PNG real, **texto disfarçado de jpg → 422**, PDF → 422, vazio → 422, acima do limite → 413), remoção apagando o arquivo do disco e cascade do setor limpando fotos do disco. Dados de teste removidos, round-robin restaurado, **zero arquivos órfãos** em `uploads/`. Script removido.

**Sessão #7 (2026-07-15) — Assinaturas + Finalizar visita (fecho do fluxo de campo):**
- **`POST /api/chamados/{id}/assinatura-cliente`** (multipart: `file`, `nome`, `cpf`) — CPF validado por dígito verificador (422 `CPF_INVALIDO`), nome não pode ser vazio (422 `NOME_OBRIGATORIO`), imagem gravada em `uploads/assinaturas/` pelo mesmo `salvar_imagem` (valida conteúdo real). O CPF é **normalizado com máscara** (`formatar_cpf`) antes de gravar, então o banco fica consistente independente de como o frontend enviar.
- **`POST /api/chamados/{id}/assinatura-tecnico`** (multipart: `file`) — só o traço; a identidade vem do usuário logado.
- **Reassinatura suportada:** traço ruim ou pessoa errada → basta postar de novo. O arquivo anterior é apagado do disco, sem deixar órfão.
- **`PUT /api/chamados/{id}/finalizar`** — o portão do fluxo. Valida, nesta ordem: ≥1 setor (`SEM_SETORES`), ≥1 cargo (`SEM_CARGOS`), assinatura do cliente (`SEM_ASSINATURA_CLIENTE`), assinatura do técnico (`SEM_ASSINATURA_TECNICO`) — todos 409. Passando, grava `dt_fim_visita`, `geoloc_assinatura_*`, `dt_liberado_tecnico_interno` (= agora, pois o aceite é no local) e status → `FINALIZADO`; dispara `notificar_visita_liberada` + `notificar_recibo_cliente`.
- Os 3 endpoints usam `get_chamado_editavel` — só o técnico externo responsável e só com `EM_ANDAMENTO`. **Depois de FINALIZADO tudo trava:** não dá para criar setor, reassinar nem refinalizar (409). É o que preserva a integridade da assinatura.
- **Geolocalização da assinatura capturada no `finalizar`** (não em cada assinatura): as duas assinaturas e o encerramento acontecem no mesmo lugar, com minutos de diferença — um ponto só já é evidência suficiente e simplifica o frontend. Opcional, como no `iniciar`.
- **`services/notificacoes.py`** ganhou `notificar_visita_liberada` (e-mail ao técnico interno) e `notificar_recibo_cliente` (cópia ao cliente, sem exigir ação). Se o cliente não tem `email_contato`, registra FALHOU dizendo isso, em vez de falhar silenciosamente.
- **⚠️ PENDÊNCIA REGISTRADA — PDF do recibo:** o cliente decidiu (sessão #4) receber o relatório assinado em PDF. **Não há biblioteca de PDF no projeto** — `python-docx` gera `.docx`, não PDF. Será preciso escolher uma (`reportlab` ou `fpdf2`; `weasyprint` exige GTK no Windows e complica o dev local) e adicionar ao `requirements.txt`. Fica para a sessão da exportação. Por ora o `notificar_recibo_cliente` monta o corpo do e-mail sem anexo — e nem envia, pois o SMTP também não está configurado.
- **Validado com smoke test:** 38/38 checagens OK — percorre o fluxo de campo inteiro (chamado → iniciar → setor → cargo → assinaturas → finalizar → liberação) e cada trava no caminho: finalizar sem setor/cargo/assinaturas, CPF inválido, nome vazio, assinatura que não é imagem, técnico de outro chamado (404), reassinatura apagando o arquivo antigo, **técnico interno recebendo 404 antes de finalizar e 200 depois** (a regra de liberação, provada), e tudo travando após FINALIZADO. Dados de teste e arquivos removidos; banco e `uploads/` de volta ao estado do seed. Scripts removidos.

**Sessão #8 (2026-07-15) — Dashboard:**
- **REFATORAÇÃO primeiro:** a regra de escopo estava duplicada (`_aplicar_escopo`/`_pode_ver` em `routers/chamados.py` **e** `pode_ver_chamado` em `services/visita.py`) — o dashboard seria o terceiro lugar. Consolidada em **`services/visita.py` como fonte única**: `aplicar_escopo_chamados()` (versão SQL) e `pode_ver_chamado()` (versão Python). `routers/chamados.py` agora importa de lá; `_get_visivel_ou_404` foi substituído por `get_chamado_visivel`, que já fazia o mesmo.
- **`GET /api/dashboard`** (`?unidade_id=&periodo_inicio=&periodo_fim=&tipo_visita=`), com 7 seções: `kpis`, `por_tipo_visita`, `conversao_novos_clientes`, `chamados_por_status`, `volume_por_mes`, `tempo_medio_por_tecnico`, `carga_tecnicos_internos`.
- **Todas as agregações em SQL** (`COUNT`/`AVG`/`date_trunc`/`extract('epoch')`) — nada de trazer chamados para somar em Python.
- **Fuso nos cortes de mês:** os timestamps são UTC, mas os meses são truncados em `America/Sao_Paulo` (`date_trunc('month', timezone('America/Sao_Paulo', col))`). Sem isso uma visita finalizada às 22h do dia 31 (01h UTC do dia 1º) cairia no mês seguinte no relatório.
- **Semântica do filtro de período (decisão importante, documentada no schema):** `periodo_inicio`/`periodo_fim` recortam as *análises* (tempos médios, distribuição, conversão) sobre `dt_abertura`. Os *indicadores operacionais* — `total_abertos`, `visitas_mes_atual`, `a_vencer_15_dias` — retratam "agora" e **ignoram o período** de propósito: são operacionais, não analíticos. O `volume_por_mes` também ignora (a janela dele é sempre os últimos 6 meses).
- **`por_tipo_visita` e `conversao_novos_clientes` ignoram o filtro `tipo_visita`** — aplicá-lo os tornaria contraditórios (a pizza viraria uma fatia de 100%; a conversão de Novos Clientes zeraria ao filtrar Renovação). Implementado com `base(..., com_tipo=False)`.
- Séries sempre completas: todos os tipos e status aparecem mesmo zerados, e os 6 meses vêm preenchidos — o gráfico não pode "perder" uma fatia/barra por falta de dado.
- `a_vencer_15_dias` usa `COALESCE(data_visita_alterada, data_proposta)` — o reagendamento do técnico é a data que vale.
- **`visitas_mes_atual` e `volume_por_mes` contam por `dt_fim_visita`** (visitas concluídas). Isso ficou mais preciso com o fluxo novo: como a finalização acontece no local logo após a visita, `dt_fim_visita` ≈ data real da visita. No fluxo antigo (aprovação por e-mail) a finalização atrasava dias e distorceria a métrica.
- **Validado com smoke test:** 46/46 checagens OK — os números foram **conferidos contra o seed conhecido**, não só quanto ao formato: total_abertos=2, duração média=2.0h, exportação=5.12 dias (5d3h), NOVO_CLIENTE=40%, conversão=50%, carga só do interno A. Também: escopo dos 4 perfis (Ana vê 3, interno A vê só 1 FINALIZADO, gestor vê 5), filtros de tipo/período, e 401 sem token. Script removido; dashboard não cria dados, nada a limpar.
- **Nota:** uma falha inicial do teste era do próprio teste (esqueci as 3h no cálculo esperado), não do código — a expectativa foi corrigida para 5.12.

**Sessão #9 (2026-07-15) — Exportação Word + PDF do recibo (backend completo):**
- **Biblioteca de PDF escolhida com o usuário: `fpdf2` 2.8.2.** Puro Python, sem dependência de sistema. Descartados: `weasyprint` (exige GTK no Windows, quebraria o ambiente local dele) e `reportlab` (mais poderoso, mas verboso demais para um documento linear).
- **⚠️ Fontes nativas do fpdf2 são Latin-1.** Português cabe inteiro (`ã ç é õ` funcionam — verificado visualmente), mas travessão `—`, aspas curvas e emoji não. Criado **`utils/formatacao.py`** com `texto_latin1()`, que troca a pontuação tipográfica por equivalentes ASCII e descarta o resto. **Todo texto que vai para o PDF passa por ele.** Se um dia quiserem tipografia fina, dá para embutir um TTF (~700KB) sem trocar de biblioteca. O `.docx` é UTF-8 e não tem essa limitação.
- `utils/formatacao.py` também tem `dt_br`/`data_br` (converte UTC → America/Sao_Paulo e formata) e `coord_br`.
- **`services/word_export.py`** — o entregável do técnico interno: cabeçalho, dados do cliente e da visita, setores com **tabela de cargos** e **fotos embutidas com legenda**, e a página de assinaturas (as duas imagens, nome/CPF do cliente, timestamps e geolocalização). Rodapé com a ressalva de que o documento reúne insumos e não constitui o PGR.
- **`services/pdf_export.py`** — o comprovante do cliente: mesma identidade visual (azul #1A3A5C), introdução, dados da visita, resumo de setores/cargos e os dois blocos de assinatura lado a lado. Sem fotos (é um comprovante, não o relatório técnico).
- **`routers/exportacao.py`**:
  - `GET /api/chamados/{id}/exportar-word` — **só TECNICO_INTERNO atribuído + ADMIN** (403 para gestor/técnico externo) e só com `FINALIZADO`. Nota: para o técnico interno o escopo já barra antes e devolve **404** (ele só enxerga FINALIZADOS); o 409 `CHAMADO_NAO_FINALIZADO` só aparece para o ADMIN. É coerente com o resto do sistema.
  - `GET /api/chamados/{id}/recibo-pdf` — regra de visibilidade normal do chamado: o **gestor precisa conseguir mostrar/reenviar o comprovante ao cliente**.
  - `Content-Disposition` com `filename*` (RFC 5987) para preservar acentos no nome do arquivo.
- **`dt_exportacao_word` gravado só no primeiro download** — o KPI mede a entrega; reexportar não é uma nova entrega. Testado.
- **`notificar_recibo_cliente` agora anexa o PDF** (fechando o TODO da sessão #7). `_enviar_email` ganhou o parâmetro `anexos`. Se a geração do PDF falhar, registra o erro e **segue com o e-mail sem anexo** — a visita já foi assinada, e um PDF quebrado não pode derrubar o "finalizar visita". Import local de `pdf_export` dentro da função para evitar ciclo entre os módulos de serviço.
- **Validado com smoke test:** 40/40 checagens OK. Não checou só HTTP — **abriu o .docx gerado e conferiu o conteúdo** (razão social, setores, cargos, descrições, legendas das fotos, nome/CPF de quem assinou, geolocalização), contou **4 imagens embutidas** (2 fotos + 2 assinaturas) e 3 tabelas, e validou o PDF (magic bytes, EOF, tamanho). Além disso o **PDF foi renderizado em imagem e inspecionado visualmente**.
- **Duas correções que só a inspeção visual pegou:** (1) os textos fixos que eu havia escrito sem acento ("Visita Tecnica", "responsavel", "nao requer nenhuma acao") — inaceitável num documento que vai ao cliente, corrigidos para português correto; (2) o teste usava assinatura branca sobre papel branco, invisível — trocada por um traço real. Também confirmei na imagem que o travessão `—` vira `-` corretamente.
- **Nota:** `pypdfium2` foi instalado só para renderizar o PDF na inspeção e **desinstalado depois** — o venv continua batendo com o `requirements.txt` (`pip check` limpo).

**Sessão #9b (2026-07-15) — Identidade visual (logo MedSest):**
- **A única arte disponível é `frontend/public/logo_medsest.png`, 300×78 px, RGBA transparente.** Não existe vetorial; o cliente confirmou que só tem esse arquivo. Se um dia aparecer o SVG/AI oficial, vale substituir.
- **Cores reais da marca, amostradas do arquivo:** verde `#006C30` (gradiente `#009848`→`#004225`) e azul royal `#2E3287`→`#164A9B`. **O azul da marca NÃO é o nosso `#1A3A5C`** — é bem mais saturado.
- **Decisões tomadas com o cliente:**
  - **Azul da interface continua `#1A3A5C`** (marinho fosco). Uma sidebar inteira no azul royal saturado cansaria a vista num tablet usado o dia todo; o prompt também pedia "sem cores vibrantes". O azul royal fica só no logo.
  - **Verde da marca entra como cor de ação/destaque** — adicionado ao Tailwind como `brand.green` / `brand.green-hover` / `brand.green-bg`, e a classe `.btn-action` em `index.css` (para o passo que conclui um fluxo, tipo "Finalizar Visita" — não para "Salvar" comum).
- **Símbolo recriado em vetor** (`public/simbolo-medsest.svg`), com aprovação do cliente. Motivo: a cruz tem só ~76px no PNG; ampliar para o ícone de 512 do PWA ou para o cabeçalho impresso ficaria borrado. **Comprovado com render lado a lado** — o PNG ampliado borra a partir de ~128px, o vetor não.
- **Como o vetor foi feito (não foi no olho):** mapa ASCII do PNG pixel a pixel + medição das bordas em resolução cheia + amostragem dos gradientes. Isso derrubou duas hipóteses erradas minhas:
  1. Achei que a barra verde era **inclinada** (acompanhando o itálico do logotipo) — era artefato da amostragem de 2 em 2 px. Ela é reta, `x 30-47` de cima a baixo.
  2. Apliquei stroke branco em cada barra; medindo a linha `y=38` vi que no original **o azul encosta direto no verde** — o contorno branco existe só no contorno externo. Refeito com uma camada branca dilatada por baixo e as barras sem stroke.
- **Fidelidade final: 90.3% de pixels coincidentes** com o original (o resto é antialiasing). Estrutura: 4 barras (azul vertical e verde horizontal atrás, azul horizontal e verde vertical na frente) — o original tem um efeito de trama em que as de trás só assomam nas bordas.
- **Ícones gerados a partir do vetor:** `favicon.ico` (16/32/48/64), `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png` (símbolo menor, na zona segura — o Android recorta em círculo/squircle), `apple-touch-icon.png` (180, para iPad) e `simbolo-medsest-512.png` (raster para o Word/PDF, que não consomem SVG). **Fundo branco nos ícones**: o símbolo foi desenhado com contorno branco para fundo claro, e o iOS não respeita transparência em ícone (viraria fundo preto).
- **BUG corrigido:** o `vite-plugin-pwa` assume `lang: 'en'` se não for informado — num app inteiramente em português. Fixado `lang: 'pt-BR'` no manifest.
- **Sobre a sidebar (azul-marinho):** o "Med" do logo é azul-marinho e sumiria no fundo escuro. Não existe versão clara do logo. Solução: usar **o símbolo (que tem contorno branco próprio) + "MedSest Visita" como texto branco em HTML**. Fica nítido e não depende de arte que não temos.
- **Ferramentas:** `@resvg/resvg-js` (Node) para rasterizar o SVG — `cairosvg` falhou no Windows por falta da DLL do cairo, o mesmo tipo de dependência de sistema que fez a gente descartar o `weasyprint`. O resvg ficou só em `%TEMP%`, fora do projeto.

**Sessão #10 (2026-07-16) — Autenticação do frontend:**
- **Arquivos:** `services/api.ts` (axios + interceptor), `services/authService.ts`, `store/AuthContext.tsx`, `hooks/useAuth.ts`, `components/ProtectedRoute.tsx`, `components/ui/{Button,Input,FormField}.tsx`, `pages/auth/LoginPage.tsx`.
- **access_token só em memória** (`api.ts`), nunca em localStorage — lá ficaria exposto a XSS. Consequência: some no F5, e a sessão é retomada pelo cookie de refresh (`restaurarSessao`). Verificado no teste: `localStorage` e `sessionStorage` ficam vazios.
- **Fila de refresh:** só existe um `/auth/refresh` em andamento por vez (promise compartilhada). Sem isso, N requisições que tomam 401 juntas disparam N refreshes, e a **rotação do backend** invalida todos menos o primeiro. **Comprovado:** 5 chamadas concorrentes com token expirado → `[200,200,200,200,200]` e **exatamente 1 refresh** na rede.
- `renovarToken()` usa `axios` puro, não a instância `api` — senão o interceptor reagiria ao 401 do próprio refresh e entraria em recursão.

**🐛 DOIS BUGS REAIS que só o teste no navegador pegou** (build e tipos passavam):
  1. **O F5 derrubava a sessão.** Causa: o **StrictMode do React monta o AuthProvider duas vezes em dev**, disparando dois `/auth/refresh` simultâneos; a rotação do backend fazia o segundo invalidar o primeiro. Corrigido com a mesma deduplicação por promise compartilhada em `restaurarSessao`. **Lição:** com rotação de refresh token, qualquer chamada duplicada é fatal — e o StrictMode duplica de propósito.
  2. **`/auth/me` não se recuperava de token expirado.** Eu excluíra `/auth/*` inteiro da retentativa (a intenção era não retentar login/refresh), mas o `/me` é rota autenticada normal. Trocado por uma lista explícita: `SEM_RETENTATIVA = ['/auth/login', '/auth/refresh', '/auth/logout']`.

- **Validado com E2E real (Playwright dirigindo Chromium): 26/26 checagens** — redirecionamento de rota protegida, validação do formulário (Zod), toggle de senha, erro de credencial vindo do `detail` da API, login, **cookie httpOnly invisível ao JS**, F5 mantendo a sessão, refresh concorrente, logout limpando o cookie, e console sem erros. **Também inspecionei as telas** (login, erro, área logada) — confirmam o símbolo nítido sobre a barra azul-marinho e o verde da marca no badge.
- **Como testar frontend aqui:** `npx playwright` num diretório temporário (`%TEMP%`), fora do projeto. Para exercitar o interceptor de dentro do navegador: `await import('/src/services/api.ts')` no `page.evaluate` — `fetch()` puro não passa pelo axios nem manda o `Authorization`, e não testa nada.
- **Erros de teste que me custaram tempo (para não repetir):** `getByText('ADMIN')` casa com "admin@..." e "Administrador" → usar `{ exact: true }`; e imprimir `r.text` de resposta binária quebra o console cp1252.

**Sessão #11 (2026-07-16) — Layout:**
- **`lib/navegacao.ts` é a fonte única da navegação:** alimenta o menu da sidebar **e** as permissões das rotas no `App.tsx`. Com duas listas, um item sumiria do menu mas a URL continuaria acessível — ou o contrário. Também tem `rotaInicial(role)` (cada perfil cai no primeiro item do menu dele) e `ROTULO_ROLE` (traduz `TECNICO_EXTERNO` → "Técnico Externo").
- **Menu por perfil:** ADMIN (Dashboard, Chamados, Relatórios, Clientes, Usuários, Unidades) · GESTOR (Dashboard, Chamados, Clientes) · TECNICO_EXTERNO (Dashboard, Minhas visitas) · TECNICO_INTERNO (Dashboard, Relatórios). Espelha o escopo do backend.
- **`Sidebar`**: fixa no desktop (`lg`), drawer com overlay abaixo disso. Fecha por Esc, clique no overlay ou ao navegar. **Usa `simbolo-medsest.svg` + texto branco**, não o logo completo — o "Med" do logo é azul-marinho e sumiria no fundo `#1A3A5C` (decisão da #9b). Mostra nome e perfil do usuário no rodapé: em campo, com tablets compartilhados, isso evita registro no nome errado.
- **`Header`**: botão de menu (só abaixo de `lg`), `OfflineIndicator`, nome do usuário e sair.
- **`hooks/useOnlineStatus`** + **`OfflineIndicator`**: verde "Online" / âmbar "Offline — dados salvos localmente". ⚠️ `navigator.onLine` só garante interface de rede ativa — um tablet num Wi-Fi sem internet aparece como online. Para o indicador basta; **a sessão #14 deve confirmar com uma chamada real antes de sincronizar**.
- **`AppLayout`** com `<Outlet />`, `key={location.pathname}` no `<main>` (a página remonta ao navegar, evitando estado vazado entre telas). `PageWrapper` padroniza título/descrição/ações.
- **`StatusBadge` e `TipoVisitaBadge`** criados com as cores do design system (o StatusBadge só tem os 4 status atuais — os de validação por e-mail não existem mais).
- `EmBreve.tsx`: placeholder das telas, com a sessão prevista de cada uma. Some conforme forem entregues.
- **Validado com E2E (Playwright): 42/42 checagens.** O mais importante: **17 checagens de rota bloqueada** — cada perfil tentou abrir pela URL tudo que o menu esconde dele, e todas caíram em `/sem-permissao`. Menu escondido não é segurança. Também: rota inicial por perfil, item ativo destacado, F5 mantendo rota+layout, drawer (abre, Esc fecha, navegar fecha), **touch targets de 44px** no tablet, e o indicador reagindo a `setOffline`.
- **⚠️ Artefato de ferramenta (não é bug):** no screenshot do Playwright com `isMobile: true`, o header `sticky` **aparece duplicado**. Verifiquei o DOM: `1 header, 1 botão Sair, top: 0`. É a captura do Chromium em emulação mobile, não o app. **Não tente "consertar"** — se aparecer de novo, cheque o DOM antes.
- **Erro de teste recorrente:** `getByText('Online')` casa 2× — o `OfflineIndicator` tem versão curta (mobile) e longa (desktop), uma escondida por CSS. Usar `.first()`.

**Decisões técnicas gerais:**
- Models usam SQLAlchemy 2.0 com `Mapped`/`mapped_column` (estilo declarativo 2.0) e tipos async.
- Enums do PostgreSQL (`role_enum`, `status_chamado`, etc.) criados via `sqlalchemy.Enum` com `name=` explícito, para bater com o schema SQL do prompt.
- UUIDs como PK usando `server_default=text("gen_random_uuid()")` (requer extensão `pgcrypto`/`pgcrypto` nativo do PG13+; `gen_random_uuid` é builtin no PG13+).
- Timestamps sempre `TIMESTAMPTZ` em UTC; conversão para America/Sao_Paulo será feita na camada de apresentação.

---

## 📋 Notas da última sessão

**Sessão #1 (2026-07-14):**
Criada toda a fundação do projeto: estrutura de pastas monorepo, arquivos raiz (.gitignore, README, docker-compose), base do backend (config, database, main) com todos os models e a migration inicial, seed.py, e a base do frontend (package.json, vite.config com PWA, tailwind com design tokens da paleta MedSest, tsconfig, types).

## 🎉 MARCO: BACKEND COMPLETO (sessão #9)

Todo o fluxo funciona de ponta a ponta:
```
gestor abre chamado (round-robin atribui o tecnico interno)
  -> tecnico externo inicia a visita (geoloc)
  -> registra setores, cargos e fotos
  -> confere com o cliente no local
  -> cliente assina (nome + CPF) e tecnico assina
  -> finaliza -> FINALIZADO
      -> tecnico interno e notificado, visualiza e exporta o .docx
      -> cliente recebe o comprovante em PDF
```
**API:** auth (JWT + refresh) · unidades · usuários · clientes · chamados · setores ·
cargos · fotos · dashboard · exportação. Tudo com escopo por perfil e erros
`{detail, code}`. Explorar em `/docs`.

**Para a próxima sessão (#12) — dashboard:**
- Consumir `GET /api/dashboard?unidade_id=&periodo_inicio=&periodo_fim=&tipo_visita=` (7 seções: `kpis`, `por_tipo_visita`, `conversao_novos_clientes`, `chamados_por_status`, `volume_por_mes`, `tempo_medio_por_tecnico`, `carga_tecnicos_internos`). Ver `backend/app/schemas/dashboard.py` para o contrato exato.
- **Usar React Query** (`@tanstack/react-query` já está no `package.json` e o `QueryClientProvider` já está no `main.tsx`) — criar `services/dashboardService.ts` + um hook.
- **Gráficos com Recharts** (já instalado): donut de status, barras empilhadas por tipo (volume mensal), barra horizontal (tempo por técnico), pizza/donut da distribuição por tipo.
- Cards de KPI + filtros (período, tipo de visita, unidade só para ADMIN).
- ⚠️ **Semântica dos filtros** (já resolvida no backend, ver #8): o período recorta as *análises*; os KPIs operacionais (abertos, visitas do mês, a vencer) ignoram o período de propósito. A pizza e a conversão ignoram o filtro de tipo. **A UI deve deixar isso claro** para o número não parecer errado.
- Substituir o `EmBreve` de `/dashboard`. Já existem: `PageWrapper`, `StatusBadge`, `TipoVisitaBadge`, `Button`.
- Cores dos gráficos: usar a paleta do design system (`primary #1A3A5C`, `secondary #2E6DA4`, `brand.green #006C30`) — o prompt pede sóbrio.
- Login de teste: `admin@medsest.com.br` / `Admin@123` (demais: `Senha@123`). Cada perfil vê números diferentes — vale testar mais de um.
- Subir os dois: `uvicorn app.main:app` + `npm run dev` (o Vite faz proxy de `/api`).

**Pendências que dependem do usuário:**
- **Credenciais de SMTP e Twilio** — ele avisou (15/07) que está providenciando. Quando chegarem: preencher o `.env` e implementar `_enviar_email`/`_enviar_whatsapp` em `services/notificacoes.py` (os TODOs estão nos lugares certos, e `_enviar_email` já aceita `anexos`). **Nenhum call site muda**; os 4 eventos passam a registrar ENVIADO em vez de FALHOU.

Banco já pronto; subir API: `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload`.
Frontend: `cd frontend && npm run dev`.
