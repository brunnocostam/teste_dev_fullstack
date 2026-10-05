import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import type { Db } from '../../../src/db';

const API_DIR = path.resolve(__dirname, '../../..');
const SCHEMA_FILE = path.resolve(API_DIR, '../database/init/01_schema.sql');

/**
 * URL do banco de teste: TEST_DATABASE_URL ou, na falta dela, a DATABASE_URL do
 * api/.env com o banco trocado por "hospital_test". Recusa qualquer banco cujo nome
 * não termine em "_test", porque os testes apagam todas as tabelas.
 */
export function testDatabaseUrl(): string {
  try {
    process.loadEnvFile(path.join(API_DIR, '.env'));
  } catch {
    // Sem api/.env: depende das variáveis já exportadas no ambiente.
  }

  const explicit = process.env.TEST_DATABASE_URL;
  const base = explicit ?? process.env.DATABASE_URL;
  if (!base) throw new Error('Defina TEST_DATABASE_URL ou DATABASE_URL (ver api/.env.example).');

  const url = new URL(base);
  if (!explicit) url.pathname = '/hospital_test';
  if (!url.pathname.endsWith('_test')) {
    throw new Error(`Banco de teste precisa terminar em "_test" (recebido "${url.pathname.slice(1)}").`);
  }
  return url.toString();
}

/** Cria o banco de teste se não existir e recria o schema oficial do zero. */
export async function prepareTestDatabase(): Promise<void> {
  const url = new URL(testDatabaseUrl());
  const name = url.pathname.slice(1);

  const admin = new Pool({ connectionString: Object.assign(new URL(url), { pathname: '/postgres' }).toString() });
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (rowCount === 0) await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }

  const db = new Pool({ connectionString: url.toString() });
  try {
    await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await db.query(readFileSync(SCHEMA_FILE, 'utf8'));
  } finally {
    await db.end();
  }
}

export function connectTestDatabase(): Pool {
  return new Pool({ connectionString: testDatabaseUrl(), max: 2 });
}

export async function resetData(db: Db): Promise<void> {
  await db.query('TRUNCATE vital_signs, exams, admissions, patients, staff, departments RESTART IDENTITY CASCADE');
}

// ---------------------------------------------------------------------------
// Construtores de cenário. Momentos relativos ({ hoursAgo }) são calculados pelo
// próprio Postgres com now(), no mesmo relógio que as consultas usam; momentos
// absolutos são strings 'AAAA-MM-DD HH:MM'.
// ---------------------------------------------------------------------------

export type When = { hoursAgo: number } | string;

function moment(when: When, params: unknown[]): string {
  if (typeof when === 'string') {
    params.push(when);
    return `$${params.length}::timestamp`;
  }
  params.push(when.hoursAgo);
  return `now() - $${params.length}::float8 * interval '1 hour'`;
}

async function insert(db: Db, table: string, values: Record<string, unknown>): Promise<number> {
  const params: unknown[] = [];
  const columns = Object.keys(values);
  const placeholders = columns.map((column) => {
    const value = values[column];
    if (value !== null && typeof value === 'object' && 'hoursAgo' in value) return moment(value as When, params);
    params.push(value);
    return `$${params.length}`;
  });
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    params,
  );
  return rows[0].id;
}

export function insertDepartment(db: Db, { name = 'UTI', totalBeds = 10 } = {}): Promise<number> {
  return insert(db, 'departments', { name, total_beds: totalBeds });
}

export function insertStaff(db: Db, departmentId: number, role: 'médico' | 'enfermeiro', name = 'Profissional'): Promise<number> {
  return insert(db, 'staff', { name, role, department_id: departmentId });
}

let documentSeq = 0;

export function insertPatient(
  db: Db,
  { name = 'Paciente Teste', birthDate = '1980-01-01', gender = 'F' as 'M' | 'F' } = {},
): Promise<number> {
  documentSeq += 1;
  return insert(db, 'patients', { name, birth_date: birthDate, gender, document: `DOC-${documentSeq}` });
}

export interface AdmissionInput {
  patientId: number;
  departmentId: number;
  bed?: number;
  status?: 'internado' | 'alta' | 'obito';
  admittedAt?: When;
  dischargedAt?: When | null;
  staffId?: number | null;
  diagnosis?: string | null;
}

export function insertAdmission(db: Db, input: AdmissionInput): Promise<number> {
  const status = input.status ?? 'internado';
  const dischargedAt = input.dischargedAt !== undefined ? input.dischargedAt : status === 'internado' ? null : { hoursAgo: 1 };
  return insert(db, 'admissions', {
    patient_id: input.patientId,
    department_id: input.departmentId,
    attending_staff_id: input.staffId ?? null,
    bed_number: input.bed ?? 1,
    admission_date: input.admittedAt ?? { hoursAgo: 48 },
    discharge_date: dischargedAt,
    status,
    diagnosis: input.diagnosis ?? null,
  });
}

export function insertExam(
  db: Db,
  admissionId: number,
  { status = 'concluido' as 'solicitado' | 'em_andamento' | 'concluido', requestedAt = { hoursAgo: 10 } as When, name = 'Hemograma completo' } = {},
): Promise<number> {
  const done = status === 'concluido';
  return insert(db, 'exams', {
    admission_id: admissionId,
    exam_type: name,
    requested_at: requestedAt,
    status,
    result_at: done ? (typeof requestedAt === 'string' ? requestedAt : { hoursAgo: Math.max(requestedAt.hoursAgo - 1, 0) }) : null,
    result_value: done ? 'Normal' : null,
  });
}

export interface VitalsInput {
  measuredAt: When;
  heartRate?: number | null;
  systolicPressure?: number | null;
  diastolicPressure?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
}

export function insertVitals(db: Db, admissionId: number, v: VitalsInput): Promise<number> {
  return insert(db, 'vital_signs', {
    admission_id: admissionId,
    measured_at: v.measuredAt,
    // undefined usa um valor normal; null grava "não medido".
    heart_rate: v.heartRate === undefined ? 80 : v.heartRate,
    systolic_pressure: v.systolicPressure === undefined ? 120 : v.systolicPressure,
    diastolic_pressure: v.diastolicPressure === undefined ? 80 : v.diastolicPressure,
    temperature: v.temperature === undefined ? 36.5 : v.temperature,
    oxygen_saturation: v.oxygenSaturation === undefined ? 98 : v.oxygenSaturation,
  });
}

/** Abre a conexão na suíte, zera os dados antes de cada teste e fecha no fim. */
export function useTestDatabase(): { readonly db: Pool } {
  const holder = {} as { db: Pool };
  beforeAll(() => {
    holder.db = connectTestDatabase();
  });
  beforeEach(() => resetData(holder.db));
  afterAll(() => holder.db.end());
  return holder;
}
