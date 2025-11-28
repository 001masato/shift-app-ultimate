import { describe, it, expect } from 'vitest';
import { generateMonthlyShift } from './autoGenerator';
import type { Staff, MonthlySettings, ShiftAssignment } from '../types';
import { format, startOfMonth, addDays, getDaysInMonth } from 'date-fns';

describe('Auto Generator v1.3 (Interval & Committee Logic)', () => {
    // Mock Staff (10名 - 実際の施設想定)
    const staffList: Staff[] = [
        { id: 's1', name: 'Staff 1', role: 'staff', employmentType: 'full_time', attributes: { canNightShift: true, canLeader: true }, contract: {} },
        { id: 's2', name: 'Staff 2', role: 'staff', employmentType: 'full_time', attributes: { canNightShift: true, canLeader: false }, contract: {} },
        { id: 's3', name: 'Staff 3', role: 'staff', employmentType: 'full_time', attributes: { canNightShift: true, canLeader: false }, contract: {} },
        { id: 's4', name: 'Staff 4', role: 'staff', employmentType: 'full_time', attributes: { canNightShift: true, canLeader: false }, contract: {} },
        { id: 's5', name: 'Staff 5', role: 'staff', employmentType: 'full_time', attributes: { canNightShift: false, canLeader: false }, contract: {} },
        { id: 's6', name: 'Staff 6', role: 'staff', employmentType: 'full_time', attributes: { canNightShift: false, canLeader: false }, contract: {} },
        { id: 's7', name: 'Staff 7', role: 'staff', employmentType: 'full_time', attributes: { canNightShift: false, canLeader: false }, contract: {} },
        { id: 's8', name: 'Staff 8', role: 'staff', employmentType: 'full_time', attributes: { canNightShift: false, canLeader: false }, contract: {} },
        { id: 's9', name: 'Staff 9', role: 'staff', employmentType: 'part_time', attributes: { canNightShift: false, canLeader: false }, contract: {} },
        { id: 's10', name: 'Staff 10', role: 'staff', employmentType: 'part_time', attributes: { canNightShift: false, canLeader: false }, contract: {} },
    ];

    // Mock Settings (Feb 2025 - 28 days)
    const year = 2025;
    const month = 2;
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));

    const requiredStaffCounts: MonthlySettings['requiredStaffCounts'] = {};
    for (let i = 0; i < daysInMonth; i++) {
        const date = format(addDays(startOfMonth(new Date(year, month - 1)), i), 'yyyy-MM-dd');
        requiredStaffCounts[date] = {
            '早番': 2,  // A2 = 2名
            '遅番': 2,  // B3 + B5 = 2名（自動的に分かれる）
            '夜勤': 1   // N1 = 1名
        };
    }

    const settings: MonthlySettings = {
        year,
        month,
        requiredStaffCounts,
        holidayCount: 9
    };

    it('should generate a valid monthly shift with v1.3 constraints', () => {
        const prevMonthData: ShiftAssignment[] = [];
        const committeeAssignments: Array<{ date: string; staffId: string }> = [];

        // Run generation
        const result = generateMonthlyShift(year, month, staffList, settings, prevMonthData, committeeAssignments);

        // 1. 全割り当て数の確認
        expect(result.length).toBe(staffList.length * daysInMonth);

        // 2. 日別の定数確認（N1=1, A2=2, B3=1, B5=1）
        for (let i = 0; i < daysInMonth; i++) {
            const date = format(addDays(startOfMonth(new Date(year, month - 1)), i), 'yyyy-MM-dd');
            const dayAssignments = result.filter(a => a.date === date);

            const n1Count = dayAssignments.filter(a => a.shiftCode === 'N1').length;
            const a2Count = dayAssignments.filter(a => a.shiftCode === 'A2').length;
            const b3Count = dayAssignments.filter(a => a.shiftCode === 'B3').length;
            const b5Count = dayAssignments.filter(a => a.shiftCode === 'B5').length;

            expect(n1Count).toBe(1); // N1 = 1名
            expect(a2Count).toBe(2); // A2 = 2名
            expect(b3Count).toBe(1); // B3 = 1名
            expect(b5Count).toBe(1); // B5 = 1名
        }

        // 3. インターバルルールの確認（B5 → A2/A3 禁止）
        for (const staff of staffList) {
            const staffAssignments = result.filter(a => a.staffId === staff.id).sort((a, b) => a.date.localeCompare(b.date));

            for (let i = 0; i < staffAssignments.length - 1; i++) {
                if (staffAssignments[i].shiftCode === 'B5') {
                    const nextShift = staffAssignments[i + 1].shiftCode;
                    // B5の翌日はA2/A3であってはならない
                    expect(['A2', 'A3'].includes(nextShift)).toBe(false);
                }
            }
        }

        // 4. 夜勤パターンの確認（N1 → Off → Off）
        for (const staff of staffList) {
            const staffAssignments = result.filter(a => a.staffId === staff.id).sort((a, b) => a.date.localeCompare(b.date));

            for (let i = 0; i < staffAssignments.length - 2; i++) {
                if (staffAssignments[i].shiftCode === 'N1') {
                    // 翌日は休み
                    expect(['公', '年', '産', '育'].includes(staffAssignments[i + 1].shiftCode)).toBe(true);
                    // 翌々日も休み（Pattern A）
                    expect(['公', '年', '産', '育'].includes(staffAssignments[i + 2].shiftCode)).toBe(true);
                }
            }
        }
    });

    it('should respect committee assignments (D3 or A2)', () => {
        const prevMonthData: ShiftAssignment[] = [];
        const committeeDate = format(addDays(startOfMonth(new Date(year, month - 1)), 5), 'yyyy-MM-dd');
        const committeeAssignments = [
            { date: committeeDate, staffId: 's5' }
        ];

        const result = generateMonthlyShift(year, month, staffList, settings, prevMonthData, committeeAssignments);

        // s5の委員会日のシフトがD3またはA2であることを確認
        const s5Committee = result.find(a => a.staffId === 's5' && a.date === committeeDate);
        expect(s5Committee).toBeDefined();
        expect(['D3', 'A2'].includes(s5Committee!.shiftCode)).toBe(true);
    });
});
