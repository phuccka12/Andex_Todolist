'use client';

import React from 'react';
import { Briefcase, Building, CheckCircle2, Clock, Plus, ExternalLink } from 'lucide-react';
import { TaskItem } from '../lib/types';

interface ClientsViewProps {
  tasks: TaskItem[];
  onOpenTaskModal: () => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ tasks, onOpenTaskModal }) => {
  const clients = [
    {
      id: 'c1',
      name: 'Acme Studio Global',
      industry: 'Design & Creative Agency',
      contractStatus: 'Hợp đồng kích hoạt',
      statusColor: 'text-emerald-500 bg-emerald-50',
      activeDeliverables: tasks.filter((t) => t.category === 'deep_work'),
      deadline: '15.08.2026',
    },
    {
      id: 'c2',
      name: 'Zenith FinTech Corp',
      industry: 'Banking & Secure Gateway',
      contractStatus: 'Đang triển khai Phase 2',
      statusColor: 'text-blue-500 bg-blue-50',
      activeDeliverables: tasks.filter((t) => t.category === 'optimization' || t.column === 'editing'),
      deadline: '28.08.2026',
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F8]">
        <div>
          <h2 className="text-base font-extrabold text-[#1E2433] flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#3B82F6]" />
            <span>Khách Hàng & Đối Tác (Clients & Stakeholders)</span>
          </h2>
          <p className="text-[11px] text-[#8F9CAE]">
            Quản lý hợp đồng dự án, các đầu việc bàn giao và tiến độ cam kết
          </p>
        </div>

        <button
          onClick={onOpenTaskModal}
          className="px-3.5 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo Bàn Giao Khách Hàng</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((client) => {
          const total = client.activeDeliverables.length;
          const done = client.activeDeliverables.filter((t) => t.column === 'done').length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <div
              key={client.id}
              className="bg-white border border-[#E2E8F0] hover:border-[#3B82F6] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-[#1E2433]">{client.name}</h3>
                  <p className="text-xs text-[#64748B]">{client.industry}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${client.statusColor}`}>
                  {client.contractStatus}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#EEF2F8]">
                <div className="flex items-center justify-between text-xs font-bold text-[#1E2433]">
                  <span>Hạn cam kết bàn giao:</span>
                  <span className="text-[#3B82F6]">{client.deadline}</span>
                </div>

                <div className="space-y-1.5">
                  {client.activeDeliverables.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-xl bg-[#F8FAFD] border border-[#EEF2F8] text-xs flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-[#1E2433] truncate">{t.title}</span>
                      <span className="text-[10px] font-bold text-slate-500">{t.time_box?.start}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
