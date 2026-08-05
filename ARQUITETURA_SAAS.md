# MedSest Visita — Nota de arquitetura para SaaS (registro de decisão)

**Status:** decisão de direção, **não implementada.** Registrada em 05/08/2026 para
não se perder. O plano acordado: **rodar o sistema dentro da MedSest primeiro, validar
tudo, e só depois evoluir para SaaS multi-tenant.** Esta nota é o mapa de quando
formos atacar.

> ⚠️ **Não fazer nada disto agora.** Multi-tenancy prematuro (antes de o produto estar
> provado com um cliente real) é over-engineering. O que já foi decidido "de graça"
> (abaixo) basta por ora.

---

## O contexto

Hoje o sistema é **single-tenant**: a MedSest é a única dona. As "empresas" na tela
(`clientes`) são quem a MedSest **visita**, não outros assinantes. No SaaS, o
**assinante** passa a ser uma empresa **como a MedSest** (uma consultoria de SST que
faz visitas), e cada uma precisa dos seus próprios usuários, unidades, clientes,
chamados e dashboard — **isolados** entre si.

---

## Decisão 1 — Isolamento (multi-tenancy)

**Modelo escolhido: banco único + `tenant_id` em cada tabela + escopo reforçado.**

| Modelo | Prós | Contras | Veredito |
|---|---|---|---|
| **Banco único + `tenant_id`** (linha por tenant) | Barato, simples de operar/dar suporte, analytics cross-tenant fácil | Um filtro esquecido vaza dados | ✅ **Começar por aqui** |
| Schema por tenant | Mais isolamento | Migrations em N schemas | Talvez depois, p/ clientes grandes |
| Banco por tenant | Isolamento máximo | Custo de operação alto | Só enterprise/compliance |

**Como blindar o vazamento de dados:** usar **Row-Level Security (RLS) do PostgreSQL** —
uma policy por tabela que barra, no próprio banco, qualquer query sem o `tenant_id`
certo. É a rede de segurança para o erro humano de "esqueci o `WHERE tenant_id=`".

**O que ajuda no código atual:** já existe um **padrão de escopo** em
`services/visita.py` (`aplicar_escopo_chamados`/`pode_ver_chamado`) que recorta tudo por
**perfil**. Generalizar para "escopo por **tenant** + perfil" é evolução do que existe,
não recomeço. O `tenant_id` entra no JWT no login e vira o eixo de todo escopo.

**O que muda no banco (esboço):**
- Nova tabela `tenant` (empresa assinante: nome, marca, plano, config de e-mail…).
- `tenant_id` (FK) em: `usuarios`, `unidades_medsest`, `clientes`, `chamados`,
  `setores`/`cargos`/`fotos` (herdam via chamado), `round_robin_tecnico`,
  `notificacoes_log`, `refresh_tokens`. A MedSest de hoje vira o **tenant #1**
  (migration de backfill).
- Um nível novo de admin: **super-admin da plataforma** (cria tenants) vs. **admin do
  tenant** (configura o próprio mundo).

---

## Decisão 2 — E-mail em escala (a pergunta que originou a nota)

**❌ NÃO deixar cada tenant plugar o próprio SMTP.** Vira pesadelo de entregabilidade
(cai em spam) e de suporte (senha errada de um, cota estourada de outro).

**✅ Modelo escolhido: um serviço de envio central, controlado pela plataforma.**
- **Um provedor só** (Amazon SES / Postmark / SendGrid) com o **domínio da plataforma**
  configurado uma vez (SPF + DKIM + DMARC) → entregabilidade alta para todos os tenants.
- Cada tenant configura só **dados**, não servidor: **nome do remetente** e **reply-to**
  (ex.: `MedSest <nao-responda@plataforma.com.br>`, responder para
  `contato@medsest.com.br`).
- **Upgrade opcional:** o tenant que quiser enviar do **próprio domínio** adiciona uns
  registros DNS que o sistema valida (domínio verificado) — aí o e-mail sai de
  `@medsest.com.br` de verdade.

**Resultado:** e-mail vira **configuração de dados por tenant** (`tenant.email_from_name`,
`tenant.email_reply_to`, `tenant.email_dominio_verificado`), não credencial de SMTP.

**O que ajuda no código atual:** `services/notificacoes.py` já é **agnóstico** — os call
sites não mudam; só `_enviar_email` conhece o provedor. **O envio central que vamos ligar
agora (SMTP único da MedSest) É o "sender da plataforma" do futuro SaaS.** Nada perdido:
no SaaS, esse mesmo ponto passa a stampar o remetente por tenant.

---

## Decisão 3 — Configuração "prática" dos cenários

O que faz configurar ser prático é uma **tela de configuração self-service por tenant**
(o admin do tenant mexe no próprio mundo, sem depender da plataforma):
- **Marca:** logo, nome, cores (hoje o MedSest está fixo no código → vira config do tenant).
- **E-mail:** nome do remetente, reply-to, domínio próprio (opcional).
- **Catálogo de riscos/EPIs:** cada consultoria com a sua lista.
- Unidades, usuários, clientes, preferências de notificação (já são dados, só ganham escopo).

**O que já ajuda (decisão tomada de propósito):** o **catálogo de riscos/EPIs virou
texto (`text[]`), não `ENUM`** — exatamente para poder virar um **catálogo editável por
tenant** depois, sem migration de conversão. Ver `models/catalogo.py` e o PROGRESS #18.

---

## Sequência acordada

1. **Terminar o MVP da MedSest + colocar no ar (#20 deploy).** Usar de verdade.
2. Tomar só decisões "de graça" que não atrapalham hoje (como o catálogo em texto).
3. **Quando a direção SaaS estiver confirmada**, fazer a virada multi-tenant deliberada —
   é muito mais fácil desenhar isolamento e configuração com o domínio já maduro.

## Resumo das decisões (para retomada rápida)

- Isolamento: **banco único + `tenant_id` + RLS**. Tenant #1 = MedSest.
- E-mail: **provedor central da plataforma** (SES/Postmark), remetente por tenant; SMTP
  próprio do tenant é upgrade opcional, nunca o padrão.
- Config: **self-service por tenant** (marca, e-mail, catálogo).
- Já pronto para o futuro: escopo por perfil (`services/visita.py`), e-mail agnóstico
  (`notificacoes.py`), catálogo em texto (`models/catalogo.py`).
