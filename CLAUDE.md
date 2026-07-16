# MedSest Visita — instruções para o Claude Code

## ⚠️ ANTES DE ESCREVER QUALQUER CÓDIGO

**1. Leia o [PROGRESS.md](PROGRESS.md) primeiro.** Ele é o diário de bordo do
projeto: diz o que já foi feito, o que está pendente, as decisões técnicas
tomadas e os bugs conhecidos. Nenhuma sessão começa sem essa leitura.

**2. O prompt original do projeto está DESATUALIZADO.** Ele descreve um fluxo de
validação do cliente por e-mail (token, páginas públicas `/validacao/{token}`,
botões "Concordo"/"Fazer comentários", rodadas de revisão). **Esse fluxo foi
removido em 15/07/2026.** Se receber o prompt original colado, NÃO o siga nesse
ponto — o PROGRESS.md manda. Ver o bloco "⚠️ MUDANÇA DE ESCOPO" no topo dele.

**3. Confirme com o usuário o escopo da sessão antes de começar a codar.**

---

## Fluxo atual da visita (vale este, não o do prompt original)

```
PENDENTE → EM_ANDAMENTO → FINALIZADO → (técnico interno exporta Word)
                                        CANCELADO (ADMIN, a partir de qualquer status)
```

A conferência dos dados e as **assinaturas acontecem no local**, ao fim da visita:
o técnico revisa junto ao cliente, edita o que for preciso, o cliente assina no
tablet (canvas, com nome e CPF) e o técnico assina. Só então vira `FINALIZADO`
e libera para o técnico interno. O cliente recebe apenas uma cópia em PDF por
e-mail (recibo, sem exigir ação).

**Não implementar:** tokens de validação, endpoints `/api/public/validacao/*`,
páginas públicas de aprovação/comentário, rodadas de validação, status
`AGUARDANDO_VALIDACAO`/`AGUARDANDO_LIBERACAO`, tabela `validacoes_cliente`.

**Impressão digital não é viável:** navegador não acessa leitor biométrico.
A assinatura no canvas com o dedo cobre o caso de uso.

---

## Ambiente de desenvolvimento

**Banco:** PostgreSQL 17 **nativo no Windows** (não Docker), serviço
`postgresql-x64-17`, já com migrations e seed aplicados.
- `psql`: `C:\Program Files\PostgreSQL\17\bin\psql.exe`
- Banco `medsest_db` / usuário `medsest_user` / senha `medsest_dev_password`
- Superusuário: `postgres` / `postgres`

**Backend:**
```bash
cd backend
venv\Scripts\activate          # o venv fica em backend/venv
uvicorn app.main:app --reload  # docs em http://localhost:8000/docs
```

**Frontend:**
```bash
cd frontend
npm run dev                    # http://localhost:5173
```

**Login de teste:** `admin@medsest.com.br` / `Admin@123`
(demais usuários do seed: senha `Senha@123`)

---

## Convenções do projeto

- **Erros da API:** sempre `{"detail": "mensagem", "code": "ERROR_CODE"}` via
  `AppException` (`app/utils/exceptions.py`).
- **Autorização:** `require_roles(RoleEnum.X, ...)` de `app/middleware/auth.py`.
- **Paginação:** `PageParams` + `Page[T]` + `paginate()` de `app/schemas/common.py`.
- **Timestamps:** UTC no banco (`TIMESTAMPTZ`); exibir em `America/Sao_Paulo`.
- **Frontend:** TypeScript sem `any` explícito.
- **Uploads:** arquivo em disco (`uploads/`), caminho relativo no banco.

## Armadilhas conhecidas (já custaram tempo)

- **Testar app async:** usar `httpx.AsyncClient` + `ASGITransport` dentro de um
  único `asyncio.run`. O `TestClient` síncrono cria um event loop por request e
  quebra o pool do asyncpg.
- **Console do Windows é cp1252:** nada de emoji em `print()` de scripts.
- **PostgreSQL não remove valores de ENUM:** para alterar, renomear o tipo,
  criar o novo, `ALTER COLUMN ... USING`, e dropar o antigo (ver migration 0002).
- **IDE aponta para o Python do sistema:** os erros de import do `sqlalchemy`/
  `fastapi` no editor são falsos. Selecionar o interpretador `backend/venv`.
- **Seed insere via model, sem passar pelo Pydantic:** CNPJ/CPF inválidos passam
  no seed mas quebram na API depois. Manter os dados do seed válidos.
- **Resetar o banco com o uvicorn de pé quebra a PRIMEIRA request:** o asyncpg
  guarda o plano das queries por conexão; `alembic downgrade/upgrade` troca o
  schema e o plano em cache vira lixo →
  `InvalidCachedStatementError: cached statement plan is invalid due to a
  database schema change` (HTTP 500). A conexão ruim é descartada e da segunda
  request em diante volta ao normal — por isso parece "teste instável".
  **Sempre reiniciar o uvicorn depois de mexer nas migrations.**
  Vale para produção também: migration em servidor no ar derruba a primeira
  request de cada conexão do pool → tratar no deploy (ver #20 no PROGRESS).

---

## Ao encerrar a sessão

1. Atualizar o `PROGRESS.md` (concluído, decisões técnicas, notas para a próxima).
2. Commit com mensagem descritiva (`feat:`, `fix:`, `chore:`).
3. `git push origin main` — repo: https://github.com/rafaelqbc-beep/Visita_MedSest
