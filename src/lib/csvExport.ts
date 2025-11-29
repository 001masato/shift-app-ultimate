import type { Staff, ShiftAssignment } from '../types';
import { SHIFT_CODES } from '../constants/shifts';
import { getDaysInMonth, format, startOfMonth, addDays } from 'date-fns';

/**
 * シフト表をCSV形式に変換する
 */
export const exportShiftTableToCSV = (
    year: number,
    month: number,
    staffList: Staff[],
    shifts: ShiftAssignment[]
): string => {
    const startDate = startOfMonth(new Date(year, month - 1));
    const daysInMonth = getDaysInMonth(startDate);
    const dates = Array.from({ length: daysInMonth }, (_, i) =>
        format(addDays(startDate, i), 'yyyy-MM-dd')
    );

    // ヘッダー行
    const header = [
        'スタッフ名',
        ...dates.map(d => format(new Date(d), 'd日')),
        '早番', '日勤', '遅番', '夜勤', '休日', 'その他'
    ];

    const rows: string[][] = [header];

    // スタッフ行
    staffList.forEach(staff => {
        const row: string[] = [staff.name];
        const staffShifts = shifts.filter(s => s.staffId === staff.id);

        // 集計用
        const counts = {
            A2: 0, D1: 0, B3: 0, B5: 0, N1: 0,
            off: 0, other: 0
        };

        // 日ごとのシフト
        dates.forEach(date => {
            const assignment = staffShifts.find(s => s.date === date);
            const code = assignment?.shiftCode || '';
            row.push(code);

            // 集計
            if (code) {
                if (code === 'A2') counts.A2++;
                else if (code === 'D1') counts.D1++;
                else if (code === 'B3') counts.B3++;
                else if (code === 'B5') counts.B5++;
                else if (code === 'N1') counts.N1++;
                else if (SHIFT_CODES[code]?.isOff) counts.off++;
                else counts.other++;
            }
        });

        // 集計列
        row.push(counts.A2.toString());
        row.push(counts.D1.toString());
        // 遅番はB3+B5
        row.push((counts.B3 + counts.B5).toString());
        row.push(counts.N1.toString());
        row.push(counts.off.toString());
        row.push(counts.other.toString());

        rows.push(row);
    });

    // 日計行（簡易版）
    const dailyTotalRow = ['日計'];
    dates.forEach(date => {
        const count = shifts.filter(s => s.date === date && s.shiftCode && !SHIFT_CODES[s.shiftCode]?.isOff).length;
        dailyTotalRow.push(count.toString());
    });
    rows.push(dailyTotalRow);

    // CSV文字列に変換
    return rows.map(row => row.join(',')).join('\n');
};

/**
 * CSVファイルをダウンロードする
 */
export const downloadCSV = (csvContent: string, filename: string) => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
