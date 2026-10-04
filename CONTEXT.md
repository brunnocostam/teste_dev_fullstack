# Farol Hospitalar

Painel para o gestor hospitalar acompanhar a situação do hospital "Vida Plena" e saber, em poucos segundos, se há problema, onde está e quem está envolvido.

## Language

### Internações

**Internação**:
Período em que um paciente ocupa um leito de um departamento, da entrada até a alta ou o óbito.
_Avoid_: Admissão, atendimento

**Situação da internação**:
Estado administrativo da internação: internado, alta ou óbito.
_Avoid_: Status (sozinho, ambíguo com o Farol)

**Profissional responsável**:
Médico ou enfermeiro vinculado a uma internação como responsável por ela.
_Avoid_: Médico responsável

**Tempo de internação**:
Dias entre a entrada e a alta ou óbito; o tempo médio considera só internações encerradas.
_Avoid_: Permanência, LOS

**Exame pendente**:
Exame solicitado ainda não concluído (solicitado ou em andamento).
_Avoid_: Exame aberto

**Exame atrasado**:
Exame pendente há mais de 24 horas desde a solicitação.
_Avoid_: Exame vencido

### Capacidade

**Ocupação**:
Proporção dos leitos de um departamento (ou do hospital) ocupados por internações ativas.
_Avoid_: Lotação

**Carga da equipe**:
Número de internações ativas por enfermeiro do quadro do departamento (não por plantão).
_Avoid_: Pacientes por profissional

### Farol

**Farol**:
Classificação de gravidade de uma internação, departamento ou do hospital: verde (normal), amarelo (atenção), vermelho (crítico) ou neutro (internação encerrada).
_Avoid_: Semáforo, alerta, status (sozinho)
