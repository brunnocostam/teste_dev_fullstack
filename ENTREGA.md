# Farol Hospitalar: entrega

Dashboard de gestão hospitalar para o "Hospital Vida Plena". O gestor abre a tela e sabe, em poucos segundos, **se** há problema, **onde** está e **quem** está envolvido. A ideia central é um farol: cada internação, departamento e o hospital inteiro recebem uma cor (verde, amarelo, vermelho, ou cinza para internação encerrada), sempre acompanhada do motivo em texto.

- **Tempo investido:** duas noites, aproximadamente 6 horas.
- **Especificação do produto:** [`docs/spec/farol-hospitalar-spec-frontend.md`](docs/spec/farol-hospitalar-spec-frontend.md)
- **Glossário do domínio:** [`CONTEXT.md`](CONTEXT.md)
- **Decisões registradas (ADRs):** [`docs/adr/`](docs/adr/)

---

## 1. Como rodar do zero

Pré-requisito: Docker com Docker Compose.

```bash
docker compose up --build
```

| Serviço | Endereço |
|---|---|
| Aplicação (front) | http://localhost:3000 |
| API | http://localhost:3001/api/health |
| Adminer (banco) | http://localhost:8080 |
| Postgres | `localhost:5432` |

O front só abre depois que a API responde ao healthcheck, e a API só sobe depois que o banco está pronto, então um único comando basta.

> **Rode pelo Docker.** O banco guarda os horários em UTC, e a API no container também roda em UTC. Rodando a API direto na máquina (fora do Docker), o driver `pg` interpreta as datas no fuso da máquina e os horários aparecem deslocados (3h a mais em Brasília). Para desenvolvimento local, veja a seção 1.3.

Se alguma porta já estiver em uso, crie um `.env` na raiz (a partir do [`.env.example`](.env.example)) e troque `POSTGRES_PORT`, `API_PORT`, `WEB_PORT` ou `ADMINER_PORT`.

### 1.1 Seed de cenários (recomendado para avaliar o farol)

Com o seed original, quase todo o farol fica verde, e algumas regras nunca disparam (seção 3 explica por quê). Para ver todas as cores e regras funcionando, use o seed de cenários:

```bash
# no .env da raiz (não no .env.example)
SEED_FILE=seeds/cenarios.sql
```

```bash
docker compose down -v      # apaga o volume do banco para o seed rodar de novo
docker compose up --build
```

Para voltar ao seed original, remova (ou comente) a linha `SEED_FILE` e repita os dois comandos.

### 1.2 Testes

```bash
npm test                    # unitários: API (Jest) + front (Vitest), sem banco
npm run test:integration    # SQL contra Postgres real (precisa do banco no ar)
npm run lint                # oxlint na API e no front
```

Os testes de integração usam um banco separado, `hospital_test`, criado no mesmo Postgres e recriado a partir do schema oficial a cada execução. Há uma trava que recusa qualquer banco cujo nome não termine em `_test`, para nunca apagar o banco da aplicação.

Antes de rodar fora do Docker, instale as dependências (`npm install` na raiz, em `api/` e em `web/`) e copie [`api/.env.example`](api/.env.example) para `api/.env`.

### 1.3 Desenvolvimento local (opcional)

```bash
npm run db:up               # só banco e Adminer no Docker
TZ=UTC npm run dev          # API (hot reload) e front (Vite) juntos
```

O front em dev roda em http://localhost:5173 e repassa `/api` para a API local.

---

## 2. Como usei IA

**Ferramenta:** somente o Claude Code.

### O processo

Usei a IA para apoiar um processo de **engenharia reversa**: comecei pelo resultado que o usuário final precisa e voltei até os dados, não o contrário.

1. **Usuário final.** Pensei em quem vai usar o painel e criei uma persona: o gestor hospitalar, com dores claras (falta de visão em tempo real, dados espalhados, descobrir problemas tarde demais, não saber onde agir). Ele precisa do farol para tomar decisões sob pressão.
2. **Design final.** A partir da persona, desenhei as telas (Geral, Departamento, Internações e Detalhe), a pergunta que cada uma responde e o contrato de API que elas precisam. Isso virou a especificação em [`docs/spec/`](docs/spec/farol-hospitalar-spec-frontend.md).
3. **Testes.** Defini os critérios de aceite e as regras do farol antes de escrever código.
4. **Desenvolvimento**, do back e depois do front.

