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
      <div className="flex items-center justify-between pb-4 border-b-2 border-[#0F172A] flex-wrap gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-[#E11D48] uppercase tracking-widest">
            Không Gian Làm Việc / Dự Án Trọng Tâm
          </div>
          <h2 className="text-lg font-black text-[#0F172A] tracking-tight">
            Dự Án Trọng Tâm (Active Projects)
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Quản lý mục tiêu chiến lược, phân rã đầu việc và đo lường tiến độ thực thi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEngine.playSoftClick();
              setIsCreatingProject(!isCreatingProject);
            }}
            className="px-3.5 py-1.5 bg-[#FEF9C3] hover:bg-[#FDE047] text-[#0F172A] text-xs font-black rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] text-[#E11D48]" />
            <span>Tạo Dự Án Mới</span>
          </button>

          <button
            onClick={onOpenTaskModal}
            className="px-3.5 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0F172A] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Thêm Task Mới</span>
          </button>
        </div>
      </div>

      {/* 2. UNIFIED 4-METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#FFF1F2] border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-2">
          <div className="text-[11px] font-black text-[#0F172A]/70 uppercase tracking-wider">
            Tổng Số Dự Án
          </div>
          <div className="text-2xl font-black text-[#0F172A] tracking-tight">
            {projects.length} dự án
          </div>
          <div className="text-[11px] text-slate-600 font-bold">
            Đang hoạt động trong workspace
          </div>
        </div>

        <div className="bg-[#DBEAFE] border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-2">
          <div className="text-[11px] font-black text-[#0F172A]/70 uppercase tracking-wider">
            Công Việc Phân Bổ
          </div>
          <div className="text-2xl font-black text-[#1D4ED8] tracking-tight">
            {totalAssignedTasks} việc
          </div>
          <div className="text-[11px] text-slate-600 font-bold">
            Thuộc các dự án chiến lược
          </div>
        </div>

        <div className="bg-[#DCFCE7] border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-2">
          <div className="text-[11px] font-black text-[#0F172A]/70 uppercase tracking-wider">
            Đã Chốt Xong
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {totalCompletedProjectTasks} việc
          </div>
          <div className="text-[11px] text-slate-600 font-bold">
            Nhiệm vụ đã hoàn tất thành công
          </div>
        </div>

        <div className="bg-[#FEF9C3] border-2 border-[#0F172A] p-4 rounded-2xl shadow-[3px_3px_0px_#0F172A] space-y-2">
          <div className="text-[11px] font-black text-[#0F172A]/70 uppercase tracking-wider">
            Tiến Độ Bình Quân
          </div>
          <div className="text-2xl font-black text-[#E11D48] tracking-tight">
            {overallProjectRate}%
          </div>
          <div className="text-[11px] text-slate-600 font-bold">
            Tỷ lệ hoàn thành tổng thể
          </div>
        </div>
      </div>

      {/* 3. CREATE PROJECT INLINE FORM */}
      {isCreatingProject && (
        <form
          onSubmit={handleCreateProject}
          className="bg-white border-2 border-[#0F172A] rounded-2xl p-5 shadow-[4px_4px_0px_#0F172A] space-y-4 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#0F172A]/15">
            <h3 className="text-xs font-black text-[#0F172A]">Khởi tạo Dự Án Mới</h3>
            <button
              type="button"
              onClick={() => setIsCreatingProject(false)}
              className="p-1 text-[#0F172A] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#0F172A] rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#0F172A]">Tên dự án:</label>
              <input
                type="text"
                placeholder="Ví dụ: Tối Ưu Hệ Thống Bán Hàng..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFFDF7] border-2 border-[#0F172A] rounded-xl text-xs font-bold text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-[#FFF1F2] transition-colors"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-[#0F172A]">Mã phân loại / Category:</label>
              <input
                type="text"
                placeholder="Ví dụ: deep_work, r_and_d, operations..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFFDF7] border-2 border-[#0F172A] rounded-xl text-xs font-bold text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-[#FFF1F2] transition-colors"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-black text-[#0F172A]">Mô tả mục tiêu dự án:</label>
              <textarea
                placeholder="Mô tả mục đích cốt lõi, kết quả mong đợi và các mốc chuyển giao..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-[#FFFDF7] border-2 border-[#0F172A] rounded-xl text-xs font-bold text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-[#FFF1F2] transition-colors"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5 pt-2 border-t-2 border-[#0F172A]/10">
              <label className="text-[11px] font-black text-[#0F172A]">Màu chủ đạo (Designer Palettes):</label>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {Object.values(PALETTES).slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.name}
                    onClick={() => setNewColorHex(p.hex)}
                    style={{ backgroundColor: p.hex }}
                    className={`w-6 h-6 rounded-full border-2 border-[#0F172A] transition-all cursor-pointer ${
                      newColorHex === p.hex
                        ? 'ring-2 ring-offset-2 ring-[#E11D48] scale-115 shadow-[2px_2px_0px_#0F172A]'
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
              className="px-3.5 py-1.5 rounded-xl text-xs font-black text-[#0F172A] bg-white hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-black rounded-xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] transition-all disabled:opacity-50 cursor-pointer"
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
              className={`border-2 border-[#0F172A] rounded-2xl p-5 shadow-[4px_4px_0px_#0F172A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0F172A] transition-all space-y-4 flex flex-col justify-between cursor-pointer ${
                isSelected ? 'bg-[#FFF1F2]' : 'bg-white'
              }`}
            >
              <div className="space-y-3">
                {/* Top Accent Line & Category Badge */}
                <div className="space-y-2">
                  <div
                    style={{ backgroundColor: proj.colorHex }}
                    className="h-1.5 w-12 rounded-full border border-[#0F172A]"
                  />
                  <div className="flex items-center justify-between">
                    <div className="px-2 py-0.5 rounded-md bg-[#FFFDF7] border border-[#0F172A] flex items-center gap-1.5">
                      <span
                        style={{ backgroundColor: proj.colorHex }}
                        className="w-2 h-2 rounded-full inline-block border border-[#0F172A]"
                      />
                      <span className="text-[10px] font-mono font-black text-[#0F172A] uppercase tracking-wider">
                        {proj.category}
                      </span>
                    </div>

                    {!proj.isDefault && (
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        title="Xóa dự án này"
                        className="text-[#0F172A]/60 hover:text-[#E11D48] hover:bg-[#FFE4E6] p-1 rounded-lg border border-transparent hover:border-[#0F172A] transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-black text-sm text-[#0F172A] leading-snug">{proj.title}</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1 line-clamp-2">{proj.desc}</p>
                </div>
              </div>

              {/* Progress & Task List */}
              <div className="space-y-3 pt-3 border-t-2 border-[#0F172A]/15">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-black text-[#0F172A]">
                    <span>Tiến độ hoàn thành</span>
                    <span style={{ color: proj.colorHex }} className="font-mono font-black">
                      {pct}% ({done}/{total} việc)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-[#FFFDF7] border-2 border-[#0F172A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: proj.colorHex }}
                    />
                  </div>
                </div>

                {/* Task preview items */}
                <div className="space-y-2 pt-1">
                  {projTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-500 font-semibold italic bg-[#FFFDF7] border-2 border-dashed border-[#0F172A]/20 rounded-xl py-2 px-3 text-center">
                      Chưa có công việc được gán
                    </p>
                  ) : (
                    projTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTaskClick) onTaskClick(t);
                        }}
                        className="text-xs text-[#0F172A] hover:text-[#E11D48] bg-[#FFFDF7] hover:bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] flex items-center justify-between gap-1.5 truncate p-2 rounded-xl transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            style={{ backgroundColor: proj.colorHex }}
                            className="w-2 h-2 rounded-full border border-[#0F172A] shrink-0"
                          />
                          <span className={`truncate text-xs font-bold ${t.column === 'done' ? 'line-through text-slate-400' : ''}`}>
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#0F172A] font-mono font-black bg-white px-1.5 py-0.5 rounded-md border border-[#0F172A] shrink-0">
                          {t.time_box?.start}
                        </span>
                      </div>
                    ))
                  )}

                  {projTasks.length > 3 && (
                    <p className="text-[10px] font-black text-[#E11D48] pt-0.5 text-right font-mono">
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
