import type { ShiftAssignment, Staff, MonthlySettings } from '../types';
import { SHIFT_CODES } from '../constants/shifts';
import { validateShift } from './shiftLogic';
import { getDaysInMonth, format, startOfMonth, addDays, subDays } from 'date-fns';

/**
 * スタッフの夜勤回数をカウントする
 */
const countNightShifts = (assignments: ShiftAssignment[], staffId: string): number => {
    return assignments.filter(a => {
        if (a.staffId !== staffId) return false;
        const code = SHIFT_CODES[a.shiftCode];
        return code?.isNightShift;
    }).length;
};

/**
 * 指定した日の割り当てを取得
 */
const getAssignment = (assignments: ShiftAssignment[], date: string, staffId: string): ShiftAssignment | undefined => {
    return assignments.find(a => a.date === date && a.staffId === staffId);
};

/**
 * 前日がB5だったか確認する
 */
const hadB5Yesterday = (assignments: ShiftAssignment[], date: string, staffId: string): boolean => {
    const prevDate = subDays(new Date(date), 1);
    const prevDateStr = format(prevDate, 'yyyy-MM-dd');
    const prevAssignment = getAssignment(assignments, prevDateStr, staffId);
    return prevAssignment?.shiftCode === 'B5';
};

/**
 * 前日のシフトコードを取得
 */
const getPreviousShiftCode = (
    assignments: ShiftAssignment[],
    prevMonthData: ShiftAssignment[],
    date: string,
    staffId: string
): string | null => {
    const prevDate = subDays(new Date(date), 1);
    const prevDateStr = format(prevDate, 'yyyy-MM-dd');

    const prevAssignment = getAssignment(assignments, prevDateStr, staffId) ||
        prevMonthData.find(a => a.date === prevDateStr && a.staffId === staffId);

    return prevAssignment?.shiftCode || null;
};



/**
 * 直近の連続勤務日数を計算（休みが来るまで遡る）
 */
const getRecentConsecutiveWorkDays = (
    assignments: ShiftAssignment[],
    prevMonthData: ShiftAssignment[],
    date: string,
    staffId: string
): number => {
    let count = 0;
    let checkDate = subDays(new Date(date), 1);

    // 最大10日遡る
    for (let i = 0; i < 10; i++) {
        const checkDateStr = format(checkDate, 'yyyy-MM-dd');
        const assignment = getAssignment(assignments, checkDateStr, staffId) ||
            prevMonthData.find(a => a.date === checkDateStr && a.staffId === staffId);

        if (!assignment) break;

        const code = SHIFT_CODES[assignment.shiftCode];
        if (code?.isOff) break; // 休みが来たら終了

        count++;
        checkDate = subDays(checkDate, 1);
    }

    return count;
};

/**
 * シフトの負荷スコア（早番=1, 日勤=2, 遅番=3, 夜勤=4, 休み=0）
 */
const getShiftLoad = (shiftCode: string): number => {
    const shift = SHIFT_CODES[shiftCode];
    if (!shift) return 0;
    if (shift.isOff) return 0;
    if (shift.isNightShift) return 4;
    if (shift.type === '遅番') return 3;
    if (shift.type === '日勤') return 2;
    if (shift.type === '早番') return 1;
    return 2; // デフォルト
};

/**
 * 候補者をスコアリング（低い方が優先）
 */