As **decisões foram minhas**. Usei uma sessão de perguntas e respostas com a IA (o "grilling") para extrair o máximo da ideia que eu já tinha proposto: a IA questionava cada ponto da especificação, e eu decidia. Foi assim que fechei stack, estrutura e endpoints.

### Como trabalhamos

- **Entregas pequenas e reversíveis.** A IA implementava e verificava cada entrega (testes, consultas no banco real, screenshots das telas). Eu revisava, testava no navegador e fazia o commit. **Todos os commits e comandos Docker foram feitos por mim.**
- **Decisões registradas.** As escolhas que não são óbvias viraram ADRs, e o vocabulário do domínio virou o glossário do [`CONTEXT.md`](CONTEXT.md), usado igualmente na tela, na API e na documentação.

### Onde eu corrigi ou redirecionei a IA

Uso de IA não é aceitar o que ela propõe. Alguns exemplos:

- **Repositório:** a IA sugeriu manter um `upstream` apontando para o repositório original. Não fazia sentido: o objetivo é entregar o meu.
- **Onde calcular a cor do farol:** discutimos front ou back, e decidi pelo back. Assim as quatro telas nunca divergem.
- **nginx:** antes de aceitar, pedi prós, contras e alternativas.
- **Seletor de período:** o calendário recalculava a lista a cada clique. Pedi um botão "Aplicar período" e um botão "Hoje".
- **Dados inconsistentes:** notei pacientes com nome feminino e gênero masculino. Isso levou a IA a investigar o seed e encontrar o bug descrito na seção 3.
- **Filtro de período:** a regra proposta pela IA (sobreposição de datas) parecia boa no papel, mas no teste com dados reais trazia todas as internações ativas. Mudei para a data de entrada ([ADR 0003](docs/adr/0003-periodo-pela-data-de-entrada.md)).
- **Fuso horário:** a IA propôs corrigir a leitura de datas da API e o filtro. Limitei a correção ao que o avaliador realmente vê (o filtro) e documentei o resto (rodar pelo Docker).
- **Visual:** testei um redesenho completo proposto pela IA, não gostei e mandei reverter.
- **Seed de cenários:** quando o tempo fez o cenário "envelhecer" (seção 3.3), a IA sugeriu alterar o seed. Preferi manter e documentar como comportamento esperado.
- **Revisão de qualidade:** pedi uma revisão do código contra as boas práticas avaliadas. Daí saíram os testes de integração do SQL, os testes do front e o lint da API.

---

## 3. Começando pelos dados: o seed de cenários

### 3.1 O que a análise dos dados mostrou

Antes de pensar em código, analisei os dados do seed original para saber se as regras do farol poderiam ser exercitadas. Logo de cara:

- **Só 3 internações ativas**, todas no mesmo departamento.
- **Nenhum exame pendente ou atrasado.**
- **Últimas medições de sinais vitais de semanas atrás.**

Ou seja, com esses dados, a maior parte dos cenários do farol (departamento lotado, exame atrasado, equipe sobrecarregada) nunca apareceria. Aceitei esse resultado no início e desenvolvi sobre o schema real.

### 3.2 A causa: um detalhe do PostgreSQL

Mais tarde notei pacientes com nome e gênero incoerentes ("Manuela", masculino). Primeiro verifiquei se os JOINs da API estavam corretos (estavam). Depois a investigação chegou ao [`02_seed.sql`](database/init/02_seed.sql):

```sql
CROSS JOIN LATERAL (
    SELECT id, total_beds FROM departments ORDER BY random() LIMIT 1
) AS d
```

Uma subconsulta `LATERAL` que **não referencia** a linha de fora é executada uma única vez pelo PostgreSQL, e o resultado é reaproveitado em todas as linhas. O "sorteio" se repete:

- todas as 40 internações caem no **mesmo departamento** (Cirurgia);
- **todos** os 80 exames ficam como `concluido`;
- toda internação tem **exatamente** 2 exames e 7 medições.

O gênero e a idade aleatórios, sem relação com o nome, são uma escolha do seed (dados fictícios), não um bug.

### 3.3 A solução: um seed opcional

Não alterei o seed oficial. Criei [`database/seeds/cenarios.sql`](database/seeds/cenarios.sql), que usa o mesmo schema e é trocado por uma variável (`SEED_FILE`, seção 1.1). O padrão continua sendo o oficial e a aplicação funciona com qualquer um dos dois.

