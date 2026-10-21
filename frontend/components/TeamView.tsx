'use client';

import React from 'react';
import { Users, Mail, CheckCircle2, Clock, Plus, ShieldCheck } from 'lucide-react';
import { TaskItem } from '../lib/types';

interface TeamViewProps {
  tasks: TaskItem[];
  onOpenTaskModal: () => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ tasks, onOpenTaskModal }) => {
  const members = [
    {
      id: 'm1',
      name: 'Yaros Tolstykh',
      role: 'Lead Architect & Atelier Owner',
      avatar: 'YT',
      color: 'bg-slate-900 text-white',
      status: 'Đang Deep Work',
      statusColor: 'text-emerald-500 bg-emerald-50',
      tasks: tasks.filter((t) => t.column === 'in_progress' || t.column === 'editing'),
    },
    {
      id: 'm2',
      name: 'Brooklyn Simmons',
      role: 'Senior UI/UX & Visual Designer',
      avatar: 'BS',
      color: 'bg-[#6C5CE7] text-white',
      status: 'Trực tuyến',
      statusColor: 'text-blue-500 bg-blue-50',
      tasks: tasks.filter((t) => t.category === 'deep_work'),
    },
    {
      id: 'm3',
      name: 'Alex Morgan',
      role: 'Cloud & Database Systems',
      avatar: 'AM',
      color: 'bg-[#3B82F6] text-white',
      status: 'Đang xem xét code',
      statusColor: 'text-amber-500 bg-amber-50',
      tasks: tasks.filter((t) => t.column === 'draft' || t.column === 'done'),
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F8]">
        <div>
          <h2 className="text-base font-extrabold text-[#1E2433] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#3B82F6]" />
            <span>Đội Ngũ & Thành Viên Dự Án (Team Members)</span>
          </h2>
          <p className="text-[11px] text-[#8F9CAE]">
            Theo dõi khối lượng công việc, trạng thái hoạt động và các ca làm việc của từng thành viên
          </p>
        </div>

        <button
          onClick={onOpenTaskModal}
          className="px-3.5 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Giao Task Cho Thành Viên</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-white border border-[#E2E8F0] hover:border-[#3B82F6] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl ${member.color} font-black text-sm flex items-center justify-center shadow-xs shrink-0`}
              >
                {member.avatar}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-extrabold text-sm text-[#1E2433] truncate">{member.name}</h3>
                <p className="text-[11px] text-[#64748B] truncate">{member.role}</p>
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full mt-1 ${member.statusColor}`}
                >
                  ● {member.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#EEF2F8]">
              <div className="flex items-center justify-between text-xs font-bold text-[#1E2433]">
                <span>Công việc phụ trách ({member.tasks.length}):</span>
              </div>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {member.tasks.length === 0 ? (
                  <p className="text-[11px] text-[#94A3B8] italic">Chưa giao task</p>
                ) : (
                  member.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-xl bg-[#F8FAFD] border border-[#EEF2F8] text-xs flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-[#1E2433] truncate">{t.title}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          t.column === 'done'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {t.column === 'done' ? 'Xong' : 'Đang làm'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
