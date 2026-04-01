'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDeleteModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  confirmLabel?: string;
  warningItems?: string[];
}

export function ConfirmDeleteModal({
  title,
  description,
  onConfirm,
  onClose,
  isPending,
  confirmLabel = 'Excluir',
  warningItems,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600">{description}</p>
          {warningItems && warningItems.length > 0 && (
            <ul className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              {warningItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            loading={isPending}
            disabled={isPending}
          >
            {isPending ? 'Excluindo...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
