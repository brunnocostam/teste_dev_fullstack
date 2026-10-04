// Espelho do contrato da API (api/src/services). Datas chegam como string ISO 8601.

export type FarolColor = 'green' | 'yellow' | 'red' | 'neutral';
export type AdmissionSituation = 'internado' | 'alta' | 'obito';
export type VitalSign = 'heartRate' | 'oxygenSaturation' | 'temperature' | 'systolicPressure';

export interface Overview {
  farol: FarolColor;
  farolReason: string;
  kpis: {
    occupancyPct: number;
    occupiedBeds: number;
    totalBeds: number;
    activeAdmissions: number;
    avgLengthOfStayDays: number | null;
    pendingExams: number;
    lateExams: number;
  };
  departments: DepartmentSummary[];
}

export interface DepartmentSummary {
  id: number;
  name: string;
  farol: FarolColor;
  farolReason: string | null;
  occupancyPct: number;
  occupiedBeds: number;
  totalBeds: number;
}

export interface DepartmentOption {
  id: number;
  name: string;
  farol: FarolColor;
}

export interface DepartmentDetail {
  id: number;
  name: string;
  farol: FarolColor;
  farolReason: string | null;
  beds: {
    total: number;
    occupied: number;
    free: number;
    map: { bed: number; admissionId: number | null; farol: FarolColor | null }[];
  };
  staff: { doctors: number; nurses: number; patientsPerNurse: number | null };
  exams: { requested: number; inProgress: number; completed: number; late: number };
  priorityAdmissions: { id: number; patientName: string; bed: number; farol: FarolColor; farolReason: string | null }[];
}

export interface AdmissionListItem {
  id: number;
  patientName: string;
  departmentId: number;
  departmentName: string;
  bed: number;
  status: AdmissionSituation;
  farol: FarolColor;
  farolReason: string | null;
  admittedAt: string;
  dischargedAt: string | null;
  daysAdmitted: number;
}

export interface AdmissionPage {
  items: AdmissionListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdmissionListParams {
  status?: AdmissionSituation;
  departmentId?: number;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface VitalSignsReading {
  recordedAt: string;
  heartRate: number | null;
  systolicPressure: number | null;
  diastolicPressure: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
}

export type ExamStatus = 'requested' | 'in_progress' | 'completed' | 'late';

export interface AdmissionDetail {
  id: number;
  status: AdmissionSituation;
  farol: FarolColor;
  farolReason: string | null;
  bed: number;
  diagnosis: string | null;
  admittedAt: string;
  dischargedAt: string | null;
  daysAdmitted: number;
  patient: { id: number; name: string; age: number; gender: 'M' | 'F' };
  department: { id: number; name: string };
  attendingStaff: { id: number; name: string; role: string } | null;
  latestVitals: (VitalSignsReading & { farol: Partial<Record<VitalSign, FarolColor>> }) | null;
  vitals: VitalSignsReading[];
  referenceRanges: Record<VitalSign, { min: number; max: number }>;
  exams: {
    id: number;
    name: string;
    status: ExamStatus;
    requestedAt: string;
    resultAt: string | null;
    result: string | null;
    hoursPending: number | null;
  }[];
  timeline: {
    at: string;
    type: 'admission' | 'exam' | 'alert' | 'discharge' | 'death';
    label: string;
    severity: FarolColor | null;
  }[];
}
