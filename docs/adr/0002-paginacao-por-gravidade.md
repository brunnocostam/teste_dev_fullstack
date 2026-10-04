# Paginação da lista de internações ordenada por gravidade

A lista de internações é ordenada pela cor do Farol, mas a cor é calculada em TypeScript (`api/src/farol`), então o SQL não consegue ordenar nem paginar por ela. Como só internações ativas têm cor (as encerradas são sempre neutras e ficam no fim) e as ativas são limitadas pelo número de leitos do hospital, a API busca todas as ativas que passam nos filtros, classifica e ordena em memória, e completa a página com as encerradas paginadas pelo banco (`LIMIT/OFFSET`, descontando as ativas do offset). Assim a ordenação vale para a lista inteira e a parte que cresce sem limite (o histórico) continua paginada no banco.

## Considered Options

- **Calcular a cor em SQL** (CASE com os limites): permitiria `ORDER BY` direto, mas duplicaria as regras do Farol em dois lugares.
- **Ordenar só dentro da página**: simples, mas um paciente crítico poderia aparecer na página 3.
