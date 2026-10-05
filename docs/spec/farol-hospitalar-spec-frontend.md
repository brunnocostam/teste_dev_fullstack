# Farol Hospitalar: especificação do frontend

Documento para o agente que vai desenvolver o frontend. Explica **o que construir**, **por que cada decisão foi tomada** e **quais endpoints o front espera da API**. Onde algo for "sugestão", o agente pode ajustar desde que mantenha o porquê.

---

## 1. Contexto e objetivo

Aplicação web para um **gestor hospitalar** acompanhar a situação do hospital. O nome é **Farol Hospitalar**, e o conceito central é um semáforo:

- **Verde:** tudo OK.
- **Amarelo:** atenção.
- **Vermelho:** situação crítica.
- **Cinza:** neutro (internação encerrada por alta ou óbito).

**Por que um farol?** O gestor decide sob pressão e com pouco tempo. Ele precisa saber em poucos segundos *se* há problema, *onde* está e *quem* está envolvido. A cor responde "se"; o drill-down responde "onde" e "quem".

### Persona

Gestor hospitalar (diretor de operações ou coordenador). Dores: falta de visão em tempo real, dados espalhados em planilhas, descobrir problemas tarde demais, não saber onde agir. Quer antecipar gargalos e decidir com confiança. Provavelmente consulta também pelo celular.

### Dados disponíveis (banco Postgres)

| Tabela | Conteúdo |
|---|---|
| `departments` | Departamentos e número total de leitos |
| `staff` | Médicos e enfermeiros, vinculados a um departamento |
| `patients` | Pacientes cadastrados |
| `admissions` | Internações: paciente, departamento, leito, datas e status (`internado`, `alta`, `obito`) |
| `exams` | Exames por internação, com status e resultado |
| `vital_signs` | Série temporal de FC, PA, temperatura e saturação por internação |

Os dois "fatos" principais são `admissions` e `exams`. `vital_signs` só aparece no detalhe da internação. **Confirmar os nomes exatos das colunas no schema real antes de implementar.**

### Requisitos do desafio (obrigatórios)

- React no frontend.
- Dashboard com cards de KPI.
- Pelo menos 1 gráfico de ocupação/distribuição por departamento.
- Pelo menos 1 gráfico de série temporal (sinais vitais de uma internação).
- Listagem de internações com filtros e navegação para o detalhe.
- Interface responsiva, com atenção à usabilidade.
- Tudo sobe com `docker compose up --build` (serviços da API e do front no `docker-compose.yml`).

---

## 2. Arquitetura geral

Três serviços no Docker Compose: **frontend (React)**, **API** e **Postgres**. O front só conversa com a API (nunca com o banco).

**Por que a lógica do farol fica no backend?** As cores são calculadas em views SQL em cascata (internação → departamento → hospital). Assim as 4 telas nunca divergem entre si, e o front só **exibe** o status que recebe. Não calcule cor no front.

### Stack sugerida (pode ajustar)

- React + TypeScript + Vite
- React Router (rotas por tela)
- TanStack Query (cache, loading e erro das chamadas)
- Recharts (gráficos)
- CSS Modules ou Tailwind, com **design tokens** para as cores do farol

**Por quê:** React Router dá URL compartilhável por tela e botão voltar funcional. TanStack Query evita código repetido de loading, erro e cache. Recharts cobre barras, pizza e série temporal com pouco código.

---

## 3. Layout geral

Baseado no esboço do produto: **menu lateral fixo** à esquerda e **área principal ("tela dash")** à direita.

```
+---------+---------------------------+
| Logo    |                           |
| Geral   |        área principal     |
| Depto   |   (muda conforme a rota)  |
| Admissão|                           |
+---------+---------------------------+
```

