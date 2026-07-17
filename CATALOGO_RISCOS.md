# Catálogo de riscos e EPIs — RASCUNHO PARA REVISÃO

**Status:** aguardando revisão do técnico interno. **Ainda não virou código.**
Redigido na sessão #17 (17/07/2026).

> ⚠️ **Quem escreveu isto não é profissional de segurança do trabalho.** A lista foi
> montada a partir da tabela clássica de riscos ambientais (as 5 categorias) e do
> Anexo I da NR-06 para os EPIs — é o vocabulário que um técnico reconhece, não uma
> lista validada. **A palavra final é do técnico interno.**

## O que precisamos que o técnico interno responda

1. **Falta algum agente** que ele encontra em campo com frequência?
2. **Sobra algum** que nunca vai ser marcado e só polui a tela do tablet?
3. Os **rótulos** estão no vocabulário dele, ou tem nome que ninguém usa no dia a dia?
4. Algum item está na **categoria errada**?
5. Nos EPIs: o nível de detalhe está certo? (ex.: basta "luva" ou precisa distinguir
   luva de raspa, nitrílica, de malha de aço?)

> Não precisa ficar perfeito. O campo **"outros"** existe justamente para o que
> escapar, e a lista é fácil de mudar depois — foi desenhada para isso (os códigos
> são texto, não `ENUM` do Postgres). O que importa agora é acertar os 90% do dia a dia.

---

## Como isto vai funcionar na prática

**Os riscos e os EPIs ficam no CARGO** (decisão de 17/07): a exposição é da função,
não do ambiente. Para cada cargo, o técnico:

1. Marca **"Há riscos?"** → Sim / Não / (em branco = não informado)
2. Se sim, abre as categorias e marca os agentes
3. Escreve em **"Outros riscos"** o que não estiver na lista
4. Marca **"Utiliza EPI?"** → Sim / Não, e quais
5. Escreve em **"Outros EPIs"** o que faltar

**Por que "Há riscos?" é um campo separado da lista:** lista vazia não distingue "o
técnico verificou e não há risco" de "o técnico não preencheu". Para o PGR, declarar
a ausência é uma afirmação — e é diferente de silêncio.

**A categoria não é digitada nem escolhida:** cada agente já pertence a uma categoria
(ruído é sempre físico). O técnico marca "ruído"; o sistema sabe que é físico. Isso
torna impossível gravar "ruído / ergonômico".

---

## Riscos

### Físicos

| Código | Rótulo |
|---|---|
| `RUIDO` | Ruído |
| `VIBRACAO` | Vibração |
| `CALOR` | Calor |
| `FRIO` | Frio |
| `UMIDADE` | Umidade |
| `PRESSAO_ANORMAL` | Pressões anormais |
| `RADIACAO_IONIZANTE` | Radiação ionizante |
| `RADIACAO_NAO_IONIZANTE` | Radiação não ionizante |

### Químicos

| Código | Rótulo |
|---|---|
| `POEIRA` | Poeiras |
| `FUMO` | Fumos |
| `NEVOA` | Névoas |
| `NEBLINA` | Neblinas |
| `GAS` | Gases |
| `VAPOR` | Vapores |
| `PRODUTO_QUIMICO` | Produtos químicos em geral |

### Biológicos

| Código | Rótulo |
|---|---|
| `VIRUS` | Vírus |
| `BACTERIA` | Bactérias |
| `PROTOZOARIO` | Protozoários |
| `FUNGO` | Fungos |
| `PARASITA` | Parasitas |
| `BACILO` | Bacilos |

### Ergonômicos

| Código | Rótulo |
|---|---|
| `ESFORCO_FISICO` | Esforço físico intenso |
| `LEVANTAMENTO_PESO` | Levantamento e transporte manual de peso |
| `POSTURA_INADEQUADA` | Exigência de postura inadequada |
| `CONTROLE_PRODUTIVIDADE` | Controle rígido de produtividade |
| `RITMO_EXCESSIVO` | Imposição de ritmos excessivos |
| `TRABALHO_TURNO_NOTURNO` | Trabalho em turno e noturno |
| `JORNADA_PROLONGADA` | Jornadas de trabalho prolongadas |
| `MONOTONIA_REPETITIVIDADE` | Monotonia e repetitividade |
| `ESTRESSE` | Outras situações causadoras de estresse físico e/ou psíquico |

### Acidentes (mecânicos)

| Código | Rótulo |
|---|---|
| `ARRANJO_FISICO` | Arranjo físico inadequado |
| `MAQUINA_SEM_PROTECAO` | Máquinas e equipamentos sem proteção |
| `FERRAMENTA_INADEQUADA` | Ferramentas inadequadas ou defeituosas |
| `ILUMINACAO_INADEQUADA` | Iluminação inadequada |
| `ELETRICIDADE` | Eletricidade |
| `INCENDIO_EXPLOSAO` | Probabilidade de incêndio ou explosão |
| `ARMAZENAMENTO_INADEQUADO` | Armazenamento inadequado |
| `ANIMAIS_PECONHENTOS` | Animais peçonhentos |
| `QUEDA_MESMO_NIVEL` | Queda no mesmo nível |
| `QUEDA_ALTURA` | Queda com diferença de nível |
| `PERFUROCORTANTE` | Perfurocortante |

