import type { ShiftCode } from '../types';

export const SHIFT_CODES: Record<string, ShiftCode> = {
    // 早番
    'A2': { code: 'A2', name: '早番', type: '早番', startTime: '06:30', endTime: '15:30' },
    'A3': { code: 'A3', name: '早番', type: '早番', startTime: '07:00', endTime: '16:00' },

    // 日勤
    'D1': { code: 'D1', name: '日勤', type: '日勤', startTime: '08:30', endTime: '17:30' },
    'D2': { code: 'D2', name: '日勤', type: '日勤', startTime: '09:00', endTime: '18:00' },
    'D3': { code: 'D3', name: '日勤', type: '日勤', startTime: '09:30', endTime: '18:30' },

    // 育短
    'S2': { code: 'S2', name: '育短', type: 'その他', startTime: '09:00', endTime: '16:00' },
    'S3': { code: 'S3', name: '育短', type: 'その他', startTime: '09:30', endTime: '16:30' },

    // 遅番
    'B1': { code: 'B1', name: '遅1', type: '遅番', startTime: '10:00', endTime: '19:00' },
    'B3': { code: 'B3', name: '遅3', type: '遅番', startTime: '11:00', endTime: '20:00' },
    'B5': { code: 'B5', name: '遅5', type: '遅番', startTime: '13:00', endTime: '22:00' },

    // 夜勤
    'N1': { code: 'N1', name: '深夜', type: '夜勤', startTime: '22:00', endTime: '07:00', isNightShift: true },

    // 休日
    '公': { code: '公', name: '公休', type: '休日', startTime: '', endTime: '', isOff: true },
    '年': { code: '年', name: '年休', type: '休日', startTime: '', endTime: '', isOff: true },
    '産': { code: '産', name: '産休', type: '休日', startTime: '', endTime: '', isOff: true },
    '育': { code: '育', name: '育休', type: '休日', startTime: '', endTime: '', isOff: true },

    // パート
    'P1': { code: 'P1', name: 'パート', type: 'その他', startTime: '09:00', endTime: '16:00' },
    'P7': { code: 'P7', name: 'パート', type: 'その他', startTime: '13:00', endTime: '17:00' },
    'P8': { code: 'P8', name: 'パート', type: 'その他', startTime: '09:00', endTime: '16:30' },

    // その他
    '委': { code: '委', name: '委員会', type: 'その他', startTime: '13:00', endTime: '14:00' },
    '研': { code: '研', name: '研修', type: 'その他', startTime: '10:00', endTime: '16:00' },
    '希': { code: '希', name: '希望休', type: '休日', startTime: '', endTime: '', isOff: true },
};

export const CONSTRAINT_RULES = {
    maxConsecutiveWorkDays: 6, // 最大連勤数
    nightShiftInterval: 1, // 夜勤翌日は休み(1日) - これは基本ルールだが、パターンによって上書きされる
};

export const NIGHT_PATTERNS = {
    A: { name: '単発夜勤', pattern: ['N1', '公', '公'] }, // 基本
    B: { name: '2連夜勤', pattern: ['N1', 'N1', '公', '公'] }, // 調整用
    C: { name: '3連夜勤', pattern: ['N1', 'N1', 'N1', '公', '公'] }, // 緊急用
};

export const INTERVAL_RULES = {
    forbidden: ['B5'], // このシフトの翌日は
    nextForbidden: ['A2', 'A3'], // これらが禁止
};