O que ele traz:

- **120 pacientes**, com gênero coerente com o primeiro nome e crianças internadas na Pediatria;
- **61 internações ativas**, montadas por perfil (normal, atenção, crítico, exame pendente há 12–24h e exame atrasado);
- **118 internações encerradas**, para o histórico e o tempo médio;
- todo valor aleatório calculado **por linha**, com datas relativas a `NOW()`, para o cenário ficar "ao vivo".

| Departamento | Situação montada | Regra exercitada | Farol |
|---|---|---|---|
| Pronto Socorro | 17 de 20 leitos (85%), 2 pacientes em atenção | Ocupação entre 80% e 90%, sinais vitais | 🟡 Atenção |
| Clínica Médica | 15 internados para 3 enfermeiros (5 por enfermeiro), 1 exame pendente há mais de 12h | Carga da equipe, exame pendente | 🟡 Atenção |
| UTI | 14 de 15 leitos (93%), 3 críticos, 4 em atenção, 1 exame atrasado | Ocupação acima de 90%, sinais vitais, exame atrasado | 🔴 Crítico |
| Pediatria | 6 de 20 leitos, todos estáveis | Tudo dentro da faixa | 🟢 Normal |
| Cirurgia | 9 de 15 leitos, 1 exame atrasado | Exame atrasado | 🔴 Crítico |
| **Hospital** | Pior caso entre os departamentos | Cascata | 🔴 Crítico |

**Comportamento esperado com o tempo:** as datas são relativas ao momento em que o banco é criado, e o farol olha há quanto tempo cada exame está pendente. Com o banco no ar por horas, os exames pendentes "envelhecem": pacientes e departamentos sobem de verde para amarelo e de amarelo para vermelho, como num hospital de verdade. Para voltar ao estado da tabela acima, basta recriar o banco (`docker compose down -v && docker compose up --build`).

O seed de cenários também cria um índice composto para a consulta mais usada (seção 4.3).

---

## 4. Decisões técnicas e trade-offs

### 4.1 Stack

| Camada | Escolha | Por quê |
|---|---|---|
| API | Node 24, Express 5, TypeScript | Express 5 trata erros de rotas `async` sozinho; TypeScript nas duas pontas |
| Validação | Zod (mensagens em português) | Valida query e params de todas as rotas e o ambiente na subida |
| Banco | `pg` com SQL puro e parametrizado | API só de leitura, baseada em agregações ([ADR 0001](docs/adr/0001-sql-puro-com-pg.md)) |
| Front | Vite, React 19, TypeScript | Build rápido e tipagem do contrato da API |
| Rotas | React Router, com telas carregadas sob demanda | URL por tela (link compartilhável, botão voltar); o Recharts só é baixado nas telas com gráfico |
| Dados no front | TanStack Query | Cache, loading/erro, atualização a cada 60s e página anterior visível enquanto a próxima carrega |
| Gráficos | Recharts | Barras de ocupação e série temporal com faixa normal sombreada |
| Estilo | CSS Modules e tokens CSS | Cores do farol definidas uma vez (com modo escuro), sem biblioteca de UI |
| Servidor do front | nginx | Serve o build, faz o fallback da SPA e repassa `/api` para a API: uma origem só, sem CORS |
| Testes | Jest + Supertest (API), Vitest (front) | |

### 4.2 Arquitetura e qualidade de código

```
api/src/
  routes/     HTTP: valida a entrada (Zod) e chama o serviço
  services/   regras de montagem das respostas (funções puras)
  data/       repositório: só SQL
  farol/      domínio do farol: classificadores e limites (thresholds.ts)
  http/       erros e formato padrão de resposta de erro
web/src/
  api/        cliente HTTP, tipos do contrato e hooks de consulta
  pages/      telas
  components/ blocos visuais reutilizáveis
```

- **A cor do farol é calculada no backend**, em cascata (internação → departamento → hospital), pelo pior caso. O front só exibe, então as telas nunca divergem.
- **Os limites ficam em um único arquivo** ([`api/src/farol/thresholds.ts`](api/src/farol/thresholds.ts)). Os sinais vitais usam faixas inspiradas no NEWS2.
  - Exame pendente: amarelo a partir de 12h, vermelho acima de 24h.
  - Ocupação: amarelo a partir de 80%, vermelho acima de 90%.
  - Carga da equipe: amarelo acima de 4 pacientes por enfermeiro, vermelho acima de 6.