- **Menu:** logo "Farol Hospitalar" (ícone de semáforo) e 3 itens: **Geral**, **Depto**, **Admissão**. O item ativo fica destacado em formato de pílula.
- **Por quê:** o menu dá acesso direto a cada visão e mostra onde o gestor está. Além disso, a navegação por toque dentro das telas (tiles, linhas de tabela) faz o drill-down.
- **A tela de detalhe da admissão mantém "Admissão" ativo no menu.** Ela pertence a esse contexto.
- **Responsivo:** em telas pequenas, o menu vira barra inferior ou menu hambúrguer, e a área principal ocupa a largura toda. Grades de 2 colunas viram 1 coluna abaixo de ~480px; tabelas com muitas colunas viram lista de cards.

---

## 4. Telas e rotas

| # | Tela | Rota | Menu ativo |
|---|---|---|---|
| 1 | Geral | `/` | Geral |
| 2 | Departamento | `/departamentos/:id` (e `/departamentos` redireciona para o primeiro) | Depto |
| 3 | Tabela de admissões | `/admissoes` | Admissão |
| 4 | Detalhe da admissão | `/admissoes/:id` | Admissão |

### Tela 1: Geral (visão macro)

**Pergunta que responde:** "O hospital está bem? Onde devo olhar?"

**Componentes, de cima para baixo:**
1. **Faixa de status do hospital:** semáforo grande com 3 luzes (a ativa fica acesa) e texto: "Atenção", "Tudo OK" ou "Crítico", mais uma frase de resumo (ex.: "1 departamento crítico · 2 em alerta").
2. **2 KPIs:** ocupação geral (%) e exames atrasados (quantidade). Se houver dado, mostre variação vs. período anterior (▲▼).
3. **Grade de tiles por departamento:** cada tile tem bolinha de cor, nome, ocupação e um motivo curto (ex.: "88% · equipe no limite"). Tocar no tile abre `/departamentos/:id`.
4. Opcional: gráfico de barras de ocupação por departamento (atende ao requisito do desafio). Se couber, coloque abaixo dos tiles, com a cor da barra seguindo o status.

**Por quê:** é a primeira tela e deve ser lida em 1 segundo. O status geral é o **pior caso** (se há um departamento vermelho, o hospital não pode parecer verde). Os tiles ordenados por gravidade levam o olhar direto ao problema.

**Regras de UI:**
- Ordenar tiles do mais grave para o menos grave (vermelho, amarelo, verde).
- Cor **sempre acompanhada de texto** ("Crítico", "Atenção", "Tudo OK"), nunca só cor (acessibilidade para daltonismo).

### Tela 2: Departamento (visão detalhada)

**Pergunta que responde:** "O que está pegando nesta área e quem está envolvido?"

**Componentes:**
1. **Seletor de departamento** (dropdown) no topo, para trocar sem voltar à tela Geral.
2. **Faixa de status** do departamento com o motivo em uma frase.
3. **2 KPIs de capacidade:** leitos livres/total e pacientes por enfermeiro.
4. **Mapa de leitos:** grade de quadrados, um por leito. Cor = status da internação do paciente naquele leito; tracejado = leito livre.
5. **Funil de exames:** barras de solicitados, em andamento e concluídos, com destaque para atrasados.
6. **Pacientes por prioridade:** lista ordenada (vermelhos primeiro) com bolinha de cor e motivo (ex.: "Leito 12 · saturação 88%"). Tocar abre `/admissoes/:id`.

**Por quê:** a ordem segue "o que está errado → onde → por quê → quem". O mapa de leitos mostra a distribuição espacial do problema de forma imediata. A lista de prioridade transforma o painel em ferramenta de ação, não só de leitura.

### Tela 3: Tabela de admissões

**Pergunta que responde:** "Quais internações existem e quais exigem atenção?"

**Componentes:**
1. **Filtros:** status (Todos, Internado, Alta, Óbito) em chips e departamento em dropdown. Opcional: busca por nome do paciente.
2. **Contador:** "N admissões".
3. **Lista/tabela:** cada linha mostra a bolinha do farol, nome do paciente, departamento, leito e dias de internação. Tocar abre `/admissoes/:id`.
4. **Paginação** (ou scroll infinito).

