-- ============================================================================
-- Seed de CENÁRIOS do Farol Hospitalar (opcional)
--
-- Substitui database/init/02_seed.sql quando o compose é iniciado com
--   SEED_FILE=seeds/cenarios.sql
-- (veja ENTREGA.md). O schema (01_schema.sql) é o mesmo.
--
-- Por que existe: no seed original, subconsultas LATERAL que não referenciam a
-- linha externa são executadas uma única vez pelo PostgreSQL, então o "sorteio"
-- se repete em todas as linhas (todas as internações na Cirurgia, todos os
-- exames concluídos, mesma quantidade de exames e de medições por internação).
-- Aqui todo valor aleatório é calculado por linha, e as internações ativas são
-- montadas para exercitar cada regra do Farol.
--
-- Datas são relativas a NOW() na criação do banco: o cenário fica "ao vivo".
-- ============================================================================

SELECT setseed(0.42);

-- ----------------------------------------------------------------------------
-- Departamentos (iguais ao seed original)
-- ----------------------------------------------------------------------------
INSERT INTO departments (name, total_beds) VALUES
    ('Pronto Socorro', 20),
    ('Clínica Médica', 30),
    ('UTI', 15),
    ('Pediatria', 20),
    ('Cirurgia', 15);

-- ----------------------------------------------------------------------------
-- Equipe: o número de enfermeiros define a carga (internações por enfermeiro)
-- ----------------------------------------------------------------------------
INSERT INTO staff (name, role, department_id) VALUES
    -- Pronto Socorro: 17 internados / 5 enfermeiros = 3,4
    ('Ana Beatriz Souza', 'médico', 1), ('Carlos Eduardo Lima', 'médico', 1), ('Paulo Roberto Mendes', 'médico', 1),
    ('Patrícia Gomes', 'enfermeiro', 1), ('Rodrigo Nascimento', 'enfermeiro', 1), ('Simone Andrade', 'enfermeiro', 1),
    ('Tatiane Rocha', 'enfermeiro', 1), ('Marcos Vinícius Prado', 'enfermeiro', 1),
    -- Clínica Médica: 15 internados / 3 enfermeiros = 5 (atenção)
    ('Rafael Santos Alves', 'médico', 2), ('Fernanda Oliveira', 'médico', 2),
    ('Juliana Costa', 'enfermeiro', 2), ('Bruno Henrique Dias', 'enfermeiro', 2), ('Aline Barbosa', 'enfermeiro', 2),
    -- UTI: 14 internados / 4 enfermeiros = 3,5
    ('Marcelo Teixeira', 'médico', 3), ('Camila Rodrigues', 'médico', 3), ('Ricardo Fontes', 'médico', 3),
    ('Larissa Martins', 'enfermeiro', 3), ('Débora Campos', 'enfermeiro', 3), ('Fábio Moreira', 'enfermeiro', 3),
    ('Gisele Antunes', 'enfermeiro', 3),
    -- Pediatria: 6 internados / 2 enfermeiros = 3
    ('Beatriz Fernandes', 'médico', 4), ('Thiago Pereira', 'médico', 4),
    ('Gabriela Nunes', 'enfermeiro', 4), ('Priscila Matos', 'enfermeiro', 4),
    -- Cirurgia: 9 internados / 3 enfermeiros = 3
    ('Eduardo Carvalho', 'médico', 5), ('Leonardo Bastos', 'médico', 5),
    ('Renata Almeida', 'enfermeiro', 5), ('Vanessa Lacerda', 'enfermeiro', 5), ('Hugo Siqueira', 'enfermeiro', 5);

-- ----------------------------------------------------------------------------
-- Pacientes (120): gênero coerente com o primeiro nome.
-- Crianças: 47–52 (internadas agora na Pediatria) e 111–120 (histórico da Pediatria).
-- ----------------------------------------------------------------------------
INSERT INTO patients (name, birth_date, gender, document)
SELECT
    first_name || ' ' || surnames[1 + (i * 7) % 20] || ' ' || surnames[1 + (i * 13 + i / 40) % 20],
    CASE WHEN i BETWEEN 47 AND 52 OR i BETWEEN 111 AND 120
         THEN CURRENT_DATE - make_interval(days => (365 + floor(random() * 365 * 13))::int)
         ELSE CURRENT_DATE - make_interval(days => (365 * 18 + floor(random() * 365 * 72))::int)
    END,
    gender,
    'PAC-' || LPAD(i::text, 4, '0')
