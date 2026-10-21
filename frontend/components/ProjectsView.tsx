'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, ChevronRight, Layers } from 'lucide-react';
import { TaskItem } from '../lib/types';
import { PALETTES, resolvePalette } from '../lib/colorPalettes';
import { soundEngine } from '../lib/audio';

interface Project {
  id: string;
  title: string;
  desc: string;
  category: string;
  colorHex: string;
  isDefault?: boolean;
}

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Tối Ưu Hóa Năng Suất & Kế Hoạch Tuần',
    desc: 'Thiết lập thời khóa biểu chuyên sâu, phân rã mục tiêu ưu tiên và cân bằng nhịp sinh học',
    category: 'deep_work',
    colorHex: '#AE445A', // Twilight Rose
    isDefault: true,
  },
  {
    id: 'p2',
    title: 'Nghiên Cứu & Phát Triển Sản Phẩm (R&D)',
    desc: 'Tự động hóa quy trình làm việc, tối ưu hóa hệ thống vận hành và chuẩn hóa dữ liệu',
    category: 'optimization',
    colorHex: '#235347', // Forest Emerald
    isDefault: true,
  },
  {
    id: 'p3',
    title: 'Sáng Tạo Không Gian & Tái Tạo Năng Lượng',
    desc: 'Phiên tập trung Pomodoro, nhật ký phản tư cá nhân và rèn luyện thói quen tích cực',
    category: 'creative',
    colorHex: '#F39F5A', // Sunset Amber
    isDefault: true,
  },
];

const CUSTOM_PROJECTS_KEY = 'cbp_atelier_custom_projects_v3';

