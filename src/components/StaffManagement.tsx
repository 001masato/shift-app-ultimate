import React, { useState } from 'react';
import { UserPlus, Edit2, Trash2, X } from 'lucide-react';
import type { Staff } from '../types';
import { SHIFT_CODES } from '../constants/shifts';

interface StaffManagementProps {
    staffList: Staff[];
    onUpdate: (staffList: Staff[]) => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ staffList, onUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        employmentType: 'full_time' as Staff['employmentType'],
        canNightShift: false,
        canLeader: false,
        allowedShifts: [] as string[],
        weekendOff: false,
    });

    const handleOpenModal = (staff?: Staff) => {
        if (staff) {
            setEditingStaff(staff);
            setFormData({
                name: staff.name,
                employmentType: staff.employmentType,
                canNightShift: staff.attributes.canNightShift || false,
                canLeader: staff.attributes.canLeader || false,
                allowedShifts: staff.contract?.allowedShifts || [],
                weekendOff: staff.contract?.weekendOff || false,
            });
        } else {
            setEditingStaff(null);
            setFormData({
                name: '',
                employmentType: 'full_time',
                canNightShift: false,
                canLeader: false,
                allowedShifts: [],
                weekendOff: false,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStaff(null);
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            alert('名前を入力してください');
            return;
        }

        const contractData = {
            allowedShifts: formData.allowedShifts,
            weekendOff: formData.weekendOff,
        };

        if (editingStaff) {
            // 編集
            const updated = staffList.map(s =>
                s.id === editingStaff.id
                    ? {
                        ...s,
                        name: formData.name,
                        employmentType: formData.employmentType,
                        attributes: {
                            canNightShift: formData.canNightShift,
                            canLeader: formData.canLeader,
                        },
                        contract: {
                            ...s.contract,
                            ...contractData,
                        },
                    }
                    : s
            );
            onUpdate(updated);
        } else {
            // 新規追加
            const newStaff: Staff = {
                id: `staff-${Date.now()}`,
                name: formData.name,
                role: 'staff',
                employmentType: formData.employmentType,
                attributes: {
                    canNightShift: formData.canNightShift,
                    canLeader: formData.canLeader,
                },
                contract: contractData,
            };
            onUpdate([...staffList, newStaff]);
        }

        handleCloseModal();
    };

    const handleDelete = (staffId: string) => {
        if (confirm('このスタッフを削除してよろしいですか？')) {
            onUpdate(staffList.filter(s => s.id !== staffId));
        }
    };

    const handleAllowedShiftToggle = (code: string) => {
        setFormData(prev => {
            const current = prev.allowedShifts;
            if (current.includes(code)) {
                return { ...prev, allowedShifts: current.filter(c => c !== code) };
            } else {
                return { ...prev, allowedShifts: [...current, code] };
            }
        });
    };

    // 勤務可能なシフトコードのみ抽出（休日以外）
    const workShiftCodes = Object.values(SHIFT_CODES).filter(s => !s.isOff).map(s => s.code);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">スタッフマスタ管理</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <UserPlus size={20} />
                    スタッフ追加
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                名前
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                雇用形態
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                夜勤可否
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                リーダー
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                制約
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {staffList.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    スタッフが登録されていません。「スタッフ追加」から登録してください。
                                </td>
                            </tr>
                        ) : (
                            staffList.map((staff) => (
                                <tr key={staff.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {staff.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {staff.employmentType === 'full_time' ? '常勤' :
                                            staff.employmentType === 'short_time' ? '時短' : 'パート'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {staff.attributes.canNightShift ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">可</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">不可</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {staff.attributes.canLeader ? (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">可</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex flex-col gap-1">
                                            {staff.contract?.weekendOff && (
                                                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded w-fit">土日祝休</span>
                                            )}
                                            {staff.contract?.allowedShifts && staff.contract.allowedShifts.length > 0 && (
                                                <span className="text-xs text-gray-500" title={staff.contract.allowedShifts.join(', ')}>
                                                    シフト限定: {staff.contract.allowedShifts.length}種
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenModal(staff)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(staff.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">
                                {editingStaff ? 'スタッフ編集' : 'スタッフ追加'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-900 border-b pb-2">基本情報</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        名前 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="例: 山田 太郎"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        雇用形態
                                    </label>
                                    <select
                                        value={formData.employmentType}
                                        onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as Staff['employmentType'] })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="full_time">常勤</option>
                                        <option value="short_time">時短</option>
                                        <option value="part_time">パート</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="canNightShift"
                                        checked={formData.canNightShift}
                                        onChange={(e) => setFormData({ ...formData, canNightShift: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="canNightShift" className="text-sm font-medium text-gray-700">
                                        夜勤可能
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="canLeader"
                                        checked={formData.canLeader}
                                        onChange={(e) => setFormData({ ...formData, canLeader: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="canLeader" className="text-sm font-medium text-gray-700">
                                        リーダー可能
                                    </label>
                                </div>
                            </div>

                            {(formData.employmentType === 'short_time' || formData.employmentType === 'part_time') && (
                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-900 border-b pb-2">勤務制約</h4>

                                    {formData.employmentType === 'short_time' && (
                                        <div className="flex items-center gap-2 bg-orange-50 p-3 rounded-lg border border-orange-100">
                                            <input
                                                type="checkbox"
                                                id="weekendOff"
                                                checked={formData.weekendOff}
                                                onChange={(e) => setFormData({ ...formData, weekendOff: e.target.checked })}
                                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                            />
                                            <label htmlFor="weekendOff" className="text-sm font-medium text-gray-700">
                                                土日祝日は休みとする
                                            </label>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            割り当て可能なシフト
                                        </label>
                                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                                            {workShiftCodes.map(code => (
                                                <div key={code} className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`shift-${code}`}
                                                        checked={formData.allowedShifts.includes(code)}
                                                        onChange={() => handleAllowedShiftToggle(code)}
                                                        className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <label htmlFor={`shift-${code}`} className="text-xs text-gray-600 cursor-pointer select-none">
                                                        {code} ({SHIFT_CODES[code].name})
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            ※選択しない場合は制約なし（すべてのシフトが可能）とみなされます
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
                            <button
                                onClick={handleCloseModal}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {editingStaff ? '更新' : '追加'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
