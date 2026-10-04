# Filtro de período pela data de entrada

O filtro De/Até da lista de internações considera a **data de entrada**: `from <= admission_date < to + 1 dia`.

A primeira versão usava **sobreposição** (a internação esteve ativa em algum momento do período), pensando na pergunta "quem esteve internado nessa semana?". Ao testar com dados reais, o resultado se mostrou contraintuitivo: filtrando 01/10 a 04/10 com a situação "Internado", vinham **todas** as 61 internações ativas, inclusive as de 23/09, porque quem está internado hoje "esteve internado" em qualquer período recente. Quem lê "De/Até" numa lista espera a data de entrada (10 internações nesse exemplo). Mudamos para a data de entrada e deixamos o rótulo explícito ("Entrada de / até"). A pergunta "quem está internado agora" continua respondida pelo filtro de situação.

## Considered Options

- **Manter a sobreposição e explicar na tela**: correta, mas exige uma dica de texto para não surpreender.
- **Oferecer os dois critérios com um seletor**: cobre as duas perguntas, mas adiciona mais um controle a uma barra de filtros já cheia.
