# SQL puro com `pg` em vez de ORM

A API é somente leitura e quase todas as consultas são agregações (ocupação por departamento, último sinal vital por internação, exames por faixa de atraso), que num ORM como o Prisma acabariam em `$queryRaw`/TypedSQL de qualquer forma. Além disso, o schema já é criado pelos scripts de `database/init`, então migrations de ORM não teriam papel. Por isso usei o driver `pg` com SQL escrito à mão e parametrizado.
