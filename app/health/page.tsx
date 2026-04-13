"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import Link from "next/link";
import { useNestliStore } from "../../lib/nestli-store";

// --- 工具函数 ---
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// 推断成员的年龄段以匹配不同的健康指标
type AgeGroup = "adult" | "kid" | "baby";
function getAgeGroup(role: string): AgeGroup {
  const r = role?.toLowerCase() || "";
  if (r.includes("mom") || r.includes("dad") || r.includes("grand") || r.includes("caregiver")) return "adult";
  if (r.includes("baby")) return "baby";
  return "kid";
}

// --- 类型定义 ---
interface HealthRecord {
  id: string;
  memberId: string; // 新增：用于在全局 store 中区分是谁的记录
  date: string;
  category: string;
  metricName: string;
  type: "numeric" | "description";
  value?: number;
  unit?: string;
  description?: string;
  visibility: "private" | "family";
}

// --- 配置数据 ---
const METRIC_CATEGORIES: Record<AgeGroup, string[]> = {
  adult: ["Growth", "Lab", "Dental", "Vision", "Sleep", "Mental", "Custom"],
  kid: ["Growth", "Dental", "Vision", "Sleep", "Milestones", "Custom"],
  baby: ["Growth", "Dental", "Vision", "Sleep", "Feeding", "Milestones", "Custom"],
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

// --- 主页面 ---
export default function HealthPage() {
  // 从 Store 中获取全局状态和方法 (参考 Journal 页面)
  const store = useNestliStore() as any;
  const { 
    familyMembers, 
    healthRecords = [], // 默认空数组，防止 store 中还未初始化
    addHealthRecord, 
    updateHealthRecord, 
    deleteHealthRecord 
  } = store;

  // 过滤掉 'all'，只保留真实家庭成员
  const actualFamilyMembers = useMemo(() => {
    return familyMembers.filter((member: any) => member.id !== "all");
  }, [familyMembers]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<HealthRecord> | null>(null);

  // 初始化选中的成员
  useEffect(() => {
    if (!selectedMemberId && actualFamilyMembers.length > 0) {
      setSelectedMemberId(actualFamilyMembers[0].id);
    }
  }, [actualFamilyMembers, selectedMemberId]);

  const selectedMember = actualFamilyMembers.find((m: any) => m.id === selectedMemberId) || actualFamilyMembers[0];
  const ageGroup = selectedMember ? getAgeGroup(selectedMember.role) : "kid";

  // 当切换成员时，校验当前 Category
  useEffect(() => {
    if (activeCategory !== "All" && !METRIC_CATEGORIES[ageGroup].includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [selectedMemberId, activeCategory, ageGroup]);

  // 打开弹窗（新建或编辑）
  const openModal = (record?: HealthRecord) => {
    if (record) {
      setEditingRecord(record);
    } else {
      const defaultCat = activeCategory === "All" ? METRIC_CATEGORIES[ageGroup][0] : activeCategory;
      setEditingRecord({
        id: String(Date.now()), // 统一使用时间戳做为新 ID
        memberId: selectedMemberId,
        date: new Date().toISOString().split("T")[0],
        category: defaultCat,
        metricName: "",
        type: "numeric",
        visibility: "private",
        unit: "",
      });
    }
    setIsModalOpen(true);
  };

  // 保存记录到 Zustand Store
  const handleSave = () => {
    if (!editingRecord || !selectedMemberId) return;

    let metricName = editingRecord.metricName?.trim();

    // 如果不是 Custom 分类，MetricName 自动等于 Category
    if (editingRecord.category !== "Custom") {
      metricName = editingRecord.category;
    } else {
      // Custom metric 统一转小写
      metricName = metricName?.toLowerCase();
    }

    if (!metricName) return;

    const newRecord = {
      ...editingRecord,
      metricName,
      memberId: selectedMemberId,
    } as HealthRecord;

    const isExisting = healthRecords.some((r: HealthRecord) => r.id === newRecord.id);

    if (isExisting) {
      updateHealthRecord?.(newRecord);
    } else {
      addHealthRecord?.(newRecord);
    }

    setIsModalOpen(false);
  };

  // 从 Zustand Store 删除记录
  const handleDelete = (id: string) => {
    deleteHealthRecord?.(id);
    setIsModalOpen(false);
  };

  // 从全局健康记录中过滤当前成员的数据，并分组排序
  const filteredGroupedData = useMemo(() => {
    if (!selectedMemberId) return {};
    
    // 1. 过滤出当前成员的所有记录
    const memberRecords = healthRecords.filter((r: HealthRecord) => r.memberId === selectedMemberId);
    
    // 2. 按 MetricName 分组
    const groups: Record<string, HealthRecord[]> = {};
    
    memberRecords.forEach((r: HealthRecord) => {
      if (activeCategory !== "All" && r.category !== activeCategory) return;
      if (!groups[r.metricName]) groups[r.metricName] = [];
      groups[r.metricName].push(r);
    });
    
    // 3. 按日期正序排列 (折线图需要)
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    return groups;
  }, [healthRecords, selectedMemberId, activeCategory]);

  // 判断是否为新建记录（如果 ID 不在已存在的记录中，则为新建）
  const isCreatingNew = editingRecord?.id && !healthRecords.some((r: HealthRecord) => r.id === editingRecord.id);

  if (!selectedMember) return null; // 防止初次渲染白屏
  const currentCategories = ["All", ...METRIC_CATEGORIES[ageGroup]];

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-sm relative">
        
        {/* 1. Header (Unified with Profile) */}
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur flex justify-between items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Nestli</p>
            <h1 className="text-lg font-semibold">Health</h1>
          </div>
          <button 
            onClick={() => openModal()}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
          >
            + Log
          </button>
        </header>

        {/* 2. Member Selector */}
        <div className="flex gap-3 px-4 py-3 bg-white overflow-x-auto no-scrollbar">
          {actualFamilyMembers.map((m: any) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMemberId(m.id);
                setExpandedMetric(null);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full border transition-all shrink-0",
                selectedMemberId === m.id
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600"
              )}
            >
              <div 
                className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px]", m.color)}
              >
                {m.avatar}
              </div>
              <span className={cn("text-xs font-semibold", selectedMemberId === m.id ? "text-emerald-800" : "")}>
                {m.name}
              </span>
            </button>
          ))}
        </div>

        {/* 3. Category Filters */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-white border-b border-slate-100">
          {currentCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "text-[10px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-all border",
                activeCategory === cat
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 4. Main Content: Metrics List & Charts */}
        <div className="flex-1 p-4 pb-24 space-y-4 bg-slate-50">
          {Object.entries(filteredGroupedData).length === 0 ? (
            <div className="text-center py-16 text-sm font-medium text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              No health records yet.<br/>Tap + Log to get started.
            </div>
          ) : (
            Object.entries(filteredGroupedData).map(([name, data]) => {
              const latest = data[data.length - 1];
              const isNumeric = latest.type === "numeric";
              const showChart = isNumeric && data.length >= 3;
              const isExpanded = expandedMetric === name;
              const sortedHistory = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return (
                <div key={name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div 
                    onClick={() => setExpandedMetric(isExpanded ? null : name)}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center transition-colors",
                      isExpanded && "bg-slate-50 border-b border-slate-100"
                    )}
                  >
                    <div>
                      <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest mb-1">{latest.category}</div>
                      <h3 className="text-base font-semibold text-slate-900">{name}</h3>
                      <div className="mt-1">
                        {isNumeric ? (
                          <span className="text-xl font-bold text-slate-800">
                            {latest.value} <span className="text-xs font-medium text-slate-500">{latest.unit}</span>
                          </span>
                        ) : (
                          <span className="text-sm text-slate-600 italic line-clamp-1 max-w-[200px]">"{latest.description}"</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className={cn(
                        "text-[9px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider",
                        latest.visibility === "private" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                      )}>
                        {latest.visibility === "private" ? "🔒 Private" : "👨‍👩‍👧‍👦 Family"}
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        {data.length} records {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        {showChart && (
                          <div className="px-4 pt-4 pb-2">
                            <div className="h-36 w-full bg-slate-50 rounded-xl p-2 border border-slate-100">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                  <XAxis dataKey="date" hide />
                                  <YAxis hide domain={['auto', 'auto']} />
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                  <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669' }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        <div className="px-4 pb-4 pt-2 space-y-2">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2 mt-2">Full History</div>
                          {sortedHistory.map((record, idx) => (
                            <div 
                              key={record.id} 
                              onClick={(e) => { e.stopPropagation(); openModal(record); }}
                              className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100"
                            >
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400">{record.date} {idx === 0 && <span className="text-emerald-600 font-semibold ml-1">(Latest)</span>}</span>
                                {record.type === "numeric" ? (
                                  <span className="text-sm font-semibold text-slate-700">{record.value} <span className="text-xs font-normal text-slate-500">{record.unit}</span></span>
                                ) : (
                                  <span className="text-sm text-slate-600 italic truncate max-w-[180px]">"{record.description}"</span>
                                )}
                              </div>
                              <button className="text-[11px] text-emerald-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50 px-3 py-1.5 rounded-lg">
                                Edit
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        <BottomTabBar active="health" />

        {/* 5. Modal: Add / Edit Record */}
        <AnimatePresence>
          {isModalOpen && editingRecord && (
            <div className="fixed inset-0 z-30 flex items-end bg-black/35">
              <button className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                className="relative w-full max-w-md rounded-t-3xl bg-white px-4 pb-6 pt-3 shadow-2xl mx-auto max-h-[90vh] overflow-y-auto"
              >
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />

                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold">{isCreatingNew ? "Log Health Record" : "Edit Record"}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 font-medium">
                    Close
                  </button>
                </div>

                <div className="space-y-4">
                  <Field label="Family Member">
                    <div className="flex flex-wrap gap-2">
                      {actualFamilyMembers.map((m: any) => (
                        <button 
                          key={m.id}
                          onClick={() => setSelectedMemberId(m.id)}
                          className={cn(
                            "rounded-full border px-3 py-2 text-sm transition flex items-center gap-1",
                            selectedMemberId === m.id
                              ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          )}
                        >
                          <span>{m.avatar}</span> {m.name}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date">
                      <input 
                        type="date" 
                        value={editingRecord.date}
                        onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Category">
                      <select 
                        value={editingRecord.category}
                        onChange={(e) => setEditingRecord({ ...editingRecord, category: e.target.value })}
                        className={inputClass}
                      >
                        {METRIC_CATEGORIES[ageGroup].map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {editingRecord.category === "Custom" && (
                  <Field label="Metric Name">
                    <input 
                      type="text" 
                      placeholder="e.g. bmi, mood, symptom"
                      value={editingRecord.metricName}
                      onChange={(e) => setEditingRecord({ ...editingRecord, metricName: e.target.value.toLowerCase() })}
                      className={inputClass}
                    />
                  </Field>
                )}

                  <Field label="Entry Type">
                    <div className="flex gap-2 mb-3">
                      <button 
                        onClick={() => setEditingRecord({ ...editingRecord, type: "numeric", description: "" })}
                        className={cn("flex-1 rounded-2xl border px-3 py-2 text-sm transition", editingRecord.type === "numeric" ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}
                      >
                        🔢 Numeric
                      </button>
                      <button 
                        onClick={() => setEditingRecord({ ...editingRecord, type: "description", value: undefined, unit: "" })}
                        className={cn("flex-1 rounded-2xl border px-3 py-2 text-sm transition", editingRecord.type === "description" ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}
                      >
                        📝 Description
                      </button>
                    </div>

                    {editingRecord.type === "numeric" ? (
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="number" placeholder="Value"
                          value={editingRecord.value || ""}
                          onChange={(e) => setEditingRecord({ ...editingRecord, value: parseFloat(e.target.value) })}
                          className={inputClass}
                        />
                        <input 
                          type="text" placeholder="Unit (kg, mmHg)"
                          value={editingRecord.unit || ""}
                          onChange={(e) => setEditingRecord({ ...editingRecord, unit: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    ) : (
                      <textarea 
                        placeholder="Describe feelings or symptoms..."
                        value={editingRecord.description || ""}
                        onChange={(e) => setEditingRecord({ ...editingRecord, description: e.target.value })}
                        className={cn(inputClass, "min-h-[100px] resize-none")}
                      />
                    )}
                  </Field>

                  <Field label="Visibility">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingRecord({ ...editingRecord, visibility: "private" })}
                        className={cn("flex-1 rounded-2xl border px-3 py-3 text-sm transition font-semibold", editingRecord.visibility === "private" ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-500")}
                      >
                        🔒 Only Me
                      </button>
                      <button 
                        onClick={() => setEditingRecord({ ...editingRecord, visibility: "family" })}
                        className={cn("flex-1 rounded-2xl border px-3 py-3 text-sm transition font-semibold", editingRecord.visibility === "family" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500")}
                      >
                        👨‍👩‍👧‍👦 Family
                      </button>
                    </div>
                  </Field>

                  <div className="mt-6 flex flex-col gap-3">
                    <button 
                      onClick={handleSave}
                      className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Save Record
                    </button>
                    
                    {/* 不是新建记录才显示 Delete 按钮 */}
                    {!isCreatingNew && (
                      <button 
                        onClick={() => handleDelete(editingRecord.id!)}
                        className="w-full rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Delete Record
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function BottomTabBar({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white pb-safe">
      <TabItem href="/home" label="🏠" text="Home" active={active === "home"} />
      <TabItem href="/calendar" label="📅" text="Calendar" active={active === "calendar"} />
      <TabItem href="/health" label="❤️" text="Health" active={active === "health"} />
      <TabItem href="/journal" label="📷" text="Journal" active={active === "journal"} />
      <TabItem href="/profile" label="👤" text="Profile" active={active === "profile"} />
    </nav>
  );
}

function TabItem({ href, label, text, active }: { href: string; label: string; text: string; active?: boolean }) {
  return (
    <Link href={href} className="flex flex-1 flex-col items-center gap-1 px-2 py-3">
      <div className={active ? "text-emerald-700" : "text-slate-400"}>{label}</div>
      <span className={cn("text-[11px]", active ? "font-semibold text-emerald-700" : "text-slate-400")}>
        {text}
      </span>
    </Link>
  );
}