FROM generate_series(1, 120) AS g(i)
CROSS JOIN LATERAL (
    SELECT
        CASE WHEN g.i % 2 = 1 THEN 'F' ELSE 'M' END AS gender,
        CASE WHEN g.i % 2 = 1
             THEN (ARRAY['Ana', 'Maria', 'Beatriz', 'Isabela', 'Larissa', 'Camila', 'Letícia', 'Sophia', 'Manuela', 'Alice',
                         'Valentina', 'Helena', 'Laura', 'Yasmin', 'Lívia', 'Júlia', 'Mariana', 'Clara', 'Cecília', 'Luana'])[1 + ((g.i - 1) / 2) % 20]
             ELSE (ARRAY['João', 'Pedro', 'Lucas', 'Gustavo', 'Matheus', 'Rafael', 'Felipe', 'Daniel', 'Vinícius', 'Gabriel',
                         'Enzo', 'Arthur', 'Davi', 'Bernardo', 'Theo', 'Miguel', 'Heitor', 'Samuel', 'Lorenzo', 'Benício'])[1 + ((g.i - 1) / 2) % 20]
        END AS first_name,
        ARRAY['Silva', 'Souza', 'Lima', 'Ferreira', 'Rocha', 'Almeida', 'Costa', 'Melo', 'Dias', 'Fernandes',
              'Barbosa', 'Ramos', 'Carvalho', 'Pinto', 'Araújo', 'Cardoso', 'Teixeira', 'Gomes', 'Martins', 'Barros'] AS surnames
) AS n
ORDER BY i;

-- ----------------------------------------------------------------------------
-- Internações ATIVAS montadas por cenário.
-- Perfis: normal | atencao | critico | exame_12h (pendente 12–24h) | exame_atrasado (> 24h)
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE cenario_ativo AS
SELECT
    v.department_id,
    v.perfil,
    row_number() OVER (ORDER BY v.department_id, v.ordem, gs.n)                AS patient_id,
    row_number() OVER (PARTITION BY v.department_id ORDER BY v.ordem, gs.n)    AS k
FROM (VALUES
    (1, 1, 'atencao', 2), (1, 2, 'normal', 15),                                -- PS: 85% de ocupação
    (2, 1, 'exame_12h', 1), (2, 2, 'normal', 14),                              -- Clínica: carga da equipe
    (3, 1, 'critico', 3), (3, 2, 'atencao', 4), (3, 3, 'exame_atrasado', 1), (3, 4, 'normal', 6), -- UTI: 93%
    (4, 1, 'normal', 6),                                                       -- Pediatria: tudo OK
    (5, 1, 'exame_atrasado', 1), (5, 2, 'normal', 8)                           -- Cirurgia: exame atrasado
) AS v(department_id, ordem, perfil, quantidade)
CROSS JOIN LATERAL generate_series(1, v.quantidade) AS gs(n);

-- Leitos sorteados sem repetição dentro de cada departamento.
CREATE TEMP TABLE leito_sorteado AS
SELECT d.id AS department_id, b.bed,
       row_number() OVER (PARTITION BY d.id ORDER BY random()) AS k
FROM departments d
CROSS JOIN LATERAL generate_series(1, d.total_beds) AS b(bed);

INSERT INTO admissions (patient_id, department_id, attending_staff_id, bed_number, admission_date, discharge_date, status, diagnosis)
SELECT
    c.patient_id,
    c.department_id,
    doc.id,
    l.bed,
    -- Perfis de exame precisam de pelo menos 3 dias de internação (exame pedido há até 40h).
    NOW() - make_interval(hours => CASE WHEN c.perfil LIKE 'exame%' THEN 72 + floor(random() * 240)::int
                                        ELSE 10 + floor(random() * 470)::int END),
    NULL,
    'internado',
    (ARRAY['Pneumonia', 'Infarto agudo do miocárdio', 'Fratura de fêmur', 'Apendicite aguda', 'AVC isquêmico',
           'Insuficiência renal aguda', 'Covid-19', 'Bronquiolite', 'Dengue', 'Sepse', 'Pós-operatório',
           'Hipertensão descompensada', 'Diabetes descompensada', 'Dor abdominal a esclarecer'])[1 + floor(random() * 14)::int]
