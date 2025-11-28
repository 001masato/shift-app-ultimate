import type { ShiftAssignment } from '../types';
import { SHIFT_CODES, CONSTRAINT_RULES } from '../constants/shifts';
import { parseISO, addDays, format } from 'date-fns';

/**
 * 連続勤務日数をチェックする
 * @param currentShifts 当月のシフト割り当てリスト (日付順不同可)
 * @param previousMonthLastWeek 前月の最終週の勤務実績 (日付昇順)
 * @param targetDate チェック対象の日付 (YYYY-MM-DD)
 * @param staffId スタッフID
 * @returns 連続勤務日数
 */
export const checkConsecutiveWork = (
    currentShifts: ShiftAssignment[],
    previousMonthLastWeek: ShiftAssignment[],
    targetDate: string,
    staffId: string
): number => {
    const target = parseISO(targetDate);
    let consecutiveDays = 0;

    // 1. 当月のシフトから過去に遡ってチェック
    // targetDateの前日から遡る
    let checkDate = addDays(target, -1);

    while (true) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');

        // 当月のシフトを探す
        const shift = currentShifts.find(s => s.date === dateStr && s.staffId === staffId);

        if (shift) {
            const shiftInfo = SHIFT_CODES[shift.shiftCode];
            if (shiftInfo && !shiftInfo.isOff) {
                consecutiveDays++;
                checkDate = addDays(checkDate, -1);
                continue;
            }
        } else {
            // 当月にデータがない場合、前月データをチェックするか終了するか
            // 前月データの範囲内かチェック
            const prevShift = previousMonthLastWeek.find(s => s.date === dateStr && s.staffId === staffId);
            if (prevShift) {
                const shiftInfo = SHIFT_CODES[prevShift.shiftCode];
                if (shiftInfo && !shiftInfo.isOff) {
                    consecutiveDays++;
                    checkDate = addDays(checkDate, -1);
                    continue;
                }
            }
        }

        // 休みまたはデータなしで連勤ストップ
        break;
    }

    return consecutiveDays;
};

/**
 * シフト割り当てが妥当か検証する
 * @param assignment 検証対象の割り当て
 * @param currentShifts 既に確定している当月のシフト
 * @param previousMonthLastWeek 前月の勤務実績
 * @returns エラーメッセージ (問題なければ null)
 */
export const validateShift = (
    assignment: ShiftAssignment,
    currentShifts: ShiftAssignment[],
    previousMonthLastWeek: ShiftAssignment[]
): string | null => {
    const shiftInfo = SHIFT_CODES[assignment.shiftCode];
    if (!shiftInfo) return '無効なシフトコードです';

    // 休日ならチェック不要（連勤リセットされるため）
    if (shiftInfo.isOff) return null;

    // 1. 連勤チェック
    const consecutiveDays = checkConsecutiveWork(currentShifts, previousMonthLastWeek, assignment.date, assignment.staffId);

    if (consecutiveDays >= CONSTRAINT_RULES.maxConsecutiveWorkDays) {
        return `連勤制限(${CONSTRAINT_RULES.maxConsecutiveWorkDays}日)を超過します (現在${consecutiveDays}連勤中)`;
    }

    // 2. 夜勤明けチェック (前日が夜勤なら、今日は休みでなければならない)
    const prevDate = format(addDays(parseISO(assignment.date), -1), 'yyyy-MM-dd');
    const prevShift = currentShifts.find(s => s.date === prevDate && s.staffId === assignment.staffId) ||
        previousMonthLastWeek.find(s => s.date === prevDate && s.staffId === assignment.staffId);

    if (prevShift) {
        const prevShiftInfo = SHIFT_CODES[prevShift.shiftCode];
        if (prevShiftInfo?.isNightShift && !shiftInfo.isOff) {
            return '夜勤の翌日は休日である必要があります';
        }
    }

    return null;
};
