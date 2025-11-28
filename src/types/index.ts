export type ShiftType = '早番' | '日勤' | '遅番' | '夜勤' | '休日' | 'その他';

export interface ShiftCode {
    code: string;
    name: string;
    type: ShiftType;
    startTime: string;
    endTime: string;
    isNightShift?: boolean; // N1 etc.
    isOff?: boolean; // 公休, 有給 etc.
}

export interface Staff {
    id: string;
    name: string;
    role: 'admin' | 'staff';
    employmentType: 'full_time' | 'part_time' | 'short_time'; // 常勤, パート, 時短
    attributes: {
        canNightShift: boolean;
        canLeader: boolean;
    };
    contract: {
        maxDaysPerMonth?: number;
        fixedDays?: number[]; // 0=Sun, 1=Mon...
    };
}

export interface ShiftAssignment {
    date: string; // YYYY-MM-DD
    staffId: string;
    shiftCode: string;
}

export interface MonthlySettings {
    year: number;
    month: number;
    requiredStaffCounts: {
        [date: string]: {
            [shiftType in ShiftType]?: number;
        };
    };
    holidayCount: number;
    nightShiftPattern?: 'patternA' | 'patternB'; // patternA: N1->公->公 (単発), patternB: N1->N1->公->公 (2連)
}