FROM cenario_ativo c
JOIN leito_sorteado l ON l.department_id = c.department_id AND l.k = c.k
CROSS JOIN LATERAL (
    -- Correlacionada com a linha (c.k): cada internação sorteia seu médico.
    SELECT id FROM staff s
    WHERE s.department_id = c.department_id AND s.role = 'médico'
    ORDER BY random() + c.k * 0
    LIMIT 1
) AS doc
ORDER BY c.patient_id;

-- ----------------------------------------------------------------------------
-- Internações ENCERRADAS (histórico): pacientes 62–120, duas cada, em janelas
-- separadas para não se sobreporem. Crianças vão para a Pediatria.
-- ----------------------------------------------------------------------------
INSERT INTO admissions (patient_id, department_id, attending_staff_id, bed_number, admission_date, discharge_date, status, diagnosis)
SELECT
    h.patient_id,
    h.department_id,
    doc.id,
    1 + floor(random() * d.total_beds)::int,
    h.admission_date,
    LEAST(h.admission_date + make_interval(hours => 24 + floor(random() * 216)::int), NOW() - INTERVAL '2 hours'),
    CASE WHEN random() < 0.85 THEN 'alta' ELSE 'obito' END,
    (ARRAY['Pneumonia', 'Infarto agudo do miocárdio', 'Fratura de fêmur', 'Apendicite aguda', 'AVC isquêmico',
           'Insuficiência renal aguda', 'Covid-19', 'Bronquiolite', 'Dengue', 'Sepse', 'Pós-operatório',
           'Hipertensão descompensada', 'Diabetes descompensada', 'Dor abdominal a esclarecer'])[1 + floor(random() * 14)::int]
FROM (
    SELECT
        p.id AS patient_id,
        slot.s,
        CASE WHEN p.id >= 111 THEN 4 ELSE (ARRAY[1, 2, 3, 5])[1 + floor(random() * 4)::int] END AS department_id,
        NOW() - make_interval(days => 5 + slot.s * 45 + floor(random() * 35)::int, hours => floor(random() * 24)::int) AS admission_date
    FROM patients p
    CROSS JOIN generate_series(0, 1) AS slot(s)
    WHERE p.id BETWEEN 62 AND 120
) AS h
JOIN departments d ON d.id = h.department_id
CROSS JOIN LATERAL (
    SELECT id FROM staff s
    WHERE s.department_id = h.department_id AND s.role = 'médico'
    ORDER BY random() + h.patient_id * 0 + h.s * 0
    LIMIT 1
) AS doc
ORDER BY h.admission_date;

-- ----------------------------------------------------------------------------
-- Sinais vitais das ATIVAS: a cada 6h desde a entrada até agora. A última
-- medição segue o perfil do cenário; as anteriores ficam na faixa normal.
-- ----------------------------------------------------------------------------
INSERT INTO vital_signs (admission_id, measured_at, heart_rate, systolic_pressure, diastolic_pressure, temperature, oxygen_saturation)
SELECT
    a.id,
    a.admission_date + make_interval(hours => gs.i * 6),
    CASE WHEN gs.i = pts.n AND c.perfil = 'atencao' AND c.k % 3 = 0 THEN 104 + floor(random() * 17)::int
         WHEN gs.i = pts.n AND c.perfil = 'critico' AND c.k % 3 = 1 THEN 132 + floor(random() * 14)::int
         ELSE 68 + floor(random() * 25)::int END,
    CASE WHEN gs.i = pts.n AND c.perfil = 'critico' AND c.k % 3 = 2 THEN 82 + floor(random() * 8)::int
         ELSE 114 + floor(random() * 26)::int END,
    65 + floor(random() * 20)::int,
    CASE WHEN gs.i = pts.n AND c.perfil = 'atencao' AND c.k % 3 = 2 THEN round((38.2 + random() * 0.7)::numeric, 1)
         ELSE round((36.3 + random() * 1.2)::numeric, 1) END,
    CASE WHEN gs.i = pts.n AND c.perfil = 'atencao' AND c.k % 3 = 1 THEN 92 + floor(random() * 4)::int
         WHEN gs.i = pts.n AND c.perfil = 'critico' AND c.k % 3 = 0 THEN 85 + floor(random() * 5)::int
         ELSE 96 + floor(random() * 4)::int END
FROM admissions a
JOIN cenario_ativo c ON c.patient_id = a.patient_id
CROSS JOIN LATERAL (SELECT floor(extract(epoch FROM NOW() - a.admission_date) / 21600)::int AS n) AS pts
CROSS JOIN LATERAL generate_series(0, pts.n) AS gs(i)
WHERE a.status = 'internado';

