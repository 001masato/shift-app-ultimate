import React, { useState } from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import type { Staff, ShiftAssignment } from '../types';
import { SHIFT_CODES } from '../constants/shifts';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';

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

    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const date = addDays(startOfMonth(new Date(year, month - 1)), i);
        return format(date, 'yyyy-MM-dd');
    });

    const getShift = (staffId: string, date: string): string => {
        const assignment = shifts.find((s) => s.staffId === staffId && s.date === date);
        return assignment?.shiftCode || '';
    };

    const handleCellClick = (staffId: string, date: string) => {
        setSelectedCell({ staffId, date });
    };

    const handleShiftChange = (staffId: string, date: string, shiftCode: string) => {
        onUpdateShift({ staffId, date, shiftCode });
        setSelectedCell(null);
    };

    // シフトコードの選択肢（よく使うものを優先）
    const commonShiftCodes = ['A2', 'D1', 'D3', 'B3', 'B5', 'N1', '公', '年'];
    const otherShiftCodes = Object.keys(SHIFT_CODES).filter(
        (code) => !commonShiftCodes.includes(code)
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar size={28} />
                        {year}年 {month}月 シフト表
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        セルをクリックしてシフトを編集できます
                    </p>
                </div>
                <button
                    onClick={onGenerate}
                    disabled={isGenerating || staffList.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                    <Sparkles size={20} />
                    {isGenerating ? '生成中...' : 'シフト自動生成'}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 z-20">
                                スタッフ名
                            </th>
                            {dates.map((date, index) => {
                                const day = new Date(date).getDate();
                                const dayOfWeek = new Date(date).getDay();
                                const isSunday = dayOfWeek === 0;
                                const isSaturday = dayOfWeek === 6;

                                return (
                                    <th
                                        key={date}
                                        className={`px-2 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[60px] ${isSunday ? 'text-red-600' : isSaturday ? 'text-blue-600' : 'text-gray-500'
                                            }`}
                                    >
                                        {day}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {staffList.length === 0 ? (
                            <tr>
                                <td colSpan={daysInMonth + 1} className="px-6 py-8 text-center text-gray-500">
                                    スタッフが登録されていません。「スタッフ」タブから登録してください。
                                </td>
                            </tr>
                        ) : (
                            staffList.map((staff) => (
                                <tr key={staff.id} className="hover:bg-gray-50">
                                    <td className="sticky left-0 bg-white px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                                        <div>
                                            <div>{staff.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {staff.employmentType === 'full_time' ? '常勤' : 'パート'}
                                            </div>
                                        </div>
                                    </td>
                                    {dates.map((date) => {
                                        const shiftCode = getShift(staff.id, date);
                                        const shiftData = shiftCode ? SHIFT_CODES[shiftCode] : null;
                                        const isSelected =
                                            selectedCell?.staffId === staff.id && selectedCell?.date === date;

                                        return (
                                            <td
                                                key={date}
                                                onClick={() => handleCellClick(staff.id, date)}
                                                className={`px-2 py-3 text-center text-sm cursor-pointer relative group ${isSelected ? 'ring-2 ring-blue-500' : ''
                                                    }`}
                                            >
                                                <div
                                                    className={`px-2 py-1 rounded transition-all ${shiftData?.isOff
                                                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                                            : shiftData?.isNightShift
                                                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                                                : shiftData?.type === '早番'
                                                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                                    : shiftData?.type === '遅番'
                                                                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                                        : shiftData?.type === '日勤'
                                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                                            : 'bg-gray-50 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {shiftCode || '-'}
                                                </div>

                                                {/* ドロップダウン */}
                                                {isSelected && (
                                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[120px]">
                                                        <div className="p-2 space-y-1">
                                                            <div className="text-xs text-gray-500 font-medium px-2 py-1">
                                                                よく使うシフト
                                                            </div>
                                                            {commonShiftCodes.map((code) => (
                                                                <button
                                                                    key={code}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleShiftChange(staff.id, date, code);
                                                                    }}
                                                                    className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                                                                >
                                                                    {code} - {SHIFT_CODES[code]?.name}
                                                                </button>
                                                            ))}
                                                            <div className="border-t border-gray-200 my-1"></div>
                                                            <div className="text-xs text-gray-500 font-medium px-2 py-1">
                                                                その他
                                                            </div>
                                                            {otherShiftCodes.map((code) => (
                                                                <button
                                                                    key={code}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleShiftChange(staff.id, date, code);
                                                                    }}
                                                                    className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                                                                >
                                                                    {code} - {SHIFT_CODES[code]?.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 凡例 */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 border border-blue-200 rounded"></div>
                    早番
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-100 border border-green-200 rounded"></div>
                    日勤
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-100 border border-yellow-200 rounded"></div>
                    遅番
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-100 border border-purple-200 rounded"></div>
                    夜勤
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-100 border border-red-200 rounded"></div>
                    休み
                </div>
            </div>
        </div>
    );
};
