import { describe, it, expect } from 'vitest';
import { checkConsecutiveWork, validateShift } from './shiftLogic';
import type { ShiftAssignment } from '../types';

describe('Shift Logic', () => {
    const staffId = 'staff1';

    describe('checkConsecutiveWork', () => {
        it('should return 0 if previous day was OFF', () => {
            const currentShifts: ShiftAssignment[] = [
                { date: '2025-02-01', staffId, shiftCode: '公' }, // 2/1 is OFF
            ];
            const prevMonth: ShiftAssignment[] = [];

            // Check for 2/2
            const result = checkConsecutiveWork(currentShifts, prevMonth, '2025-02-02', staffId);
            expect(result).toBe(0);
        });

        it('should count consecutive days within current month', () => {
            const currentShifts: ShiftAssignment[] = [
                { date: '2025-02-01', staffId, shiftCode: 'D1' },
                { date: '2025-02-02', staffId, shiftCode: 'D1' },
                { date: '2025-02-03', staffId, shiftCode: 'D1' },
            ];
            const prevMonth: ShiftAssignment[] = [];

            // Check for 2/4 (should be 3 days: 1, 2, 3)
            const result = checkConsecutiveWork(currentShifts, prevMonth, '2025-02-04', staffId);
            expect(result).toBe(3);
        });

        it('should count consecutive days across months', () => {
            // Previous month (Jan) ends with 3 days of work
            const prevMonth: ShiftAssignment[] = [
                { date: '2025-01-29', staffId, shiftCode: 'D1' },
                { date: '2025-01-30', staffId, shiftCode: 'D1' },
                { date: '2025-01-31', staffId, shiftCode: 'D1' },
            ];

            // Current month (Feb) starts with 2 days of work
            const currentShifts: ShiftAssignment[] = [
                { date: '2025-02-01', staffId, shiftCode: 'D1' },
                { date: '2025-02-02', staffId, shiftCode: 'D1' },
            ];

            // Check for 2/3 (should be 3 (Jan) + 2 (Feb) = 5 days)
            const result = checkConsecutiveWork(currentShifts, prevMonth, '2025-02-03', staffId);
            expect(result).toBe(5);
        });
    });

    describe('validateShift', () => {
        it('should allow 6th consecutive work day', () => {
            const prevMonth: ShiftAssignment[] = [];
            const currentShifts: ShiftAssignment[] = [
                { date: '2025-02-01', staffId, shiftCode: 'D1' },
                { date: '2025-02-02', staffId, shiftCode: 'D1' },
                { date: '2025-02-03', staffId, shiftCode: 'D1' },
                { date: '2025-02-04', staffId, shiftCode: 'D1' },
                { date: '2025-02-05', staffId, shiftCode: 'D1' },
            ];

            // Trying to add 6th day
            const assignment: ShiftAssignment = { date: '2025-02-06', staffId, shiftCode: 'D1' };

            const error = validateShift(assignment, currentShifts, prevMonth);
            expect(error).toBeNull();
        });

        it('should prevent 7th consecutive work day', () => {
            const prevMonth: ShiftAssignment[] = [];
            const currentShifts: ShiftAssignment[] = [
                { date: '2025-02-01', staffId, shiftCode: 'D1' },
                { date: '2025-02-02', staffId, shiftCode: 'D1' },
                { date: '2025-02-03', staffId, shiftCode: 'D1' },
                { date: '2025-02-04', staffId, shiftCode: 'D1' },
                { date: '2025-02-05', staffId, shiftCode: 'D1' },
                { date: '2025-02-06', staffId, shiftCode: 'D1' },
            ];

            // Trying to add 7th day
            const assignment: ShiftAssignment = { date: '2025-02-07', staffId, shiftCode: 'D1' };

            const error = validateShift(assignment, currentShifts, prevMonth);
            expect(error).toContain('連勤制限(6日)を超過します');
        });

        it('should prevent work after Night Shift (N1)', () => {
            const prevMonth: ShiftAssignment[] = [];
            const currentShifts: ShiftAssignment[] = [
                { date: '2025-02-01', staffId, shiftCode: 'N1' },
            ];

            // Trying to add work day after N1
            const assignment: ShiftAssignment = { date: '2025-02-02', staffId, shiftCode: 'D1' };

            const error = validateShift(assignment, currentShifts, prevMonth);
            expect(error).toContain('夜勤の翌日は休日である必要があります');
        });

        it('should allow Off after Night Shift (N1)', () => {
            const prevMonth: ShiftAssignment[] = [];
            const currentShifts: ShiftAssignment[] = [
                { date: '2025-02-01', staffId, shiftCode: 'N1' },
            ];

            // Trying to add Off after N1
            const assignment: ShiftAssignment = { date: '2025-02-02', staffId, shiftCode: '公' };

            const error = validateShift(assignment, currentShifts, prevMonth);
            expect(error).toBeNull();
        });
    });
});