interface ProjectsViewProps {
  tasks: TaskItem[];
  onBackToTracker: () => void;
  onOpenTaskModal: () => void;
  onTaskClick?: (task: TaskItem) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  tasks,
  onBackToTracker,
  onOpenTaskModal,
  onTaskClick,
}) => {
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // New Project Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newColorHex, setNewColorHex] = useState('#AE445A');

  // Load projects from localStorage and sanitize any legacy emojis
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map((p: any) => ({
            id: p.id,
            title: typeof p.title === 'string' ? p.title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() : 'Dự án',
            desc: typeof p.desc === 'string' ? p.desc.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() : '',
            category: p.category || 'deep_work',
            colorHex: p.colorHex || '#AE445A',
            isDefault: p.isDefault,
          }));
          setProjects(cleaned);
        }
      }
    } catch {}
  }, []);

  const saveProjects = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    try {
      localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(updatedProjects));
    } catch {}
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    soundEngine.playSoftClick();
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      title: newTitle.trim(),
      desc: newDesc.trim() || 'Dự án chiến lược cá nhân',
      category: newCategory.trim() || 'deep_work',
      colorHex: newColorHex,
      isDefault: false,
    };

    const updated = [...projects, newProject];
    saveProjects(updated);
    setNewTitle('');
    setNewDesc('');
    setNewCategory('');
    setIsCreatingProject(false);
  };

  const handleDeleteProject = (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playSoftClick();
    const updated = projects.filter((p) => p.id !== projId);
    saveProjects(updated);
    if (selectedProjectId === projId) {
      setSelectedProjectId(null);
    }
  };

  const getTasksForProject = (proj: Project) => {
    return tasks.filter((t) => {
      // Match by category
      if (t.category && t.category.toLowerCase() === proj.category.toLowerCase()) return true;
      // Match by title keywords
      if (t.title.toLowerCase().includes(proj.title.toLowerCase())) return true;
      if (proj.category && t.title.toLowerCase().includes(proj.category.toLowerCase())) return true;
      return false;
    });
  };

  // Top metric strip calculations
  const totalAssignedTasks = projects.reduce((acc, p) => acc + getTasksForProject(p).length, 0);
  const totalCompletedProjectTasks = projects.reduce(
    (acc, p) => acc + getTasksForProject(p).filter((t) => t.column === 'done').length,
    0
  );
  const overallProjectRate =
    totalAssignedTasks > 0 ? Math.round((totalCompletedProjectTasks / totalAssignedTasks) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* 1. UNIFIED HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-[#EEF2F8] flex-wrap gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Không Gian Làm Việc / Dự Án Trọng Tâm
          </div>
          <h2 className="text-lg font-black text-[#1E293B] tracking-tight">
            Dự Án Trọng Tâm (Active Projects)
          </h2>
          <p className="text-xs text-slate-500">
            Quản lý mục tiêu chiến lược, phân rã đầu việc và đo lường tiến độ thực thi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setIsCreatingProject(!isCreatingProject);
            }}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
            <span>Tạo Dự Án Mới</span>
          </button>

          <button
            onClick={onOpenTaskModal}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
            <span>Thêm Task Mới</span>
          </button>
        </div>
      </div>

      {/* 2. UNIFIED 4-METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tổng Số Dự Án
          </div>
          <div className="text-2xl font-black text-[#1E293B] tracking-tight">
            {projects.length} dự án
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Đang hoạt động trong workspace
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Công Việc Phân Bổ
          </div>
          <div className="text-2xl font-black text-[#2563EB] tracking-tight">
            {totalAssignedTasks} việc
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Thuộc các dự án chiến lược
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Đã Chốt Xong
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            {totalCompletedProjectTasks} việc
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Nhiệm vụ đã hoàn tất thành công
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tiến Độ Bình Quân
          </div>
          <div className="text-2xl font-black text-[#AE445A] tracking-tight">
            {overallProjectRate}%
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Tỷ lệ hoàn thành tổng thể
          </div>
        </div>
      </div>

      {/* 3. CREATE PROJECT INLINE FORM */}
      {isCreatingProject && (
        <form
          onSubmit={handleCreateProject}
          className="bg-white border border-[#2563EB]/40 rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-extrabold text-[#1E293B]">Khởi tạo Dự Án Mới</h3>
            <button
              type="button"
              onClick={() => setIsCreatingProject(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Tên dự án:</label>
              <input
                type="text"
                placeholder="Ví dụ: Tối Ưu Hệ Thống Bán Hàng..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFD] border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Mã phân loại / Category:</label>
              <input
                type="text"
                placeholder="Ví dụ: deep_work, r_and_d, operations..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFD] border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Mô tả mục tiêu dự án:</label>
              <textarea
                placeholder="Mô tả mục đích cốt lõi, kết quả mong đợi và các mốc chuyển giao..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-[#F8FAFD] border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="sm:col-span-2 space-y-1 pt-1 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-600">Màu chủ đạo (Designer Palettes):</label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {Object.values(PALETTES).slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.name}
                    onClick={() => setNewColorHex(p.hex)}
                    style={{ backgroundColor: p.hex }}
                    className={`w-6 h-6 rounded-full transition-all ${
                      newColorHex === p.hex
                        ? 'ring-2 ring-offset-2 ring-slate-800 scale-120 shadow-xs'
                        : 'opacity-85 hover:opacity-100 hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingProject(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              Lưu Dự Án
            </button>
          </div>
        </form>
      )}

      {/* 4. PROJECTS CARDS GRID (3 COLUMNS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((proj) => {
          const projTasks = getTasksForProject(proj);
          const total = projTasks.length;
          const done = projTasks.filter((t) => t.column === 'done').length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const isSelected = selectedProjectId === proj.id;

          return (
            <div
              key={proj.id}
              onClick={() => {
                soundEngine.playSoftClick();
                setSelectedProjectId(isSelected ? null : proj.id);
              }}
              className={`bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between cursor-pointer ${
                isSelected ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-md' : 'border-[#E2E8F0] hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                {/* Top Accent Line & Category Badge */}
                <div className="space-y-2">
                  <div
                    style={{ backgroundColor: proj.colorHex }}
                    className="h-1 w-12 rounded-full"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        style={{ backgroundColor: proj.colorHex }}
                        className="w-2 h-2 rounded-full inline-block"
                      />
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                        {proj.category}
                      </span>
                    </div>

                    {!proj.isDefault && (
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        title="Xóa dự án này"
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-[#1E2433] leading-snug">{proj.title}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed mt-1 line-clamp-2">{proj.desc}</p>
                </div>
              </div>

              {/* Progress & Task List */}
              <div className="space-y-3 pt-3 border-t border-[#EEF2F8]">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1E2433]">
                    <span>Tiến độ hoàn thành</span>
                    <span style={{ color: proj.colorHex }} className="font-mono">
                      {pct}% ({done}/{total} việc)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#F1F4FA] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: proj.colorHex }}
                    />
                  </div>
                </div>

                {/* Task preview items */}
                <div className="space-y-1.5 pt-1">
                  {projTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Chưa có công việc được gán</p>
                  ) : (
                    projTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTaskClick) onTaskClick(t);
                        }}
                        className="text-xs text-[#475569] hover:text-[#2563EB] flex items-center justify-between gap-1.5 truncate p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            style={{ backgroundColor: proj.colorHex }}
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                          />
                          <span className={`truncate text-xs font-medium ${t.column === 'done' ? 'line-through text-slate-400' : ''}`}>
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {t.time_box?.start}
                        </span>
                      </div>
                    ))
                  )}

                  {projTasks.length > 3 && (
                    <p className="text-[10px] font-bold text-slate-400 pt-0.5 text-right font-mono">
                      +{projTasks.length - 3} việc khác...
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