-- ----------------------------------------------------------------------------
-- Sinais vitais do HISTÓRICO: ~70% das encerradas, até 12 medições dentro da
-- internação, com alguns valores fora da faixa (aparecem como alertas).
-- ----------------------------------------------------------------------------
INSERT INTO vital_signs (admission_id, measured_at, heart_rate, systolic_pressure, diastolic_pressure, temperature, oxygen_saturation)
SELECT
    h.id,
    h.admission_date + make_interval(hours => gs.i * 6),
    60 + floor(random() * 55)::int,
    95 + floor(random() * 55)::int,
    60 + floor(random() * 30)::int,
    round((35.8 + random() * 3)::numeric, 1),
    90 + floor(random() * 10)::int
FROM (
    SELECT a.id, a.admission_date,
           LEAST(floor(extract(epoch FROM a.discharge_date - a.admission_date) / 21600)::int, 11) AS n
    FROM admissions a
    WHERE a.status <> 'internado' AND random() < 0.7
) AS h
CROSS JOIN LATERAL generate_series(0, h.n) AS gs(i);

-- ----------------------------------------------------------------------------
-- Exames
-- ----------------------------------------------------------------------------

-- Concluídos: 1 a 3 por internação, dentro do período (ativas: até 2h atrás).
INSERT INTO exams (admission_id, exam_type, requested_at, status, result_at, result_value)
SELECT
    e.id,
    (ARRAY['Hemograma completo', 'Raio-X de tórax', 'Tomografia computadorizada', 'Ressonância magnética', 'Glicemia',
           'Eletrocardiograma', 'Exame de urina', 'Gasometria arterial', 'PCR (proteína C reativa)', 'Ureia e creatinina'])[1 + floor(random() * 10)::int],
    e.requested_at,
    'concluido',
    e.requested_at + (e.fim - e.requested_at) * (0.1 + random() * 0.5),
    (ARRAY['Normal', 'Alterado', 'Dentro da referência', 'Levemente alterado', 'Requer acompanhamento'])[1 + floor(random() * 5)::int]
FROM (
    SELECT a.id, gs.n,
           COALESCE(a.discharge_date, NOW() - INTERVAL '2 hours') AS fim,
           a.admission_date + (COALESCE(a.discharge_date, NOW() - INTERVAL '2 hours') - a.admission_date) * (random() * 0.6) AS requested_at
    FROM admissions a
    CROSS JOIN LATERAL (SELECT 1 + floor(random() * 3)::int + a.id * 0 AS total) AS t
    CROSS JOIN LATERAL generate_series(1, t.total) AS gs(n)
) AS e;

-- Pendentes que acionam o Farol (ativas por perfil) e alguns recentes, ainda no prazo.
INSERT INTO exams (admission_id, exam_type, requested_at, status, result_at, result_value)
SELECT
    a.id,
    CASE c.perfil WHEN 'exame_atrasado' THEN 'Tomografia computadorizada'
                  WHEN 'exame_12h' THEN 'Ressonância magnética'
                  ELSE 'Hemograma completo' END,
    NOW() - make_interval(hours => CASE c.perfil WHEN 'exame_atrasado' THEN 28 + floor(random() * 12)::int
                                                 WHEN 'exame_12h' THEN 14 + floor(random() * 6)::int
                                                 ELSE 1 + floor(random() * 5)::int END),
    CASE WHEN c.perfil = 'exame_atrasado' THEN 'solicitado' ELSE 'em_andamento' END,
    NULL,
    NULL
FROM admissions a
JOIN cenario_ativo c ON c.patient_id = a.patient_id
WHERE a.status = 'internado'
  AND (c.perfil IN ('exame_atrasado', 'exame_12h') OR (c.perfil = 'normal' AND c.k % 4 = 0));

-- ----------------------------------------------------------------------------
-- Índice para "última medição de cada internação" (LATERAL ... ORDER BY
-- measured_at DESC LIMIT 1). Os índices separados do schema fazem o Postgres
-- varrer as medições por data descartando as de outras internações; com o
-- composto ele lê direto a primeira linha da internação. Criado depois dos
-- INSERTs (mais rápido que manter o índice durante a carga). Ver ENTREGA.md.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vitals_admission_measured_at
    ON vital_signs (admission_id, measured_at DESC);
ANALYZE vital_signs;
