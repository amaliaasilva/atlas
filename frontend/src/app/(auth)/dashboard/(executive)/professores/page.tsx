'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, unitsApi, versionsApi, assumptionsApi } from '@/lib/api';
import { useDashboardFilters } from '@/store/dashboard';
import { MetricCard, ProgressCard } from '@/components/dashboard/MetricCard';
import { BulletChartItem } from '@/components/charts/UnitsBarChart';
import { NoFiltersState, MetricCardSkeleton } from '@/components/dashboard/EmptyState';
import { Topbar } from '@/components/layout/Topbar';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils';
import { GraduationCap, Users, Target, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getRevenue } from '@/types/api';

export default function ProfessoresPage() {
  const { businessId, scenarioId } = useDashboardFilters();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard-consolidated', businessId, scenarioId],
    queryFn: () => dashboardApi.consolidated(businessId!, scenarioId!),
    enabled: !!businessId && !!scenarioId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units-prof', businessId],
    queryFn: () => unitsApi.list(businessId!),
    enabled: !!businessId,
  });

  // Busca versões de todas as unidades para obter num_personal_trainers das premissas
  const { data: unitAssumptionsData = [] } = useQuery({
    queryKey: ['units-assumptions', businessId, scenarioId],
    queryFn: async () => {
      const results = await Promise.all(
        units.map(async (unit) => {
          try {
            const versions = await versionsApi.list(unit.id, scenarioId!);
            const published = versions.find((v) => v.status === 'published');
            if (!published) return null;
            const assumptions = await assumptionsApi.values(published.id);
            const ptCount = assumptions.find((a) => a.code === 'num_personal_trainers');
            const staffCount = assumptions.find((a) => a.code === 'num_funcionarios');
            const instructorSalary = assumptions.find((a) => a.code === 'salario_educador_fisico');
            return {
              unit_id: unit.id,
              unit_name: unit.name,
              personal_trainers: ptCount?.numeric_value ?? 0,
              total_staff: staffCount?.numeric_value ?? 0,
              instructor_salary: instructorSalary?.numeric_value ?? 0,
            };
          } catch {
            return null;
          }
        }),
      );
      return results.filter(Boolean) as {
        unit_id: string;
        unit_name: string;
        personal_trainers: number;
        total_staff: number;
        instructor_salary: number;
      }[];
    },
    enabled: !!businessId && !!scenarioId && units.length > 0,
  });

  const ts = dashboard?.time_series ?? [];
  const latestPeriod = ts[ts.length - 1];

  // Totais
  const totalPT = unitAssumptionsData.reduce((acc, u) => acc + (u.personal_trainers ?? 0), 0);
  const totalStaff = unitAssumptionsData.reduce((acc, u) => acc + (u.total_staff ?? 0), 0);

  // Break-even de alunos (última período)
  const avgBreakevenStudents = ts.length > 0
    ? ts.reduce((acc, d) => acc + (d.break_even_students ?? 0), 0) / ts.length
    : 0;
  const currentStudents = latestPeriod?.active_students ?? 0;

  // Estimativa de professores necessários para breakeven:
  // Assumimos proporção de 1 professor por X alunos (industria: ~1:25 em musculação)
  const STUDENT_PER_INSTRUCTOR = 25;
  const currentInstructors = totalPT;
  const instructorsForBreakeven = Math.ceil(avgBreakevenStudents / STUDENT_PER_INSTRUCTOR);
  const gapInstructors = Math.max(instructorsForBreakeven - currentInstructors, 0);

  // Projeção simples (se alunos crescem, professores necessários crescem)
  const projectedStudents = currentStudents * 1.1; // +10% hipotético
  const projectedInstructors = Math.ceil(projectedStudents / STUDENT_PER_INSTRUCTOR);

  if (!businessId || !scenarioId) {
    return (
      <>
        <Topbar title="Dashboard — Professores" />
        <div className="p-6"><NoFiltersState /></div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard — Professores" />
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        <div>
          <h2 className="text-lg font-bold text-gray-900">Equipe de Professores e Profissionais</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Estrutura de profissionais por unidade e o que é necessário para o breakeven
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="Personal Trainers Ativos"
                value={formatNumber(totalPT)}
                trend={totalPT > 0 ? 'up' : 'neutral'}
                icon={<GraduationCap className="h-4 w-4" />}
                accentColor="indigo"
                sub={`Em ${unitAssumptionsData.length} unidades publicadas`}
                tooltip="Total de personal trainers configurados nas premissas das unidades com versão publicada"
              />
              <MetricCard
                label="Total de Funcionários"
                value={formatNumber(totalStaff)}
                trend={totalStaff > 0 ? 'up' : 'neutral'}
                icon={<Users className="h-4 w-4" />}
                accentColor="sky"
                sub="Incluindo equipe administrativa"
              />
              <ProgressCard
                label="Professores p/ Breakeven"
                value={`${currentInstructors}/${instructorsForBreakeven}`}
                progress={instructorsForBreakeven > 0 ? currentInstructors / instructorsForBreakeven : 1}
                progressLabel="do necessário para breakeven"
                icon={<Target className="h-4 w-4" />}
                accentColor={currentInstructors >= instructorsForBreakeven ? 'emerald' : 'amber'}
                tooltip={`Estimativa baseada em ${STUDENT_PER_INSTRUCTOR} alunos por professor`}
              />
              <MetricCard
                label="Gap de Professores"
                value={gapInstructors > 0 ? formatNumber(gapInstructors) : '✓ Suficiente'}
                trend={gapInstructors <= 0 ? 'up' : 'down'}
                icon={<UserPlus className="h-4 w-4" />}
                accentColor={gapInstructors <= 0 ? 'emerald' : 'rose'}
                sub={gapInstructors > 0 ? `professores para atingir breakeven` : 'Equipe atual sustenta a operação'}
              />
            </>
          )}
        </div>

        {/* Bullet charts */}
        <Card title="Professores — Atual vs Necessário para Breakeven">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
            </div>
          ) : unitAssumptionsData.length > 0 ? (
            <div className="space-y-3">
              <BulletChartItem
                label="Personal Trainers Totais"
                current={totalPT}
                breakeven={instructorsForBreakeven}
                max={Math.max(totalPT * 1.5, instructorsForBreakeven * 1.2, 5)}
                formatter={(v) => `${Math.round(v)} prof.`}
              />
              <BulletChartItem
                label="Projeção de Professores Necessários"
                current={currentInstructors}
                breakeven={projectedInstructors}
                max={Math.max(currentInstructors * 1.5, projectedInstructors * 1.2, 5)}
                formatter={(v) => `${Math.round(v)} prof.`}
              />
              <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-800 mb-1">Premissa de cálculo</p>
                <p className="text-xs text-indigo-600">
                  Estimativa baseada na proporção de {STUDENT_PER_INSTRUCTOR} alunos por professor/instrutor.
                  Para dados precisos, configure <code className="bg-indigo-100 px-1 rounded">num_personal_trainers</code> em cada versão de orçamento.
                </p>
              </div>
            </div>
          ) : (
            <NoFiltersState
              compact
              message="Nenhuma unidade com versão publicada encontrada. Configure as premissas e publique versões."
            />
          )}
        </Card>

        {/* Tabela por unidade */}
        {!isLoading && unitAssumptionsData.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Professores por Unidade</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Unidade</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wider">Personal Trainers</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wider">Total Funcionários</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Prof. p/ Breakeven</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3 uppercase tracking-wider">Gap</th>
                </tr>
              </thead>
              <tbody>
                {unitAssumptionsData.map((u) => {
                  const needed = instructorsForBreakeven;
                  const gap = needed - u.personal_trainers;
                  return (
                    <tr key={u.unit_id} className="border-t border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-3.5 text-sm font-semibold text-gray-800">{u.unit_name}</td>
                      <td className="px-4 py-3.5 text-sm text-right font-bold text-gray-900 tabular-nums">
                        {formatNumber(u.personal_trainers)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right text-gray-500 tabular-nums">
                        {formatNumber(u.total_staff)}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-right text-gray-500 tabular-nums">
                        ~{needed}
                      </td>
                      <td className={`px-6 py-3.5 text-sm text-right font-bold tabular-nums ${gap <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {gap <= 0 ? `+${Math.abs(gap)}` : `-${gap}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}
