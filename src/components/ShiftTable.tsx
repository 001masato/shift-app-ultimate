import React, { useState, useRef } from 'react';
import { Calendar, Sparkles, Command, X, Download, Settings, ZoomIn, ZoomOut } from 'lucide-react';
import type { Staff, ShiftAssignment } from '../types';
import { SHIFT_CODES } from '../constants/shifts';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { exportShiftTableToCSV, downloadCSV } from '../lib/csvExport';

interface ShiftTableProps {
    year: number;
    month: number;
    staffList: Staff[];
    shifts: ShiftAssignment[];
    onUpdateShift: (assignment: ShiftAssignment) => void;
    onGenerate: () => void;
    isGenerating?: boolean;
}

export const ShiftTable: React.FC<ShiftTableProps> = ({
    year,
    month,
    staffList,
    shifts,
    onUpdateShift,
    onGenerate,
    isGenerating = false,
}) => {
    const [selectedCell, setSelectedCell] = useState<{ staffId: string; date: string } | null>(null);
    const [copiedShiftCode, setCopiedShiftCode] = useState<string | null>(null);
    const [showViewSettings, setShowViewSettings] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [rowHeight, setRowHeight] = useState<'compact' | 'normal' | 'relaxed'>('normal');
    const [colWidth, setColWidth] = useState<'compact' | 'normal' | 'wide'>('normal');
    const [showDetailedStats, setShowDetailedStats] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const date = addDays(startOfMonth(new Date(year, month - 1)), i);
        return format(date, 'yyyy-MM-dd');
    });

    // スタイル設定
    const getColWidthClass = () => {
        switch (colWidth) {
            case 'compact': return 'min-w-[30px] px-0.5';
            case 'wide': return 'min-w-[60px] px-2';
            default: return 'min-w-[40px] px-1';
        }
    };

    const getCellContentClass = () => {
        switch (rowHeight) {
            case 'compact': return 'h-7 text-xs';
            case 'relaxed': return 'h-12 text-base';
            default: return 'h-9 text-sm';
        }
    };

    const getShift = (staffId: string, date: string): string => {
        const assignment = shifts.find((s) => s.staffId === staffId && s.date === date);
        return assignment?.shiftCode || '';
    };

    const handleCellClick = (staffId: string, date: string) => {
        setSelectedCell({ staffId, date });
        tableRef.current?.focus();
    };

    const handleShiftChange = (staffId: string, date: string, shiftCode: string) => {
        onUpdateShift({ staffId, date, shiftCode });
        setSelectedCell(null);
        tableRef.current?.focus();
    };

    const handleClearShift = (staffId: string, date: string) => {
        onUpdateShift({ staffId, date, shiftCode: '' });
        setSelectedCell(null);
        tableRef.current?.focus();
    };

    const handleDownloadCSV = () => {
        const csv = exportShiftTableToCSV(year, month, staffList, shifts);
        downloadCSV(csv, `shift_table_${year}_${month}.csv`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!selectedCell) return;

        const numberShiftMap: Record<string, string> = {
            '1': 'A2', '2': 'D1', '3': 'B3', '4': 'B5',
            '5': 'N1', '6': '公', '7': '年', '8': '希', '9': '委'
        };

        if (numberShiftMap[e.key]) {
            e.preventDefault();
            handleShiftChange(selectedCell.staffId, selectedCell.date, numberShiftMap[e.key]);
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            const shiftCode = getShift(selectedCell.staffId, selectedCell.date);
            setCopiedShiftCode(shiftCode);
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedShiftCode) {
            e.preventDefault();
            handleShiftChange(selectedCell.staffId, selectedCell.date, copiedShiftCode);
            return;
        }

        const staffIndex = staffList.findIndex(s => s.id === selectedCell.staffId);
        const dateIndex = dates.indexOf(selectedCell.date);

        if (staffIndex === -1 || dateIndex === -1) return;

        let newStaffIndex = staffIndex;
        let newDateIndex = dateIndex;
        let handled = false;

        switch (e.key) {
            case 'ArrowUp':
                newStaffIndex = Math.max(0, staffIndex - 1);
                handled = true;
                break;
            case 'ArrowDown':
                newStaffIndex = Math.min(staffList.length - 1, staffIndex + 1);
                handled = true;
                break;
            case 'ArrowLeft':
                newDateIndex = Math.max(0, dateIndex - 1);
                handled = true;
                break;
            case 'ArrowRight':
                newDateIndex = Math.min(dates.length - 1, dateIndex + 1);
                handled = true;
                break;
            case 'Enter':
                handled = true;
                break;
            case 'Escape':
                setSelectedCell(null);
                handled = true;
                break;
            case 'Delete':
            case 'Backspace':
                handleClearShift(selectedCell.staffId, selectedCell.date);
                handled = true;
                break;
        }

        if (handled) {
            e.preventDefault();
            if (newStaffIndex !== staffIndex || newDateIndex !== dateIndex) {
                const newStaff = staffList[newStaffIndex];
                const newDate = dates[newDateIndex];
                setSelectedCell({ staffId: newStaff.id, date: newDate });

                const cellId = `cell-${newStaff.id}-${newDate}`;
                const element = document.getElementById(cellId);
                element?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        }
    };

    const commonShiftCodes = ['A2', 'D1', 'D3', 'B3', 'B5', 'N1', '公', '年', '希'];
    const otherShiftCodes = Object.keys(SHIFT_CODES).filter(
        (code) => !commonShiftCodes.includes(code)
    );

    // 全シフトコードのリスト
    const allShiftCodes = Object.keys(SHIFT_CODES);

    const calculateStaffCounts = (staffId: string) => {
        const staffShifts = shifts.filter(s => s.staffId === staffId && s.shiftCode);
        const counts: Record<string, number> = {};

        staffShifts.forEach(s => {
            if (!counts[s.shiftCode]) counts[s.shiftCode] = 0;
            counts[s.shiftCode]++;
        });

        const dayCount = (counts['A2'] || 0) + (counts['D1'] || 0) + (counts['D3'] || 0);
        const nightCount = (counts['N1'] || 0) + (counts['B3'] || 0) + (counts['B5'] || 0);
        const offCount = (counts['公'] || 0) + (counts['年'] || 0) + (counts['希'] || 0);

        return { day: dayCount, night: nightCount, off: offCount, details: counts };
    };

    const calculateDailyCounts = (date: string) => {
        const dailyShifts = shifts.filter(s => s.date === date && s.shiftCode);
        const counts: Record<string, number> = {};

        dailyShifts.forEach(s => {
            if (!counts[s.shiftCode]) counts[s.shiftCode] = 0;
            counts[s.shiftCode]++;
        });

        const total = dailyShifts.filter(s => !SHIFT_CODES[s.shiftCode]?.isOff).length;
        const n1 = counts['N1'] || 0;

        return { total, N1: n1, details: counts };
    };

    return (
        <div className="p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 flex items-center gap-3">
                        <Calendar className="text-purple-600" size={32} />
                        {year}年 {month}月 シフト表
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                        <Command size={14} />
                        数字キー(1-9)で即入力、Ctrl+C/Vでコピペ
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        1:A2  2:D1  3:B3  4:B5  5:N1  6:公  7:年  8:希  9:委
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setShowViewSettings(!showViewSettings)}
                            className={`flex items-center gap-2 px-4 py-3 bg-white text-gray-700 border rounded-xl hover:bg-gray-50 transition-all shadow-sm ${showViewSettings ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200'}`}
                            title="表示設定"
                        >
                            <Settings size={20} />
                            <span className="font-medium">表示</span>
                        </button>

                        {showViewSettings && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">表示設定</h3>

                                <div className="mb-4">
                                    <label className="text-xs text-gray-500 mb-1 block">ズーム</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomOut size={16} /></button>
                                        <span className="text-sm w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                                        <button onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomIn size={16} /></button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="text-xs text-gray-500 mb-1 block">行の高さ</label>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        {(['compact', 'normal', 'relaxed'] as const).map((h) => (
                                            <button
                                                key={h}
                                                onClick={() => setRowHeight(h)}
                                                className={`flex-1 text-xs py-1 rounded-md transition-all ${rowHeight === h ? 'bg-white shadow-sm text-purple-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {h === 'compact' ? '小' : h === 'normal' ? '中' : '大'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="text-xs text-gray-500 mb-1 block">列の幅</label>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        {(['compact', 'normal', 'wide'] as const).map((w) => (
                                            <button
                                                key={w}
                                                onClick={() => setColWidth(w)}
                                                className={`flex-1 text-xs py-1 rounded-md transition-all ${colWidth === w ? 'bg-white shadow-sm text-purple-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {w === 'compact' ? '狭' : w === 'normal' ? '中' : '広'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showDetailedStats}
                                            onChange={(e) => setShowDetailedStats(e.target.checked)}
                                            className="rounded text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-gray-700">詳細集計を表示</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleDownloadCSV}
                        className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        title="CSV出力"
                    >
                        <Download size={20} />
                        <span className="font-medium">CSV</span>
                    </button>
                    <button
                        onClick={onGenerate}
                        disabled={isGenerating || staffList.length === 0}
                        className="group relative flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Sparkles size={20} className={isGenerating ? 'animate-spin' : ''} />
                        <span className="relative font-medium">{isGenerating ? 'AI生成中...' : 'シフト自動生成'}</span>
                    </button>
                </div>
            </div>

            <div
                className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden outline-none ring-1 ring-gray-100 transition-all duration-200"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', width: `${100 / zoomLevel}%` }}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                ref={tableRef}
            >
                <div className="overflow-auto max-h-[calc(100vh-250px)]">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/90 backdrop-blur sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="sticky left-0 bg-gray-50/95 backdrop-blur px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] min-w-[150px]">
                                    スタッフ名
                                </th>
                                {dates.map((date) => {
                                    const day = new Date(date).getDate();
                                    const dayOfWeek = new Date(date).getDay();
                                    const isSunday = dayOfWeek === 0;
                                    const isSaturday = dayOfWeek === 6;

                                    return (
                                        <th
                                            key={date}
                                            className={`${getColWidthClass()} py-4 text-center text-xs font-semibold uppercase tracking-wider ${isSunday ? 'text-red-500 bg-red-50/30' :
                                                isSaturday ? 'text-blue-500 bg-blue-50/30' :
                                                    'text-gray-500'
                                                }`}
                                        >
                                            {day}
                                            <div className="text-[10px] mt-0.5 opacity-70">
                                                {['日', '月', '火', '水', '木', '金', '土'][dayOfWeek]}
                                            </div>
                                        </th>
                                    );
                                })}

                                {/* 集計ヘッダー */}
                                {showDetailedStats ? (
                                    allShiftCodes.map(code => (
                                        <th key={code} className="sticky right-0 bg-gray-50/95 backdrop-blur px-1 py-4 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-l border-gray-200 z-30 min-w-[30px]">
                                            {code}
                                        </th>
                                    ))
                                ) : (
                                    <>
                                        <th className="sticky right-0 bg-gray-50/95 backdrop-blur px-2 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-l border-gray-200 z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] min-w-[80px]">
                                            出勤
                                        </th>
                                        <th className="sticky right-[80px] bg-gray-50/95 backdrop-blur px-2 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-l border-gray-200 z-30 min-w-[60px]">
                                            夜勤
                                        </th>
                                        <th className="sticky right-[140px] bg-gray-50/95 backdrop-blur px-2 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-l border-gray-200 z-30 min-w-[60px]">
                                            休日
                                        </th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white/50 divide-y divide-gray-100">
                            {staffList.length === 0 ? (
                                <tr>
                                    <td colSpan={daysInMonth + 4 + (showDetailedStats ? allShiftCodes.length : 0)} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                                <Calendar size={24} className="text-gray-400" />
                                            </div>
                                            <p>スタッフが登録されていません</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                staffList.map((staff) => {
                                    const counts = calculateStaffCounts(staff.id);
                                    return (
                                        <tr key={staff.id} className="hover:bg-purple-50/30 transition-colors duration-150 group">
                                            <td className="sticky left-0 bg-white/95 backdrop-blur px-4 py-3 whitespace-nowrap border-r border-gray-100 z-10 group-hover:bg-purple-50/50 transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1 h-8 rounded-full ${staff.employmentType === 'full_time' ? 'bg-gradient-to-b from-blue-400 to-blue-600' : 'bg-gradient-to-b from-orange-400 to-orange-600'
                                                        }`} />
                                                    <div>
                                                        <div className="font-medium text-gray-800">{staff.name}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                                                            {staff.employmentType === 'full_time' ? 'Full Time' : 'Part Time'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {dates.map((date) => {
                                                const shiftCode = getShift(staff.id, date);
                                                const shiftData = shiftCode ? SHIFT_CODES[shiftCode] : null;
                                                const isSelected = selectedCell?.staffId === staff.id && selectedCell?.date === date;
                                                const cellId = `cell-${staff.id}-${date}`;

                                                return (
                                                    <td
                                                        key={date}
                                                        id={cellId}
                                                        onClick={() => handleCellClick(staff.id, date)}
                                                        className={`p-1 text-center relative transition-all duration-200 ${isSelected ? 'z-20' : 'z-0'
                                                            }`}
                                                    >
                                                        <div
                                                            className={`
                                                                w-full ${getCellContentClass()} rounded-lg flex items-center justify-center font-medium transition-all duration-200 cursor-pointer
                                                                ${isSelected
                                                                    ? 'ring-2 ring-purple-500 shadow-lg scale-110 bg-white z-20'
                                                                    : 'hover:scale-105 hover:shadow-md'
                                                                }
                                                                ${!shiftCode && !isSelected ? 'hover:bg-gray-50' : ''}
                                                                ${shiftData?.isOff
                                                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                                                    : shiftData?.isNightShift
                                                                        ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                                                        : shiftData?.type === '早番'
                                                                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                            : shiftData?.type === '遅番'
                                                                                ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                                                                : shiftData?.type === '日勤'
                                                                                    ? 'bg-green-50 text-green-600 border border-green-100'
                                                                                    : shiftCode
                                                                                        ? 'bg-gray-50 text-gray-600 border border-gray-200'
                                                                                        : ''
                                                                }
                                                            `}
                                                        >
                                                            {shiftCode}
                                                        </div>

                                                        {/* ドロップダウン */}
                                                        {isSelected && (
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-50 min-w-[200px] p-2 animate-in fade-in zoom-in-95 duration-200">
                                                                <div className="flex justify-between items-center px-2 py-1 mb-1">
                                                                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                                                        Quick Select
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleClearShift(staff.id, date);
                                                                        }}
                                                                        className="text-xs text-red-500 hover:bg-red-50 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                                                                    >
                                                                        <X size={12} />
                                                                        クリア
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-1 mb-2">
                                                                    {commonShiftCodes.map((code) => (
                                                                        <button
                                                                            key={code}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleShiftChange(staff.id, date, code);
                                                                            }}
                                                                            className="flex items-center justify-center px-2 py-2 text-sm hover:bg-purple-50 text-gray-700 hover:text-purple-700 rounded-lg transition-colors border border-gray-100"
                                                                        >
                                                                            <span className="font-medium">{code}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="border-t border-gray-100 my-1"></div>
                                                                <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                                                                    {otherShiftCodes.map((code) => (
                                                                        <button
                                                                            key={code}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleShiftChange(staff.id, date, code);
                                                                            }}
                                                                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-600 rounded-lg transition-colors flex items-center justify-between group"
                                                                        >
                                                                            <span className="font-medium group-hover:text-purple-600">{code}</span>
                                                                            <span className="text-gray-400 text-[10px]">{SHIFT_CODES[code]?.name}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            {/* 右側の集計カラム */}
                                            {showDetailedStats ? (
                                                allShiftCodes.map(code => (
                                                    <td key={code} className="sticky right-0 bg-white/95 backdrop-blur px-1 py-3 text-center text-xs font-medium text-gray-600 border-l border-gray-100 z-10">
                                                        {counts.details[code] || '-'}
                                                    </td>
                                                ))
                                            ) : (
                                                <>
                                                    <td className="sticky right-0 bg-white/95 backdrop-blur px-2 py-3 text-center text-sm font-medium text-gray-600 border-l border-gray-100 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                                        {counts.day}
                                                    </td>
                                                    <td className="sticky right-[80px] bg-white/95 backdrop-blur px-2 py-3 text-center text-sm font-medium text-purple-600 border-l border-gray-100 z-10">
                                                        {counts.night}
                                                    </td>
                                                    <td className="sticky right-[140px] bg-white/95 backdrop-blur px-2 py-3 text-center text-sm font-medium text-red-600 border-l border-gray-100 z-10">
                                                        {counts.off}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                            {/* 下部の集計行 */}
                            <tr className="bg-gray-50/90 backdrop-blur font-semibold border-t-2 border-gray-200">
                                <td className="sticky left-0 bg-gray-50/95 backdrop-blur px-4 py-3 text-sm text-gray-600 border-r border-gray-200 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                    日勤計
                                </td>
                                {dates.map((date) => {
                                    const counts = calculateDailyCounts(date);
                                    return (
                                        <td key={`total-${date}`} className="px-2 py-3 text-center text-xs text-gray-600">
                                            {counts.total}
                                        </td>
                                    );
                                })}
                                <td colSpan={showDetailedStats ? allShiftCodes.length : 3} className="sticky right-0 bg-gray-50/95 backdrop-blur z-30"></td>
                            </tr>
                            <tr className="bg-gray-50/90 backdrop-blur border-t border-gray-100">
                                <td className="sticky left-0 bg-gray-50/95 backdrop-blur px-4 py-2 text-xs text-gray-500 border-r border-gray-200 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                    夜勤
                                </td>
                                {dates.map((date) => {
                                    const counts = calculateDailyCounts(date);
                                    return (
                                        <td key={`night-${date}`} className="px-2 py-2 text-center text-xs text-purple-600">
                                            {counts.N1 > 0 ? counts.N1 : '-'}
                                        </td>
                                    );
                                })}
                                <td colSpan={showDetailedStats ? allShiftCodes.length : 3} className="sticky right-0 bg-gray-50/95 backdrop-blur z-30"></td>
                            </tr>

                            {/* 詳細集計行 */}
                            {showDetailedStats && allShiftCodes.map(code => (
                                <tr key={`total-row-${code}`} className="bg-gray-50/90 backdrop-blur border-t border-gray-100">
                                    <td className="sticky left-0 bg-gray-50/95 backdrop-blur px-4 py-2 text-xs text-gray-500 border-r border-gray-200 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                        {code}
                                    </td>
                                    {dates.map((date) => {
                                        const counts = calculateDailyCounts(date);
                                        return (
                                            <td key={`${code}-${date}`} className="px-2 py-2 text-center text-xs text-gray-600">
                                                {counts.details[code] > 0 ? counts.details[code] : '-'}
                                            </td>
                                        );
                                    })}
                                    <td colSpan={allShiftCodes.length} className="sticky right-0 bg-gray-50/95 backdrop-blur z-30"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 凡例 */}
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-gray-600 bg-white/50 backdrop-blur p-4 rounded-xl border border-white/20 shadow-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    早番
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    日勤
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    遅番
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    夜勤
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    休日
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    その他 (委員会・研修など)
                </div>
            </div>
        </div>
    );
};