const scoreCandidate = (
    staff: Staff,
    targetShiftCode: string,
    date: string,
    assignments: ShiftAssignment[],
    prevMonthData: ShiftAssignment[],
    nightShiftPattern: 'patternA' | 'patternB' = 'patternA'
): number => {
    let score = 0;

    // 1. 連続勤務日数（重要度: 高）
    const consecutiveDays = getRecentConsecutiveWorkDays(assignments, prevMonthData, date, staff.id);
    score += consecutiveDays * 10; // 連続勤務が多いほどスコアが高い（＝優先度が低い）

    // 2. 前日のシフトとの相性
    const prevShift = getPreviousShiftCode(assignments, prevMonthData, date, staff.id);
    const prevPrevShift = getPreviousShiftCode(assignments, prevMonthData, format(addDays(new Date(date), -1), 'yyyy-MM-dd'), staff.id);
    const prevLoad = prevShift ? getShiftLoad(prevShift) : 0;
    const currentLoad = getShiftLoad(targetShiftCode);

    // 休み明けは軽いシフト（早番）が望ましい
    if (prevLoad === 0 && currentLoad > 1) {
        score += 5; // 休み明けなのに遅番や夜勤は避けたい
    }

    // 負荷が下がる（遅番→早番など）のは避けたい
    if (prevLoad > currentLoad && prevLoad > 0) {
        score += 3;
    }

    // 3. 同じシフトの連続を避ける
    if (prevShift === targetShiftCode) {
        // 夜勤の連続はパターンによって評価が異なるためここでは除外
        if (!SHIFT_CODES[targetShiftCode]?.isNightShift) {
            score += 8;
        }
    }

    // 4. 夜勤の場合は夜勤回数も考慮
    if (SHIFT_CODES[targetShiftCode]?.isNightShift) {
        const nightCount = countNightShifts(assignments, staff.id);
        score += nightCount * 5;

        // 夜勤連続の判定
        if (prevShift === 'N1') {
            if (nightShiftPattern === 'patternA') {
                score += 2000; // パターンA: 連続夜勤を強く避ける
            } else {
                // パターンB: 2連夜勤を推奨
                if (prevPrevShift === 'N1') {
                    score += 2000; // 3連夜勤は避ける
                } else {
                    score -= 500; // 2連夜勤は推奨
                }
            }
        }
    }

    // 5. 夜勤明けの翌日 (N1 -> 公 -> [公])
    // パターンA: N1 -> 公 -> 公 (推奨)
    // パターンB: N1 -> N1 -> 公 -> 公 (推奨)
    if (prevPrevShift === 'N1' && prevShift === '公') {
        if (targetShiftCode === '公') {
            score -= 50; // 2連休を推奨
        }
    }

    // ランダム要素を追加（完全に決定的にならないように）
    score += Math.random() * 2;

    return score;
};

/**
 * 月間のシフトを自動生成する (v1.3.1 Balanced Allocation)
 */
