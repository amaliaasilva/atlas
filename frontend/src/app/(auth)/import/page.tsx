'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { importsApi, unitsApi } from '@/lib/api';
import { useNavStore } from '@/store/auth';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingScreen } from '@/components/ui/Spinner';
import { getErrorMessage } from '@/lib/utils';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function ImportPage() {
  const { unitId, businessId } = useNavStore();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ['import-jobs', unitId],
    queryFn: () => importsApi.list(unitId ?? undefined),
    refetchInterval: 5000, // Poll a cada 5s para atualizar status
  });

  const { data: units } = useQuery({
    queryKey: ['units', businessId],
    queryFn: () => unitsApi.list(businessId ?? ''),
    enabled: !!businessId,
  });

  const handleFile = useCallback(
    async (file: File) => {
      if (!unitId) {
        setError('Selecione uma unidade antes de importar.');
        return;
      }
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Apenas arquivos .xlsx ou .xls são aceitos.');
        return;
      }
      setError('');
      setUploading(true);
      try {
        const job = await importsApi.upload(unitId, file);
        setSuccess(`Importação iniciada: Job #${job.id.slice(0, 8)}`);
        refetch();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setUploading(false);
      }
    },
    [unitId, refetch],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Topbar title="Importar Planilhas" />
      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Importar Excel</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Faça upload das planilhas do modelo original para importar premissas automaticamente.
          </p>
        </div>

        {/* Seleção de unidade */}
        {!unitId && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
            Vá em <strong>Unidades</strong> e selecione uma antes de importar.
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-2xl p-10 text-center transition-colors
            ${dragging ? 'border-brand-400 bg-brand-50' : 'border-gray-300 bg-gray-50 hover:border-brand-300 hover:bg-gray-100'}
          `}
        >
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-700 mb-1">Arraste um arquivo .xlsx aqui</p>
          <p className="text-xs text-gray-400 mb-4">ou clique para selecionar</p>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Button variant="secondary" size="sm" loading={uploading} disabled={!unitId}>
              <Upload className="h-4 w-4" /> Selecionar Arquivo
            </Button>
          </label>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>
        )}

        {/* Jobs history */}
        {jobs && jobs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Histórico de Importações</h3>
            </div>
            <table className="atlas-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Status</th>
                  <th>Linhas</th>
                  <th>Data</th>
                  <th>Unidade</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="flex items-center gap-2">
                      <StatusIcon status={job.status} />
                      <span className="truncate max-w-[200px]">{job.filename}</span>
                    </td>
                    <td><StatusBadge status={job.status} /></td>
                    <td className="numeric">{job.rows_imported ?? '—'}</td>
                    <td className="text-xs text-gray-400">
                      {new Date(job.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="text-xs text-gray-500">{job.unit_id.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
        )}
      </div>
    </>
  );
}
