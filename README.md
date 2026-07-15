# MedSest Visita

Sistema web responsivo (tablet-first, PWA) para gestão e registro de **visitas técnicas de campo**, dando suporte ao processo que antecede a elaboração do **PGR (Programa de Gerenciamento de Riscos)**.

O sistema coleta setores, cargos/funções e registros fotográficos das empresas visitadas e estrutura essas informações brutas para uso pelos técnicos internos. **Ele não gera o PGR** — apenas organiza e exporta os insumos.

---

## Fluxo da visita

```
PENDENTE  ──▶  EM_ANDAMENTO  ──▶  FINALIZADO
   │               │                  │
   │               │                  └─ liberado ao técnico interno,
   │               │                     que visualiza e exporta o Word
   │               └─ técnico registra setores, cargos e fotos;
   │                  ao terminar, confere os dados JUNTO AO CLIENTE
   │                  no local e edita o que for preciso;
   │                  cliente assina (nome + CPF) e técnico assina
   └─ chamado aberto pelo gestor comercial, técnico interno
      atribuído por round-robin

CANCELADO ── qualquer status pode ser cancelado por ADMIN
```

A conferência e a **assinatura acontecem presencialmente, no fim da visita** — não há
fluxo de aprovação por e-mail. Após finalizar, o cliente recebe apenas uma cópia em
PDF do relatório assinado (recibo, sem exigir ação).

> **Nota:** o `PROGRESS.md` documenta essa mudança de escopo em relação à
> especificação original do projeto.

---

## Stack

| Camada | Tecnologias |
|---|---|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2, JWT (python-jose), python-docx |
| **Frontend** | React 18 + TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query v5, React Hook Form + Zod, React Router v6, Recharts |
| **PWA / Offline** | vite-plugin-pwa, Workbox, IndexedDB (idb) |
| **Banco** | PostgreSQL 15 |
| **Infra** | Nginx, Gunicorn + Uvicorn, Systemd, Certbot, VPS Hostinger (Ubuntu 22.04) |

---

## Estrutura do repositório

```
medsest-visita/
├── backend/      # API FastAPI
├── frontend/     # SPA React + PWA
├── nginx/        # configuração do reverse proxy
├── docker-compose.yml   # PostgreSQL + Redis para dev local
├── PROGRESS.md   # diário de bordo do desenvolvimento
└── DEPLOY.md     # guia de deploy no VPS (a ser gerado)
```

---

## Ambiente de desenvolvimento local

### 1. Banco de dados (via Docker)

```bash
docker-compose up -d        # sobe PostgreSQL e Redis
docker-compose down         # encerra
docker-compose down -v      # encerra e apaga os dados (reset completo)
```

> Se não usar Docker, instale PostgreSQL 15 localmente e crie o banco `medsest_db`.

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate   |  Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # ajustar as variáveis
alembic upgrade head
python seed.py               # popular dados de teste
uvicorn app.main:app --reload
```

API em `http://localhost:8000` · docs em `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App em `http://localhost:5173`

---

## Credenciais de teste (após seed)

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | admin@medsest.com.br | Admin@123 |

Demais usuários (gestor, técnicos) são criados pelo `seed.py` — ver o script para as senhas.

---

## Documentação

- **[PROGRESS.md](PROGRESS.md)** — status do desenvolvimento e diário de bordo
- **DEPLOY.md** — guia de deploy em produção (gerado em sessão futura)
