import type { ActiveAdmissionRow, DepartmentCapacityRow, ExamFunnelRow } from '../data/repository';
import {
  classifyAdmission,
  classifyDepartment,
  classifyHospital,
  severity,
  type FarolColor,
  type FarolResult,
} from '../farol';

export interface ClassifiedAdmission {
  id: number;
  patientName: string;
  bed: number;
  admittedAt: Date;
  farol: FarolColor;
  farolReason: string | null;
}

export interface DepartmentSnapshot extends DepartmentCapacityRow {
  occupancyPct: number;
  farol: FarolColor;
  farolReason: string | null;
  admissions: ClassifiedAdmission[];
}

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function classify(row: ActiveAdmissionRow): FarolResult {
  return classifyAdmission({
    situation: 'internado',
    latestVitals: {
      heartRate: row.heartRate,
      oxygenSaturation: row.oxygenSaturation,
      temperature: row.temperature,
      systolicPressure: row.systolicPressure,
    },
    pendingExamHours: row.pendingExamHours,
  });
}

/** Mais grave primeiro; empate pela internação mais antiga. */
function byGravity(a: ClassifiedAdmission, b: ClassifiedAdmission): number {
  return severity(b.farol) - severity(a.farol) || a.admittedAt.getTime() - b.admittedAt.getTime();
}

/** Junta capacidade e internações ativas e aplica o farol em cascata (internação → departamento). */
export function buildSnapshots(
  capacity: DepartmentCapacityRow[],
  activeAdmissions: ActiveAdmissionRow[],
): DepartmentSnapshot[] {
  return capacity.map((dept) => {
    const admissions = activeAdmissions
      .filter((a) => a.departmentId === dept.id)
      .map((a) => {
        const { color, reason } = classify(a);
        return { id: a.id, patientName: a.patientName, bed: a.bed, admittedAt: a.admittedAt, farol: color, farolReason: reason };
      })
      .sort(byGravity);

    const { color, reason } = classifyDepartment({
      totalBeds: dept.totalBeds,
      occupiedBeds: dept.occupiedBeds,
      nurses: dept.nurses,
      admissionColors: admissions.map((a) => a.farol),
    });

    return {
      ...dept,
      occupancyPct: percent(dept.occupiedBeds, dept.totalBeds),
      farol: color,
      farolReason: reason,
      admissions,
    };
  });
}

/** Mais grave primeiro; empate pela maior ocupação e depois pelo nome. */
function departmentsByGravity(a: DepartmentSnapshot, b: DepartmentSnapshot): number {
  return severity(b.farol) - severity(a.farol) || b.occupancyPct - a.occupancyPct || a.name.localeCompare(b.name, 'pt-BR');
}

export function toDepartmentList(snapshots: DepartmentSnapshot[]) {
  return snapshots.map(({ id, name, farol }) => ({ id, name, farol }));
}

export function toOverview(snapshots: DepartmentSnapshot[], exams: ExamFunnelRow, avgLengthOfStayDays: number | null) {
  const totalBeds = snapshots.reduce((sum, d) => sum + d.totalBeds, 0);
  const occupiedBeds = snapshots.reduce((sum, d) => sum + d.occupiedBeds, 0);
  const hospital = classifyHospital(snapshots.map((d) => d.farol));

  return {
    farol: hospital.color,
    farolReason: hospital.reason,
    kpis: {
      occupancyPct: percent(occupiedBeds, totalBeds),
      occupiedBeds,
      totalBeds,
      activeAdmissions: snapshots.reduce((sum, d) => sum + d.admissions.length, 0),
      avgLengthOfStayDays,
      pendingExams: exams.requested + exams.inProgress,
      lateExams: exams.late,
    },
    departments: [...snapshots].sort(departmentsByGravity).map((d) => ({
      id: d.id,
      name: d.name,
      farol: d.farol,
      farolReason: d.farolReason,
      occupancyPct: d.occupancyPct,
      occupiedBeds: d.occupiedBeds,
      totalBeds: d.totalBeds,
    })),
  };
}

export function toDepartmentDetail(snapshot: DepartmentSnapshot, exams: ExamFunnelRow) {
  const byBed = new Map(snapshot.admissions.map((a) => [a.bed, a]));
  const map = Array.from({ length: snapshot.totalBeds }, (_, i) => {
    const admission = byBed.get(i + 1);
    return { bed: i + 1, admissionId: admission?.id ?? null, farol: admission?.farol ?? null };
  });

  return {
    id: snapshot.id,
    name: snapshot.name,
    farol: snapshot.farol,
    farolReason: snapshot.farolReason,
    beds: {
      total: snapshot.totalBeds,
      occupied: snapshot.occupiedBeds,
      free: Math.max(snapshot.totalBeds - snapshot.occupiedBeds, 0),
      map,
    },
    staff: {
      doctors: snapshot.doctors,
      nurses: snapshot.nurses,
      patientsPerNurse:
        snapshot.nurses > 0 ? Math.round((snapshot.admissions.length / snapshot.nurses) * 10) / 10 : null,
    },
    exams,
    priorityAdmissions: snapshot.admissions
      .filter((a) => a.farol !== 'green')
      .map(({ id, patientName, bed, farol, farolReason }) => ({ id, patientName, bed, farol, farolReason })),
  };
}
