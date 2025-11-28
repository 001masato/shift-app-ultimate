import React, { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';

interface SettingsPanelProps {
    defaultCounts: {
        A2: number; // 早番
        B3: number; // 遅番3
        B5: number; // 遅番5
        N1: number; // 夜勤
    };
    onUpdate: (counts: { A2: number; B3: number; B5: number; N1: number }) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ defaultCounts, onUpdate }) => {
    const [counts, setCounts] = useState(defaultCounts);
    const [hasChanges, setHasChanges] = useState(false);

    const handleChange = (key: keyof typeof counts, value: number) => {
        setCounts({ ...counts, [key]: value });
        setHasChanges(true);
    };

    const handleSave = () => {
        onUpdate(counts);
        setHasChanges(false);
    };

    const handleReset = () => {
        setCounts(defaultCounts);
        setHasChanges(false);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">必要人数設定</h2>
                {hasChanges && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <RotateCcw size={18} />
                            リセット
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Save size={18} />
                            保存
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">勤務体系・必須人数設定</h3>
                    <p className="text-sm text-gray-600">
                        毎日の必要な配置人数を設定します。自動生成時にこの人数を確保します。
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* A2 早番 */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h4 className="font-semibold text-gray-800">A2 (早番)</h4>
                                <p className="text-xs text-gray-500">06:30 - 15:30</p>
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                必須
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700">必要人数:</label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={counts.A2}
                                onChange={(e) => handleChange('A2', parseInt(e.target.value) || 0)}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600">名</span>
                        </div>
                    </div>

                    {/* B3 遅番3 */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h4 className="font-semibold text-gray-800">B3 (遅番3)</h4>
                                <p className="text-xs text-gray-500">11:00 - 20:00</p>
                            </div>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                                必須
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700">必要人数:</label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={counts.B3}
                                onChange={(e) => handleChange('B3', parseInt(e.target.value) || 0)}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600">名</span>
                        </div>
                    </div>

                    {/* B5 遅番5 */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h4 className="font-semibold text-gray-800">B5 (遅番5)</h4>
                                <p className="text-xs text-gray-500">13:00 - 22:00</p>
                            </div>
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                                インターバル
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700">必要人数:</label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={counts.B5}
                                onChange={(e) => handleChange('B5', parseInt(e.target.value) || 0)}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600">名</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            ⚠️ 翌日の早番（A2/A3）は禁止
                        </p>
                    </div>

                    {/* N1 夜勤 */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h4 className="font-semibold text-gray-800">N1 (深夜)</h4>
                                <p className="text-xs text-gray-500">22:00 - 07:00</p>
                            </div>
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                                夜勤
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700">必要人数:</label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={counts.N1}
                                onChange={(e) => handleChange('N1', parseInt(e.target.value) || 0)}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600">名</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            ℹ️ 夜勤後は2日間の休み
                        </p>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">設定のポイント</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• A2（早番）は委員会の代替シフトとしても使用されます</li>
                        <li>• B5（遅番5）の翌日は早番（A2/A3）には配置できません（インターバル制限）</li>
                        <li>• N1（夜勤）の翌日と翌々日は自動的に公休となります</li>
                        <li>• 合計 = A2 + B3 + B5 + N1 がスタッフ数を超えないように設定してください</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