**Total: 41 agentes em 5 categorias.**

> `QUEDA_MESMO_NIVEL`, `QUEDA_ALTURA` e `PERFUROCORTANTE` não estão na tabela clássica
> (que os agrupa em "outras situações de risco"). Foram destacados por serem comuns —
> **confirmar com o técnico interno se vale, ou se ele prefere a tabela original.**

---

## EPIs

Agrupados por região do corpo, como a NR-06 faz.

### Proteção da cabeça
| Código | Rótulo |
|---|---|
| `CAPACETE` | Capacete |
| `CAPUZ` | Capuz / balaclava |

### Proteção dos olhos e face
| Código | Rótulo |
|---|---|
| `OCULOS` | Óculos de segurança |
| `PROTETOR_FACIAL` | Protetor facial |
| `MASCARA_SOLDA` | Máscara de solda |

### Proteção auditiva
| Código | Rótulo |
|---|---|
| `PROTETOR_AURICULAR_PLUG` | Protetor auricular tipo plug (inserção) |
| `PROTETOR_AURICULAR_CONCHA` | Protetor auricular tipo concha |

### Proteção respiratória
| Código | Rótulo |
|---|---|
| `MASCARA_PFF1` | Máscara PFF1 |
| `MASCARA_PFF2` | Máscara PFF2 |
| `RESPIRADOR_SEMIFACIAL` | Respirador semifacial |
| `RESPIRADOR_FACIAL_INTEIRA` | Respirador facial inteira |

### Proteção do tronco
| Código | Rótulo |
|---|---|
| `AVENTAL` | Avental |
| `COLETE` | Colete |

### Proteção dos membros superiores
| Código | Rótulo |
|---|---|
| `LUVA` | Luva |
| `MANGOTE` | Manga / mangote |
| `BRACADEIRA` | Braçadeira |

### Proteção dos membros inferiores
| Código | Rótulo |
|---|---|
| `CALCADO_SEGURANCA` | Calçado de segurança |
| `PERNEIRA` | Perneira |
| `POLAINA` | Polaina |

### Proteção do corpo inteiro
| Código | Rótulo |
|---|---|
| `MACACAO` | Macacão |
| `VESTIMENTA_ESPECIAL` | Vestimenta de proteção (calor / químicos) |

### Proteção contra quedas
| Código | Rótulo |
|---|---|
| `CINTURAO_PARAQUEDISTA` | Cinturão paraquedista |
| `TALABARTE` | Talabarte |
| `TRAVA_QUEDAS` | Trava-quedas |

### Proteção da pele
| Código | Rótulo |
|---|---|
| `CREME_PROTETOR` | Creme protetor |
| `PROTETOR_SOLAR` | Protetor solar |

**Total: 25 EPIs em 9 grupos.**

> **A dúvida principal aqui é o nível de detalhe.** "Luva" está genérico de propósito
> — se o PGR precisa distinguir raspa / nitrílica / malha de aço / isolante, isso
> multiplica os itens. **Perguntar ao técnico interno se o genérico serve** (com o tipo
> indo no "outros", quando importar) ou se precisa abrir.

---

## Campos que entram junto (não precisam de catálogo)

**No cargo:**
- Número de trabalhadores (inteiro)
- Jornada / horário de trabalho (texto)

**No setor** (é ambiente, não exposição — decisão de 17/07):
- Máquinas e equipamentos (texto)
- Ruído — dB(A)
- Calor — IBUTG °C
- Iluminância — lux

> **Confirmar as unidades com o técnico interno.** Ruído em dB(A) e calor em IBUTG são
> o padrão da NR-15; se a medição de vocês sai em outra unidade, é melhor saber antes
> de o número ir para o relatório com a unidade errada.

---

## Depois da revisão

Aprovada a lista, ela vira `app/models/catalogo.py` no padrão que o projeto já usa em
`ROTULO_TIPO_VISITA`: código → rótulo, fonte única, consumida pela tela de campo, pelo
Word e pelo PDF, com um teste garantindo que todo código tem rótulo (sem isso um
`KeyError` derruba a exportação — já aconteceu aqui na sessão #16).

Os códigos são gravados como `texto[]` no Postgres, **nunca `ENUM`**: o Postgres não
remove valor de enum, e mudar a lista viraria o ritual de renomear/recriar/converter
tipo que a migration `0002` teve que fazer. Como texto, mudar a lista é editar a lista
— e o dia em que o admin puder editar pelo sistema, basta acrescentar a tabela de
catálogo ao lado, sem migration de conversão dos dados já gravados.