**Por quê:** é a porta de entrada para qualquer paciente específico, atendendo ao requisito "listagem com filtros e navegação para o detalhe". O farol em cada linha permite ordenar mentalmente por prioridade. Sugestão: ordenar por padrão por gravidade e depois por dias de internação. Os filtros devem ficar refletidos na URL (`?status=internado&departmentId=uti`) para link compartilhável e para o botão voltar preservar o estado.

**Em desktop:** tabela com colunas (Paciente, Departamento, Leito, Entrada, Dias, Status, Farol). **Em mobile:** cards.

### Tela 4: Detalhe da admissão (visão micro)

**Pergunta que responde:** "Como está este paciente e por quê?"

**Componentes:**
1. **Breadcrumb:** `Admissões › #123` com botão voltar para a tabela.
2. **Cabeçalho:** nome, departamento, leito, dias de internação e status (internado/alta/óbito).
3. **Faixa de status (farol)** com o **motivo** em uma frase (ex.: "Saturação 88% · exame atrasado").
4. **Cards dos últimos sinais vitais:** FC, PA e saturação (e temperatura se couber). Só o valor fora da faixa ganha cor.
5. **Gráfico de série temporal dos sinais vitais** (requisito do desafio): abas por tipo (FC, PA, Temp, Sat), **faixa normal sombreada** e último ponto destacado com a cor do status.
6. **Lista de exames:** nome, tempo desde a solicitação e status (Atrasado, Em andamento, Concluído). Atrasados primeiro.
7. **Linha do tempo:** entrada, transferências, exames, alertas e alta/óbito.

**Por quê:** a faixa normal sombreada deixa o desvio saltar aos olhos sem exigir que o gestor conheça os valores de referência. O motivo explícito na faixa de status fecha o ciclo com a tela de cima: o que deixou o departamento vermelho aparece aqui, com causa.

---

## 5. Regras do farol (definidas no backend, o front só exibe)

Valores **sugeridos** para começar; devem ser validados com referências clínicas e ficar **configuráveis**, não fixos no código.

| Indicador | Verde | Amarelo | Vermelho |
|---|---|---|---|
| Ocupação do departamento | < 80% | 80–90% | > 90% |
| Exame pendente | < 12h | 12–24h | > 24h |
| Sinais vitais | dentro da faixa | próximo do limite | fora da faixa |

- **Status da internação** = pior entre seus indicadores. Internações com alta ou óbito têm status `neutral`.
- **Status do departamento** = pior entre ocupação, carga da equipe e suas internações ativas.
- **Status do hospital** = pior status entre os departamentos.
- Ponto a decidir com o produto: se isso deixar o hospital quase sempre amarelo ou vermelho, usar regra por proporção (ex.: vermelho só se mais de 1 departamento estiver crítico).

**Valores de status que a API devolve:** `"green" | "yellow" | "red" | "neutral"`. O front mapeia para cor, rótulo e ícone.

---

## 6. Endpoints sugeridos

Base: `/api`. Todas as respostas em JSON, datas em ISO 8601.

### `GET /api/overview`: tela Geral

```json
{
  "status": "yellow",
  "summary": "1 departamento crítico · 2 em alerta",
  "kpis": {
    "occupancyPct": 82,
    "activeAdmissions": 112,
    "lateExams": 9
  },
  "departments": [
    {
      "id": "uti",
      "name": "UTI",
      "status": "red",
      "reason": "2 pacientes críticos",
      "occupancyPct": 96,
      "occupiedBeds": 24,
      "totalBeds": 25
    }
  ]
}
```

A lista de departamentos já vem ordenada do mais grave para o menos grave. Se houver série para variação (▲▼), incluir `"occupancyDeltaPct"` em `kpis`.

### `GET /api/departments`: seletor de departamento

```json
[{ "id": "uti", "name": "UTI", "status": "red" }]
```

Leve e barato, usado só para popular o dropdown.

### `GET /api/departments/:id`: tela Departamento