- **Os serviços são funções puras**, testáveis sem banco. O repositório é injetado em `createApp`, então os testes de rota usam um repositório falso.
- **Os erros seguem um formato único:** `{ error: { code, message, details } }`, com 400 (validação), 404 e 500 (com log). O pool do Postgres trata erros de conexões ociosas sem derrubar a API.
- **A configuração vem do ambiente e é validada com Zod:** a API não sobe sem `DATABASE_URL` e não há credenciais no código.

**Por que não fiz uma refatoração de "clean architecture".** Pedi uma revisão do código contra as boas práticas avaliadas (camadas, tipagem, nomes, duplicação, erros, configuração). A estrutura acima já é o que uma refatoração de clean code entregaria. Ir além (interfaces de casos de uso, injeção de dependência por classes, entidades de domínio) seria complexidade sem retorno para uma API só de leitura com seis endpoints. A revisão encontrou lacunas pontuais, que corrigi em commits separados:

- tratamento de erro do pool;
- duplicações pequenas;
- default de `DATABASE_URL` com senha;
- falta de testes do SQL e do front;
- falta de lint na API.

### 4.3 Consultas SQL e performance

- **Agregações separadas antes do JOIN:** leitos ocupados e equipe são contados em CTEs separadas, para uma contagem não multiplicar a outra.
- **Última medição sem N+1:** um `LEFT JOIN LATERAL ... ORDER BY measured_at DESC LIMIT 1` por internação ativa, numa consulta só.
- **Paginação ordenada por gravidade** ([ADR 0002](docs/adr/0002-paginacao-por-gravidade.md)). A cor é calculada em TypeScript, então o SQL não consegue ordenar por ela.
  - As internações ativas são limitadas pelo número de leitos: vêm todas, são classificadas e ordenadas em memória.
  - As encerradas (sempre neutras, no fim da lista) são paginadas no banco.
  - Assim um paciente crítico nunca fica escondido na página 3.
- **Filtros parametrizados:** a busca por nome escapa `%` e `_`.
- **Período pela data de entrada** ([ADR 0003](docs/adr/0003-periodo-pela-data-de-entrada.md)). Considera o dia no horário de Brasília, convertendo para UTC no parâmetro (não na coluna) para não impedir índice.
- **Índice composto** `vital_signs (admission_id, measured_at DESC)`, só no seed de cenários (o schema oficial não foi alterado).
  - **Antes:** o Postgres percorria o índice por data, descartando cerca de 30 medições de outras internações a cada busca: 1.680 leituras de página e 0,85 ms.
  - **Depois:** vai direto à primeira medição da internação: 183 leituras de página e cerca de 0,1 a 0,3 ms.
  - Com esse volume a diferença não aparece para o usuário. O ganho é o custo parar de crescer com o histórico.

### 4.4 Testes

| Suíte | Quantidade | O que cobre |
|---|---|---|
| API, unitários | 120 | Regras do farol (100% das linhas), serviços, rotas (validação, 404, formato de erro), configuração |
| API, integração | 30 | Repositório contra Postgres real: filtros, paginação, última medição, funil de exames, tempo médio, detalhe |
| Front, unitários | 16 | Filtros na URL, cliente HTTP (erros da API, resposta não JSON, falha de rede), formatação |

Para ser preciso sobre o processo:

- os testes unitários foram escritos **junto** com o código, não antes;
- os de integração começaram como testes de **caracterização** (fixam o comportamento que já existia). Para confirmar que pegam erros, quebrei o SQL de propósito duas vezes, e eles falharam;
- a correção do fuso no filtro de período foi feita em **TDD**: os testes foram escritos antes, falharam com a regra antiga e passaram com a nova.

### 4.5 Docker

- Builds multi-stage. A imagem final da API tem só o JS compilado e as dependências de produção, e roda com usuário não root.
- Healthchecks no banco e na API, com `depends_on: condition: service_healthy` na ordem banco → API → front.
- nginx com cache longo para os arquivos com hash e `no-cache` para o `index.html`.

### 4.6 Ajustes em relação à minha especificação de design

A especificação em [`docs/spec/`](docs/spec/farol-hospitalar-spec-frontend.md) foi escrita antes do código. Durante o desenvolvimento, alguns pontos mudaram ao encontrar os dados e o schema reais. Nenhum desses ajustes afeta os requisitos do desafio.

