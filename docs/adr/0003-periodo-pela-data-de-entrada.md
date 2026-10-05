# Filtro de período pela data de entrada

O filtro De/Até da lista de internações considera a **data de entrada**: `from <= admission_date < to + 1 dia`.

A primeira versão usava **sobreposição** (a internação esteve ativa em algum momento do período), pensando na pergunta "quem esteve internado nessa semana?". Ao testar com dados reais, o resultado se mostrou contraintuitivo: filtrando 01/10 a 04/10 com a situação "Internado", vinham **todas** as 61 internações ativas, inclusive as de 23/09, porque quem está internado hoje "esteve internado" em qualquer período recente. Quem lê "De/Até" numa lista espera a data de entrada (10 internações nesse exemplo). Mudamos para a data de entrada e deixamos o rótulo explícito ("Entrada de / até"). A pergunta "quem está internado agora" continua respondida pelo filtro de situação.

## Dias em horário de Brasília

O banco guarda os horários em UTC (`TIMESTAMP` sem fuso, gravado com `NOW()` de um servidor em UTC), mas o gestor escolhe os dias pensando no horário local, e a tela mostra os horários em Brasília. A primeira versão comparava a data escolhida direto com a coluna, ou seja, considerava o dia em UTC: uma internação às 22h de 01/10 em Brasília (01h de 02/10 em UTC) aparecia na tela como "01/10 22:00", mas **não** entrava no filtro de 01/10, e sim no de 02/10. Isso afetava toda entrada entre 21h e 24h.

Agora o dia escolhido é convertido para o intervalo UTC correspondente (`00:00` de Brasília → `03:00` UTC) antes de comparar. A conversão é feita no parâmetro, não na coluna, para a consulta continuar podendo usar índice em `admission_date`. O fuso fica em uma constante (`HOSPITAL_TIME_ZONE` em `api/src/data/repository.ts`). A correção foi feita com testes de integração escritos antes, que falhavam com a regra antiga.

## Considered Options

- **Manter a sobreposição e explicar na tela**: correta, mas exige uma dica de texto para não surpreender.
- **Oferecer os dois critérios com um seletor**: cobre as duas perguntas, mas adiciona mais um controle a uma barra de filtros já cheia.