export const generateMonthlyShift = (
    year: number,
    month: number,
    staffList: Staff[],
    _settings: MonthlySettings,
    prevMonthData: ShiftAssignment[],
    committeeAssignments: Array<{ date: string; staffId: string }> = [],
    maxRetries: number = 100
): ShiftAssignment[] => {
    const startDate = startOfMonth(new Date(year, month - 1));
    const daysInMonth = getDaysInMonth(startDate);
    const nightShiftPattern = _settings.nightShiftPattern || 'patternA';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const currentAssignments: ShiftAssignment[] = [];
            const assignedMap = new Set<string>();

            // ==========================================
            // Phase 0: 委員会・希望休の固定
            // ==========================================
            for (const committee of committeeAssignments) {
                const { date, staffId } = committee;
                let assigned = false;

                for (const shiftCode of ['D3', 'A2']) {
                    const assignment: ShiftAssignment = { date, staffId, shiftCode };
                    const error = validateShift(assignment, currentAssignments, prevMonthData);

                    if (!error) {
                        currentAssignments.push(assignment);
                        assignedMap.add(`${date}:${staffId}`);
                        assigned = true;
                        break;
                    }
                }

                if (!assigned) {
                    throw new Error(`Cannot assign committee shift for ${staffId} on ${date}`);
                }
            }

            // ==========================================
            // Phase 1: 夜勤 (N1) の配置
            // ==========================================
            for (let day = 0; day < daysInMonth; day++) {
                const currentDate = addDays(startDate, day);
                const dateStr = format(currentDate, 'yyyy-MM-dd');

                const requiredNight = 1;

                for (let i = 0; i < requiredNight; i++) {
                    const candidates = staffList.filter(staff => {
                        const key = `${dateStr}:${staff.id}`;
                        return !assignedMap.has(key) && staff.attributes.canNightShift;
                    });

                    // スコアリングでソート
                    candidates.sort((a, b) => {
                        const scoreA = scoreCandidate(a, 'N1', dateStr, currentAssignments, prevMonthData, nightShiftPattern);
                        const scoreB = scoreCandidate(b, 'N1', dateStr, currentAssignments, prevMonthData, nightShiftPattern);
                        return scoreA - scoreB;
                    });

                    let assigned = false;
                    for (const staff of candidates) {
                        const assignment: ShiftAssignment = {
                            date: dateStr,
                            staffId: staff.id,
                            shiftCode: 'N1'
                        };

                        const error = validateShift(assignment, currentAssignments, prevMonthData);
                        if (!error) {
                            currentAssignments.push(assignment);
                            assignedMap.add(`${dateStr}:${staff.id}`);

                            // Recovery Days Logic based on Pattern
                            if (nightShiftPattern === 'patternA') {
                                // Pattern A: N1 -> Off -> Off
                                const nextDay1 = addDays(currentDate, 1);
                                if (nextDay1.getMonth() === currentDate.getMonth()) {
                                    const nextDate1 = format(nextDay1, 'yyyy-MM-dd');
                                    const off1: ShiftAssignment = { date: nextDate1, staffId: staff.id, shiftCode: '公' };
                                    currentAssignments.push(off1);
                                    assignedMap.add(`${nextDate1}:${staff.id}`);
                                }

                                const nextDay2 = addDays(currentDate, 2);
                                if (nextDay2.getMonth() === currentDate.getMonth()) {
                                    const nextDate2 = format(nextDay2, 'yyyy-MM-dd');
                                    const off2: ShiftAssignment = { date: nextDate2, staffId: staff.id, shiftCode: '公' };
                                    currentAssignments.push(off2);
                                    assignedMap.add(`${nextDate2}:${staff.id}`);
                                }
                            } else {
                                // Pattern B: N1 -> N1 -> Off -> Off
                                // Here we only ensure the NEXT day is NOT Off if we want consecutive N1.
                                // But actually, if we assign N1 today, we don't force Off tomorrow if we want N1 tomorrow.
                                // However, if this is the SECOND N1, we must force Off.

                                const prevShift = getPreviousShiftCode(currentAssignments, prevMonthData, dateStr, staff.id);
                                if (prevShift === 'N1') {
                                    // This is the 2nd N1. Force 2 days off.
                                    const nextDay1 = addDays(currentDate, 1);
                                    if (nextDay1.getMonth() === currentDate.getMonth()) {
                                        const nextDate1 = format(nextDay1, 'yyyy-MM-dd');
                                        const off1: ShiftAssignment = { date: nextDate1, staffId: staff.id, shiftCode: '公' };
                                        currentAssignments.push(off1);
                                        assignedMap.add(`${nextDate1}:${staff.id}`);
                                    }

                                    const nextDay2 = addDays(currentDate, 2);
                                    if (nextDay2.getMonth() === currentDate.getMonth()) {
                                        const nextDate2 = format(nextDay2, 'yyyy-MM-dd');
                                        const off2: ShiftAssignment = { date: nextDate2, staffId: staff.id, shiftCode: '公' };
                                        currentAssignments.push(off2);
                                        assignedMap.add(`${nextDate2}:${staff.id}`);
                                    }
                                }
                                // If it's the 1st N1, we do nothing and hope the next day picks N1 (due to score incentive).
                            }

                            assigned = true;
                            break;
                        }
                    }

                    if (!assigned) {
                        throw new Error(`Cannot assign Night Shift on ${dateStr}`);
                    }
                }
            }

            // ==========================================
            // Phase 2: B5 (遅番5) の配置
            // ==========================================
            for (let day = 0; day < daysInMonth; day++) {
                const currentDate = addDays(startDate, day);
                const dateStr = format(currentDate, 'yyyy-MM-dd');

                const requiredB5 = 1;

                for (let i = 0; i < requiredB5; i++) {
                    const candidates = staffList.filter(staff => {
                        const key = `${dateStr}:${staff.id}`;
                        return !assignedMap.has(key);
                    });

                    candidates.sort((a, b) => {
                        const scoreA = scoreCandidate(a, 'B5', dateStr, currentAssignments, prevMonthData, nightShiftPattern);
                        const scoreB = scoreCandidate(b, 'B5', dateStr, currentAssignments, prevMonthData, nightShiftPattern);
                        return scoreA - scoreB;
                    });

                    let assigned = false;
                    for (const staff of candidates) {
                        const assignment: ShiftAssignment = {
                            date: dateStr,
                            staffId: staff.id,
                            shiftCode: 'B5'
                        };

                        const error = validateShift(assignment, currentAssignments, prevMonthData);
                        if (!error) {
                            currentAssignments.push(assignment);
                            assignedMap.add(`${dateStr}:${staff.id}`);
                            assigned = true;
                            break;
                        }
                    }

                    if (!assigned) {
                        throw new Error(`Cannot assign B5 on ${dateStr}`);
                    }
                }
            }

            // ==========================================
            // Phase 3: B3 (遅番3) の配置
            // ==========================================
            for (let day = 0; day < daysInMonth; day++) {
                const currentDate = addDays(startDate, day);
                const dateStr = format(currentDate, 'yyyy-MM-dd');

                const requiredB3 = 1;

                for (let i = 0; i < requiredB3; i++) {
                    const candidates = staffList.filter(staff => {
                        const key = `${dateStr}:${staff.id}`;
                        return !assignedMap.has(key);
                    });

                    candidates.sort((a, b) => {
                        const scoreA = scoreCandidate(a, 'B3', dateStr, currentAssignments, prevMonthData, nightShiftPattern);
                        const scoreB = scoreCandidate(b, 'B3', dateStr, currentAssignments, prevMonthData, nightShiftPattern);
                        return scoreA - scoreB;
                    });

                    let assigned = false;
                    for (const staff of candidates) {
                        const assignment: ShiftAssignment = {
                            date: dateStr,
                            staffId: staff.id,
                            shiftCode: 'B3'
                        };

                        const error = validateShift(assignment, currentAssignments, prevMonthData);
                        if (!error) {
                            currentAssignments.push(assignment);
                            assignedMap.add(`${dateStr}:${staff.id}`);
                            assigned = true;
                            break;
                        }
                    }

                    if (!assigned) {
                        throw new Error(`Cannot assign B3 on ${dateStr}`);
                    }
                }
            }

            // ==========================================
            // Phase 4: A2 (早番) の配置
            // ==========================================
            for (let day = 0; day < daysInMonth; day++) {
                const currentDate = addDays(startDate, day);
                const dateStr = format(currentDate, 'yyyy-MM-dd');

                const requiredA2 = 2;

                for (let i = 0; i < requiredA2; i++) {
                    const candidates = staffList.filter(staff => {
                        const key = `${dateStr}:${staff.id}`;
                        if (assignedMap.has(key)) return false;

                        // 前日がB5だった場合はA2/A3に割り当てられない
                        if (hadB5Yesterday(currentAssignments, dateStr, staff.id)) {
                            return false;
                        }

                        return true;
                    });

                    candidates.sort((a, b) => {
                        const scoreA = scoreCandidate(a, 'A2', dateStr, currentAssignments, prevMonthData, nightShiftPattern);
                        const scoreB = scoreCandidate(b, 'A2', dateStr, currentAssignments, prevMonthData, nightShiftPattern);
                        return scoreA - scoreB;
                    });

                    let assigned = false;
                    for (const staff of candidates) {
                        const assignment: ShiftAssignment = {
                            date: dateStr,
                            staffId: staff.id,
                            shiftCode: 'A2'
                        };

                        const error = validateShift(assignment, currentAssignments, prevMonthData);
                        if (!error) {
                            currentAssignments.push(assignment);
                            assignedMap.add(`${dateStr}:${staff.id}`);
                            assigned = true;
                            break;
                        }
                    }

                    if (!assigned) {
                        throw new Error(`Cannot assign A2 on ${dateStr}`);
                    }
                }
            }

            // ==========================================
            // Phase 5: 残りは公休（バランス配置）
            // ==========================================
            for (let day = 0; day < daysInMonth; day++) {
                const currentDate = addDays(startDate, day);
                const dateStr = format(currentDate, 'yyyy-MM-dd');

                for (const staff of staffList) {
                    const key = `${dateStr}:${staff.id}`;
                    if (!assignedMap.has(key)) {
                        const assignment: ShiftAssignment = { date: dateStr, staffId: staff.id, shiftCode: '公' };
                        currentAssignments.push(assignment);
                        assignedMap.add(key);
                    }
                }
            }

            return currentAssignments;

        } catch {
            // リトライ
            continue;
        }
    }

    throw new Error(`Failed to generate shift after ${maxRetries} attempts`);
};