| Na minha spec | Na entrega | Por quê |
|---|---|---|
| Rotas `/admissoes` | `/internacoes` | "Internação" é o termo do glossário, usado igual na tela, na API e na documentação |
| Cores calculadas em views SQL | Classificador em TypeScript | Regras testáveis unitariamente e limites em um único arquivo; o SQL só traz as métricas |
| Variação ▲▼ nos KPIs | Não implementada | O banco não guarda histórico de ocupação para comparar períodos |
| Eventos de transferência na linha do tempo | Não implementados | O schema não registra transferências |
| `id` de departamento como texto (`"uti"`) | Número | É a chave real do banco |

---

## 5. O que eu faria com mais tempo

### Produto

Ideias que surgiram pensando nas dores do gestor:

- **Análise dos exames mais atrasados:** quais tipos de exame e quais departamentos mais atrasam, para atacar o gargalo na causa, não caso a caso.
- **Notificação ao médico quando o exame fica pronto:** encurta o tempo entre o resultado e a decisão clínica.
- **NPS na alta:** pesquisa enviada ao paciente no momento da alta, para medir a experiência por departamento.
- **Acompanhamento pós-alta:** contato com o paciente depois da alta, para identificar complicações e reinternações cedo.
- **Análise dos dias mais cheios:** picos de ocupação por dia da semana e época do ano, para planejar escala e contratação de equipe. Depende do histórico de indicadores (abaixo).
- **Dimensionamento por departamento:** relação entre equipe, leitos e carga real, para avaliar a viabilidade de cada departamento.

Algumas delas (NPS, pós-alta, notificações) precisam de dados que o schema atual não tem, como contato do paciente e respostas de pesquisa.

### Técnico

- **Tipos compartilhados entre API e front** (pacote comum ou contrato OpenAPI). Hoje [`web/src/api/types.ts`](web/src/api/types.ts) é uma cópia mantida à mão.
- **Colunas `TIMESTAMPTZ`** no lugar de `TIMESTAMP` sem fuso. Isso elimina a dependência do fuso do processo descrita na seção 1.
- **Histórico de indicadores** (um snapshot periódico da ocupação) para mostrar a variação ▲▼ e tendências. É a base da análise dos dias mais cheios.
- **Validação clínica dos limites:** os limites do farol foram definidos por mim, a partir do NEWS2 e de valores de referência; num hospital real, precisariam ser revisados e aprovados pela equipe médica.
- **Limites configuráveis pelo hospital:** levar os limites do código para o banco, com uma tela de administração, para ajustar sem novo deploy e até por departamento.
- **Testes de ponta a ponta** (Playwright) nos fluxos principais e CI rodando lint, testes e build a cada push.
- **Autenticação e perfis**, que ficaram fora do escopo na especificação.
- **Observabilidade:** logs estruturados com id da requisição e métricas de tempo das consultas.

---

## 6. Rodar em nuvem

O mesmo `docker-compose.yml` sobe em qualquer máquina virtual com Docker (AWS EC2, GCP Compute Engine, Azure VM, DigitalOcean):

```bash
git clone <este repositório> && cd teste_dev_fullstack
cp .env.example .env        # trocar POSTGRES_PASSWORD
docker compose up -d --build
```

Cuidados para um ambiente exposto:

- **Abrir só a porta do front** (3000, ou 80/443 atrás de um proxy com HTTPS). O nginx já repassa `/api` internamente, então a API, o Postgres e o Adminer não precisam ficar públicos.
- **Não subir o Adminer em produção.**
- **Trocar a senha padrão do banco.**

Para algo gerenciado, o caminho natural é publicar as imagens da API e do front num registry (Cloud Run, ECS ou Azure Container Apps) e usar um Postgres gerenciado (Cloud SQL, RDS), passando `DATABASE_URL` por variável de ambiente.

---

## 7. Limitações conhecidas

- **Dados do seed original:** com ele, o farol mostra pouca variação (seção 3). O seed de cenários existe para isso.
- **Seed de cenários envelhece:** é o comportamento esperado (seção 3.3). Recriar o banco volta ao estado inicial.
- **API fora do Docker:** os horários aparecem deslocados se o processo não estiver em UTC. Use `TZ=UTC` (seção 1.3).