```json
{
  "id": "uti",
  "name": "UTI",
  "status": "red",
  "reason": "2 pacientes críticos · ocupação 96%",
  "beds": {
    "total": 25,
    "occupied": 24,
    "free": 1,
    "map": [
      { "bed": 1, "admissionId": 101, "status": "green" },
      { "bed": 2, "admissionId": null, "status": null }
    ]
  },
  "staff": { "doctors": 6, "nurses": 8, "patientsPerNurse": 3.2 },
  "exams": { "requested": 4, "inProgress": 6, "completed": 18, "late": 2 },
  "priorityAdmissions": [
    {
      "id": 123,
      "patientName": "Paciente A",
      "bed": 12,
      "status": "red",
      "reason": "Saturação 88%"
    }
  ]
}
```

`priorityAdmissions` vem ordenada por gravidade e traz só as internações ativas com status diferente de verde. O `map` representa um item por leito (de 1 até `total`); leito livre tem `admissionId: null`.

### `GET /api/admissions`: tabela de admissões

Query params (todos opcionais): `status` (`internado|alta|obito`), `departmentId`, `search`, `page` (default 1), `pageSize` (default 20, máx. 100).

```json
{
  "items": [
    {
      "id": 123,
      "patientName": "Paciente A",
      "departmentId": "uti",
      "departmentName": "UTI",
      "bed": 12,
      "status": "internado",
      "farol": "red",
      "farolReason": "Saturação 88%",
      "admittedAt": "2026-09-30T08:10:00Z",
      "dischargedAt": null,
      "daysAdmitted": 3
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 8
}
```

Ordenação padrão: gravidade do farol e depois dias de internação.

### `GET /api/admissions/:id`: detalhe da admissão

```json
{
  "id": 123,
  "patient": { "id": 55, "name": "Paciente A" },
  "department": { "id": "uti", "name": "UTI" },
  "bed": 12,
  "status": "internado",
  "farol": "red",
  "farolReason": "Saturação 88% · exame atrasado",
  "admittedAt": "2026-09-30T08:10:00Z",
  "dischargedAt": null,
  "latestVitals": {
    "recordedAt": "2026-10-03T15:40:00Z",
    "heartRate": 118,
    "bloodPressure": { "systolic": 105, "diastolic": 68 },
    "temperature": 37.8,
    "oxygenSaturation": 88
  },
  "vitals": [
    {
      "recordedAt": "2026-10-03T12:00:00Z",
      "heartRate": 104,
      "bloodPressure": { "systolic": 112, "diastolic": 72 },
      "temperature": 37.4,
      "oxygenSaturation": 93
    }
  ],
  "referenceRanges": {
    "heartRate": { "min": 60, "max": 100 },
    "oxygenSaturation": { "min": 92, "max": 100 },
    "temperature": { "min": 36.0, "max": 37.5 },
    "bloodPressure": {
      "systolic": { "min": 90, "max": 140 },
      "diastolic": { "min": 60, "max": 90 }
    }
  },
  "exams": [
    {
      "id": 900,
      "name": "Raio-X de tórax",
      "requestedAt": "2026-10-02T13:30:00Z",
      "status": "late",
      "hoursPending": 26,
      "result": null
    }
  ],
  "timeline": [
    {
      "at": "2026-09-30T08:10:00Z",
      "type": "admission",
      "label": "Entrada pela Emergência",
      "severity": "green"
    }
  ]
}
```

- `vitals` em ordem cronológica crescente, pronto para o gráfico.
- `referenceRanges` vem da API para o front desenhar a faixa normal sem fixar valores no código (os valores acima são ilustrativos).
- `exams[].status`: `"requested" | "in_progress" | "completed" | "late"`.
- `timeline[].type`: `"admission" | "transfer" | "exam" | "alert" | "discharge" | "death"`.

