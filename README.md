# Teste Técnico — Desenvolvedor(a) Full Stack Pleno (Node/React)

> **Entrega:** como rodar, decisões técnicas e uso de IA estão em [ENTREGA.md](ENTREGA.md).

## Sobre o projeto

Este teste simula um cenário real de um dos nossos squads: evoluir o uso de
dados em um ambiente hospitalar, transformando dados subutilizados em
aplicações que apoiem a tomada de decisão, automatizem análises e melhorem a
eficiência operacional.

Você vai atuar como se fizesse parte de uma squad multidisciplinar
(dados + desenvolvimento), recebendo uma base de dados já modelada e
populada com dados fictícios de um hospital, e deverá construir uma API e um
dashboard web que transformem esses dados em uma aplicação funcional, com
foco em usabilidade, performance e geração de valor.

## Objetivo do teste

Construir uma aplicação **full stack** (API Node + frontend React) que
consuma o banco de dados fornecido e apresente um **dashboard de
gestão hospitalar**, permitindo visualizar e explorar informações sobre
internações, ocupação de leitos, exames e sinais vitais dos pacientes.

## O que você recebe neste repositório

- [docker-compose.yml](docker-compose.yml) — sobe um banco **PostgreSQL** já
  populado com dados fictícios e um **Adminer** (cliente web de banco de
  dados) para você explorar os dados antes de codificar.
- [database/init/01_schema.sql](database/init/01_schema.sql) — schema do
  banco (tabelas, chaves, índices).
- [database/init/02_seed.sql](database/init/02_seed.sql) — massa de dados
  fictícios (departamentos, equipe, pacientes, internações, exames e sinais
  vitais).
- [.env.example](.env.example) — variáveis de ambiente usadas pelo
  `docker-compose.yml`.

Nenhum código de aplicação é fornecido — a API e o frontend são o que você
vai construir.

## Subindo o ambiente de dados

```bash
docker compose up -d
```

Isso vai:

1. Subir o Postgres na porta `5432`, já com o schema criado e os dados
   carregados automaticamente na primeira inicialização.
2. Subir o Adminer em [http://localhost:8080](http://localhost:8080) para
   você navegar pelos dados pela interface web.

Credenciais padrão (veja [.env.example](.env.example)):

| Campo     | Valor         |
|-----------|---------------|
| Sistema   | PostgreSQL    |
| Servidor  | `db` (ou `localhost` fora do Docker) |
| Usuário   | `hospital`    |
| Senha     | `hospital123` |
| Banco     | `hospital_db` |

> Caso precise recarregar os dados do zero (ex.: após alterar o seed),
> remova o volume: `docker compose down -v && docker compose up -d`.

## Modelo de dados

| Tabela          | Descrição                                                        |
|-----------------|-------------------------------------------------------------------|
| `departments`   | Departamentos do hospital e número total de leitos                |
| `staff`         | Médicos e enfermeiros, vinculados a um departamento                |
| `patients`      | Pacientes cadastrados                                              |
| `admissions`    | Internações: paciente, departamento, leito, datas e status (`internado`, `alta`, `obito`) |
| `exams`         | Exames solicitados por internação, com status e resultado          |
| `vital_signs`   | Série temporal de sinais vitais (FC, PA, temperatura, saturação) por internação |

## O que você deve entregar

### 1. API (Node.js)

- Expor endpoints REST para suportar o dashboard, por exemplo:
  - Indicadores gerais (KPIs): taxa de ocupação de leitos, tempo médio de
    internação, quantidade de exames pendentes, internações ativas, etc.
  - Ocupação de leitos por departamento.
  - Listagem de internações com filtros (status, departamento, período).
  - Detalhe de uma internação, incluindo exames e histórico de sinais
    vitais.
- Acesso ao banco via SQL puro ou ORM/query builder de sua preferência
  (ex.: `pg`, Prisma, Knex, TypeORM).
- Tratamento de erros e validação de entrada nas rotas.

### 2. Frontend (React)

- Dashboard com indicadores (cards de KPI).
- Pelo menos um gráfico de ocupação/distribuição por departamento (ex.:
  barras ou pizza).
- Pelo menos um gráfico de série temporal (ex.: evolução dos sinais vitais
  de uma internação).
- Listagem de internações com filtros e navegação para o detalhe.
- Interface responsiva, com atenção à usabilidade (UX).

### 3. Docker

- Adicione ao [docker-compose.yml](docker-compose.yml) os serviços da sua
  API e do seu frontend (há um exemplo comentado no arquivo para te ajudar),
  de forma que **toda a aplicação suba com um único comando**:

  ```bash
  docker compose up --build
  ```

### 4. Git

- Histórico de commits organizado, com mensagens que expliquem o
  raciocínio das mudanças (não é necessário squash em um commit único).

### 5. Documentação

Inclua no repositório (pode ser num novo `ENTREGA.md` ou atualizando este
README) explicando:

- Como rodar o projeto do zero.
- Decisões técnicas e trade-offs feitos (e por quê).
- O que você faria a mais com mais tempo.
- **Quais ferramentas de IA você usou** (ex.: GitHub Copilot, Cursor, Claude
  Code) e como elas te ajudaram no processo. Uso de IA é bem-vindo e
  valorizado — queremos entender seu fluxo de trabalho com essas
  ferramentas, não apenas o resultado final.

## Requisitos técnicos obrigatórios

- Frontend com HTML, CSS, JavaScript/TypeScript e React.
- Backend com Node.js e API REST.
- Consultas SQL a um banco relacional (o Postgres fornecido).
- Containerização com Docker/Docker Compose.
- Controle de versão com Git.
- Interface responsiva.

## Diferenciais (não obrigatórios, mas valorizados)

- Uso de bibliotecas de gráficos (Chart.js, Recharts, ECharts, D3.js ou
  similares).
- TypeScript no backend e/ou frontend.
- Testes automatizados (unitários e/ou de integração).
- Cuidado com performance de queries em cima do volume de dados fornecido.
- Deploy ou instruções para rodar em nuvem.

## Critérios de avaliação

| Critério                                               | Peso  |
|---------------------------------------------------------|-------|
| Funcionalidade (endpoints e telas atendem ao pedido)     | Alto  |
| Qualidade e organização do código                        | Alto  |
| Modelagem de API e consultas SQL                         | Alto  |
| UX/UI e responsividade do dashboard                      | Médio |
| Uso correto do Docker Compose (sobe tudo com 1 comando)  | Médio |
| Organização do histórico de commits                      | Médio |
| Documentação e clareza sobre uso de IA                    | Médio |
| Diferenciais técnicos                                     | Bônus |

## Entrega

- Faça um fork deste repositório (ou envie um `.zip`/link de repositório
  próprio) com sua solução.
- Garanta que `docker compose up --build` seja suficiente para rodar tudo.
- Avise-nos quando finalizar, informando o link do repositório/arquivo e o
  tempo aproximado investido.

Qualquer dúvida sobre o enunciado ou sobre os dados fornecidos, fique à
vontade para perguntar antes de começar. Boa sorte!