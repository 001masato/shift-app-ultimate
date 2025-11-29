import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users, Settings, Calendar } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import type { Staff, ShiftAssignment, MonthlySettings } from './types';
import { StaffManagement } from './components/StaffManagement';
import { SettingsPanel } from './components/SettingsPanel';
import { ShiftTable } from './components/ShiftTable';
import { AlertPanel, type Alert } from './components/AlertPanel';
import { generateMonthlyShift } from './lib/autoGenerator';

import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';

type TabType = 'shift' | 'staff' | 'settings';

function App() {
  // 状態管理
  const [currentMonth, setCurrentMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [activeTab, setActiveTab] = useState<TabType>('shift');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [requiredCounts, setRequiredCounts] = useState({
    A2: 2,
    B3: 1,
    B5: 1,
    N1: 1,
  });
  const [nightShiftPattern, setNightShiftPattern] = useState<'patternA' | 'patternB'>('patternA');
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // LocalStorageからデータを読み込み
  useEffect(() => {
    const savedStaff = localStorage.getItem('staff-list');
    const savedCounts = localStorage.getItem('required-counts');
    const savedPattern = localStorage.getItem('night-shift-pattern');
    const savedShifts = localStorage.getItem('shifts-data');

    if (savedStaff) {
      try {
        setStaffList(JSON.parse(savedStaff));
      } catch (e) {
        console.error('Failed to load staff list', e);
      }
    }

    if (savedCounts) {
      try {
        setRequiredCounts(JSON.parse(savedCounts));
      } catch (e) {
        console.error('Failed to load required counts', e);
      }
    }

    if (savedPattern) {
      setNightShiftPattern(savedPattern as 'patternA' | 'patternB');
    }

    if (savedShifts) {
      try {
        setShifts(JSON.parse(savedShifts));
      } catch (e) {
        console.error('Failed to load shifts', e);
      }
    }
  }, []);

  // LocalStorageに保存
  useEffect(() => {
    localStorage.setItem('staff-list', JSON.stringify(staffList));
  }, [staffList]);

  useEffect(() => {
    localStorage.setItem('required-counts', JSON.stringify(requiredCounts));
  }, [requiredCounts]);

  useEffect(() => {
    localStorage.setItem('night-shift-pattern', nightShiftPattern);
  }, [nightShiftPattern]);

  // バリデーション
  const validateShifts = useCallback(() => {
    const newAlerts: Alert[] = [];
    const daysInMonth = getDaysInMonth(new Date(currentMonth.year, currentMonth.month - 1));

    // 日別の必要人数チェック
    for (let day = 0; day < daysInMonth; day++) {
      const date = format(
        addDays(startOfMonth(new Date(currentMonth.year, currentMonth.month - 1)), day),
        'yyyy-MM-dd'
      );
      const dayShifts = shifts.filter((s) => s.date === date);

      const a2Count = dayShifts.filter((s) => s.shiftCode === 'A2').length;
      const b3Count = dayShifts.filter((s) => s.shiftCode === 'B3').length;
      const b5Count = dayShifts.filter((s) => s.shiftCode === 'B5').length;
      const n1Count = dayShifts.filter((s) => s.shiftCode === 'N1').length;

      if (a2Count < requiredCounts.A2) {
        newAlerts.push({
          id: `a2-${date}`,
          type: 'error',
          message: `A2（早番）が${requiredCounts.A2 - a2Count}名不足`,
          date,
        });
      }
      if (b3Count < requiredCounts.B3) {
        newAlerts.push({
          id: `b3-${date}`,
          type: 'error',
          message: `B3（遅番3）が${requiredCounts.B3 - b3Count}名不足`,
          date,
        });
      }
      if (b5Count < requiredCounts.B5) {
        newAlerts.push({
          id: `b5-${date}`,
          type: 'error',
          message: `B5（遅番5）が${requiredCounts.B5 - b5Count}名不足`,
          date,
        });
      }
      if (n1Count < requiredCounts.N1) {
        newAlerts.push({
          id: `n1-${date}`,
          type: 'error',
          message: `N1（夜勤）が${requiredCounts.N1 - n1Count}名不足`,
          date,
        });
      }
    }

    // B5→A2違反チェック
    staffList.forEach((staff) => {
      const staffShifts = shifts
        .filter((s) => s.staffId === staff.id)
        .sort((a, b) => a.date.localeCompare(b.date));

      for (let i = 0; i < staffShifts.length - 1; i++) {
        if (
          staffShifts[i].shiftCode === 'B5' &&
          (staffShifts[i + 1].shiftCode === 'A2' || staffShifts[i + 1].shiftCode === 'A3')
        ) {
          newAlerts.push({
            id: `interval-${staff.id}-${staffShifts[i].date}`,
            type: 'warning',
            message: `B5の翌日に早番が設定されています（インターバル違反）`,
            staffName: staff.name,
            date: staffShifts[i + 1].date,
          });
        }
      }
    });

    setAlerts(newAlerts);
  }, [currentMonth, shifts, staffList, requiredCounts]);

  useEffect(() => {
    localStorage.setItem('shifts-data', JSON.stringify(shifts));
    // シフト更新時にバリデーション
    validateShifts();
  }, [shifts, validateShifts]);

  // 月変更
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => ({
      year: prev.month === 1 ? prev.year - 1 : prev.year,
      month: prev.month === 1 ? 12 : prev.month - 1,
    }));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => ({
      year: prev.month === 12 ? prev.year + 1 : prev.year,
      month: prev.month === 12 ? 1 : prev.month + 1,
    }));
  };

  // シフト更新
  const handleUpdateShift = (assignment: ShiftAssignment) => {
    setShifts((prev) => {
      const filtered = prev.filter(
        (s) => !(s.staffId === assignment.staffId && s.date === assignment.date)
      );
      return [...filtered, assignment];
    });
  };

  // 自動生成
  const handleGenerate = async () => {
    if (staffList.length === 0) {
      toast.error('スタッフが登録されていません');
      return;
    }

    setIsGenerating(true);
    toast.loading('シフトを自動生成中...', { id: 'generating' });

    try {
      // 設定を準備
      const daysInMonth = getDaysInMonth(new Date(currentMonth.year, currentMonth.month - 1));
      const requiredStaffCounts: MonthlySettings['requiredStaffCounts'] = {};

      for (let i = 0; i < daysInMonth; i++) {
        const date = format(
          addDays(startOfMonth(new Date(currentMonth.year, currentMonth.month - 1)), i),
          'yyyy-MM-dd'
        );
        requiredStaffCounts[date] = {
          早番: requiredCounts.A2,
          遅番: requiredCounts.B3 + requiredCounts.B5, // 合計
          夜勤: requiredCounts.N1,
        };
      }

      const settings: MonthlySettings = {
        year: currentMonth.year,
        month: currentMonth.month,
        requiredStaffCounts,
        holidayCount: 9,
        nightShiftPattern,
      };

      // 前月データ（簡易版、実際は前月のシフトを参照）
      const prevMonthData: ShiftAssignment[] = [];

      // 自動生成実行
      const generated = generateMonthlyShift(
        currentMonth.year,
        currentMonth.month,
        staffList,
        settings,
        prevMonthData,
        shifts
      );

      setShifts(generated);
      toast.success('シフトを自動生成しました！', { id: 'generating' });
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'シフト生成に失敗しました',
        { id: 'generating' }
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className={`${activeTab === 'shift' ? 'w-full px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} py-4`}>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              特養シフト管理システム
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <span className="text-lg font-semibold px-4">
                {currentMonth.year}年 {currentMonth.month}月
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className={`${activeTab === 'shift' ? 'w-full px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} mt-6`}>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('shift')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'shift'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Calendar size={20} />
              シフト表
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'staff'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Users size={20} />
              スタッフ ({staffList.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Settings size={20} />
              設定
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className={`${activeTab === 'shift' ? 'w-full px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} ${alerts.length > 0 ? 'pb-[350px]' : 'pb-8'}`}>
        {activeTab === 'shift' && (
          <ShiftTable
            year={currentMonth.year}
            month={currentMonth.month}
            staffList={staffList}
            shifts={shifts}
            onUpdateShift={handleUpdateShift}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}
        {activeTab === 'staff' && (
          <StaffManagement staffList={staffList} onUpdate={setStaffList} />
        )}
        {activeTab === 'settings' && (
          <SettingsPanel
            defaultCounts={requiredCounts}
            defaultPattern={nightShiftPattern}
            onUpdate={(counts, pattern) => {
              setRequiredCounts(counts);
              setNightShiftPattern(pattern);
              toast.success('設定を保存しました');
            }}
          />
        )}
      </div>

      {/* Alert Panel */}
      <AlertPanel alerts={alerts} />
    </div>
  );
}

export default App;
