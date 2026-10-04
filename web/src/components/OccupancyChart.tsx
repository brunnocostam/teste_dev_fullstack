import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DepartmentSummary } from '../api/types';
import { FAROL_LABEL } from '../farol/labels';
import styles from './OccupancyChart.module.css';

const ROW_HEIGHT = 44;

interface TooltipProps {
  active?: boolean;
  payload?: { payload: DepartmentSummary }[];
}

function OccupancyTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{d.name}</p>
      <p>
        {d.occupancyPct}% · {d.occupiedBeds}/{d.totalBeds} leitos
      </p>
      <p className={styles.tooltipStatus}>{FAROL_LABEL[d.farol]}</p>
    </div>
  );
}

/** Barras horizontais de ocupação (0–100%); a cor da barra segue o farol do departamento. */
export function OccupancyChart({ departments }: { departments: DepartmentSummary[] }) {
  const summary = departments.map((d) => `${d.name}: ${d.occupancyPct}%`).join('; ');

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <h2 className={styles.title}>Ocupação por departamento</h2>
        <p className={styles.subtitle}>Percentual de leitos ocupados; a cor segue o farol do departamento.</p>
      </figcaption>
      <div className={styles.chart} role="img" aria-label={`Ocupação por departamento. ${summary}.`}>
        <ResponsiveContainer width="100%" height={departments.length * ROW_HEIGHT + 32}>
          <BarChart data={departments} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} />
            <Tooltip content={<OccupancyTooltip />} cursor={{ className: styles.cursor }} />
            <Bar dataKey="occupancyPct" barSize={20} radius={[0, 4, 4, 0]} minPointSize={2} isAnimationActive={false}>
              {departments.map((d) => (
                <Cell key={d.id} className={styles[d.farol]} />
              ))}
              <LabelList
                dataKey="occupancyPct"
                position="right"
                formatter={(v) => `${v}%`}
                className={styles.valueLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