### Padrão de erro (todas as rotas)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Parâmetro status inválido", "details": [] } }
```

- `400` parâmetros inválidos, `404` recurso inexistente, `500` erro interno.
- O front deve exibir mensagem amigável a partir de `error.message`.

---

## 7. Componentes reutilizáveis

**Por quê reutilizar:** os 3 níveis usam os mesmos blocos; só o filtro de dados muda. Isso mantém a interface coerente e o código pequeno.

| Componente | Função |
|---|---|
| `Layout` | Menu lateral + área principal (`<Outlet />`) |
| `Sidebar` | Logo e itens do menu, com estado ativo |
| `StatusBadge` / `StatusDot` | Bolinha ou selo de cor + rótulo textual |
| `StatusBanner` | Faixa grande com status, título e motivo |
| `TrafficLight` | Semáforo de 3 luzes (tela Geral) |
| `KpiCard` | Rótulo, valor e variação opcional |
| `DepartmentTile` | Tile clicável de departamento |
| `BedMap` | Grade de leitos colorida |
| `ExamFunnel` | Barras de solicitados, em andamento e concluídos |
| `AdmissionList` / `AdmissionRow` | Lista de internações com farol |
| `FilterChips` | Chips de filtro (status) |
| `VitalsChart` | Série temporal com faixa normal sombreada e abas |
| `Timeline` | Linha do tempo de eventos |
| `Breadcrumb` | Navegação hierárquica |
| `EmptyState`, `ErrorState`, `Skeleton` | Estados vazio, erro e carregando |

### Design tokens do farol (sugestão)

Definir como variáveis CSS e usar **somente** os tokens (nunca cores soltas):

- `--status-green`, `--status-yellow`, `--status-red`, `--status-neutral`
- Cada um com variantes `-bg` (fundo suave), `-border` e `-text`
- Garantir contraste mínimo WCAG AA entre texto e fundo.

---

## 8. UX, acessibilidade e estados

- **Cor nunca sozinha:** sempre acompanhada de texto ou ícone ("Crítico", "Atenção", "Tudo OK"). Por quê: cerca de 1 em cada 12 homens tem alguma forma de daltonismo, e o produto depende de vermelho e verde.
- **Loading:** skeletons com o formato do conteúdo (não spinner solto).
- **Vazio:** mensagens claras ("Nenhuma internação com esses filtros", "Nenhum paciente em alerta").
- **Erro:** mensagem amigável e botão "Tentar novamente".
- **Alvos de toque** com pelo menos 44px de altura (o gestor pode usar o celular).
- **Navegação por teclado** e foco visível em tiles, linhas e chips.
- **Gráficos** com título e descrição acessíveis (`aria-label`) e valores textuais disponíveis (ex.: último valor ao lado do gráfico).
- **Estado na URL:** filtros e seleção de departamento na query string e nas rotas, para link compartilhável e botão voltar funcional.
- **Atualização:** refetch periódico (sugestão: a cada 60s na tela Geral e no Departamento) e indicação de "atualizado às HH:MM". Por quê: o gestor quer uma visão próxima do tempo real.

---

## 9. Fora do escopo (por enquanto)

- Autenticação e perfis de usuário.
- Edição de dados clínicos (o app é só de leitura).
- Notificações push.
- Previsão de ocupação (ideia futura).

---

## 10. Critérios de aceite

1. `docker compose up --build` sobe banco, API e front, e o app abre sem passos extras.
2. As 4 telas existem, com as rotas da seção 4 e menu lateral funcional (item ativo correto, inclusive no detalhe).
3. Drill-down completo: Geral → Departamento → Detalhe da admissão, e Admissão (tabela) → Detalhe, com botão voltar e breadcrumb.
4. O status do farol exibido vem da API; o front não recalcula regras.
5. Há ao menos 1 gráfico de ocupação/distribuição por departamento e 1 gráfico de série temporal de sinais vitais.
6. A tabela de admissões filtra por status e departamento, e os filtros ficam na URL.
7. Cor sempre acompanhada de texto; contraste AA.
8. Layout responsivo: usável em celular (menu adaptado, tabela em cards) e em desktop.
9. Estados de loading, vazio e erro tratados em todas as telas.
10. Os campos e endpoints seguem o contrato da seção 6 (ajustes de nomes devem ser alinhados com a API).
