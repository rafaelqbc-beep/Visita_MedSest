# Roteiro de demonstração — MedSest Visita

Preparado na sessão #17 (17/07/2026) para a validação com o **técnico interno (PGR)**
e a **diretoria**, feita ao vivo na máquina de desenvolvimento, com os dados sendo
digitados na hora junto com eles.

> **O objetivo desta demonstração não é aprovar telas — é responder se o `.docx`
> serve para montar o PGR.** Ver "A pergunta que vale a reunião", no fim.

---

## Antes de começar

```bash
# terminal 1
cd backend && venv\Scripts\activate && uvicorn app.main:app --reload

# terminal 2
cd frontend && npm run dev        # http://localhost:5173
```

Banco: resetado e semeado em 17/07 (5 chamados, `uploads/` limpo). Para voltar a
este estado depois da demo, ver "Depois da demonstração".

### Duas armadilhas que estragam a demo ao vivo

**1. Um perfil por janela.** O refresh token é um cookie único por navegador
(`refresh_token`, em `routers/auth.py`). Logar como Ana numa segunda aba
**sobrescreve o cookie do gestor**: a aba do gestor segue funcionando por até 30
minutos com o access token que está na memória e, ao renovar, **vira a Ana sem
avisar**. Na frente da diretoria isso parece um bug grave.
→ Use **uma janela por perfil**: normal para um, anônima para outro, um terceiro
perfil do Chrome se precisar. Ou faça em sequência, com logout entre os papéis.

**2. Foto no notebook não abre a câmera.** O `capture="environment"`
(`FotosSetor.tsx:72`) só vale em tablet/celular; no Chrome de desktop o atributo é
ignorado e abre o seletor de arquivos.
→ Deixe **uma pasta com fotos prontas** na máquina antes de começar. Se quiser
mostrar a câmera de verdade, essa parte tem que ser num tablet.

---

## Logins

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | `admin@medsest.com.br` | `Admin@123` |
| Gestor comercial | `gestor@medsest.com.br` | `Senha@123` |
| Técnico externo | `ana.externa@medsest.com.br` | `Senha@123` |
| Técnico interno A / B / C | `interno.a@medsest.com.br` (b, c) | `Senha@123` |

---

## Roteiro

### 1. Diretoria — o dashboard (login: admin)

Abre em `/dashboard`. Mostrar KPIs, o volume por mês e a carga dos técnicos internos.

Dizer o que os números significam, porque a semântica não é óbvia: **abertos,
visitas no mês e a vencer em 15 dias ignoram o filtro de período de propósito** —
são indicadores operacionais ("agora"), não analíticos. A própria tela avisa isso.

> Com 5 chamados de teste os gráficos são magros. Isso é dado de seed, não limite
> do sistema — vale dizer antes que alguém pergunte.

### 2. Gestor — abrir o chamado (login: gestor)

`/chamados` → **Novo chamado**. Escolher o cliente no autocomplete (o tipo de visita
vem pré-preenchido do padrão do cliente, e dá para trocar), data proposta, técnico
externo = **Ana**, recomendações.

**Ponto a narrar:** o técnico interno **não é campo do formulário** — o round-robin
decide. Hoje o último foi o **Interno A**, então este chamado deve cair no
**Interno B**. Confirme na tela do detalhe: é uma boa prova de que o rodízio é real.

### 3. Técnico externo — a visita (login: ana, **outra janela**)

`/visitas` → o chamado novo aparece → **Iniciar Visita** (pede geolocalização; se
negar, a visita começa mesmo assim — é de propósito).

Cadastrar **junto com eles**: setores, cargos e fotos. É aqui que o técnico interno
vai dizer se o que se captura basta — deixe ele ditar o conteúdo.

Depois: **Conferir e assinar** (só habilita com ≥1 setor e ≥1 cargo) → conferência
→ **cliente assina** (nome + CPF, validado na hora) → **técnico assina** →
**Finalizar**.

> CPF de teste válido, se precisarem de um: `529.982.247-25`.

### 4. Técnico interno — o relatório (login: **interno.b**, outra janela)

**Truque de encenação:** a fila do Interno B está **vazia** neste momento (o seed dá
tudo ao Interno A — verificado em 17/07). Abra `/relatorios` com ele **antes** de
finalizar a visita e mostre a tela vazia. Depois volte aqui após o passo 3: o
relatório aparece sozinho, e é o único. Isso prova o round-robin e a regra de
liberação melhor que qualquer explicação — e mostra que o técnico interno **não vê
nada antes de o cliente assinar**.

`/relatorios` → o chamado recém-finalizado está na fila, em destaque como não
exportado → abrir o detalhe → **Exportar Word**.

**Abrir o `.docx` na frente dele.** Este é o momento da reunião.

### 5. (Opcional) Admin — anular

Mostrar que um FINALIZADO só pode ser anulado por **ADMIN e com motivo obrigatório**,
e que o diálogo cita quem assinou pelo nome. É o argumento de controle para a
diretoria: nada assinado se desfaz em silêncio.

---

## A pergunta que vale a reunião

**O sistema hoje captura, por setor, só `nome` + `descrição do ambiente` (texto
livre); por cargo, `nome` + `descrição da função` (texto livre); por foto, uma
descrição.** Não há campo estruturado para nada do que um PGR normalmente exige.

Pergunte ao técnico interno, olhando o `.docx` aberto:

- Para montar o PGR a partir disto, **o que você teria que perguntar de volta ao
  campo?** (essa resposta é a lista de campos que faltam)
- Você precisa de **número de trabalhadores por cargo**? **Jornada**?
- **Riscos por categoria** (físico, químico, biológico, ergonômico, acidente) —
  precisa ser campo estruturado ou o texto livre resolve?
- **EPIs em uso** por cargo?
- **Medições** (ruído, calor, iluminância) — entram no app ou vêm de outro lugar?
- **Máquinas e equipamentos** por setor?
- As fotos vêm com legenda suficiente? Faltam ângulos obrigatórios?
- A estrutura do documento ajuda ou você vai reorganizar tudo de qualquer jeito?

Para a diretoria:

- Os KPIs são os que vocês acompanham de verdade, ou são outros?
- A rastreabilidade (assinatura no canvas + nome + CPF + data/hora + geolocalização)
  atende juridicamente no lugar do papel assinado?
- O que ainda falta para isto substituir o processo atual?

**Se a resposta do técnico interno for "faltam campos", isso vale mais que as telas
pendentes (#17 cadastros, #18 offline, #19 PWA).** Campo novo mexe em migration,
formulário de campo e nos dois documentos — quanto mais cedo, mais barato.

---

## Depois da demonstração

Anotar as respostas no PROGRESS.md antes de decidir a próxima sessão.

Para voltar o banco ao estado do seed (os dados digitados na demo somem):

```bash
cd backend
venv\Scripts\activate
alembic downgrade base && alembic upgrade head && python seed.py
# limpar os arquivos que a demo gerou (o downgrade NÃO apaga uploads/):
#   uploads/fotos/*  e, em uploads/assinaturas/, tudo que não começa com "seed-"
```

⚠️ **Reiniciar o uvicorn depois disso** — sem reiniciar, a primeira request de cada
conexão do pool morre com `InvalidCachedStatementError` (plano em cache do asyncpg
vs. schema novo). Parece teste instável e não é.
