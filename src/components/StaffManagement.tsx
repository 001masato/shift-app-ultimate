import React, { useState } from 'react';
import { UserPlus, Edit2, Trash2, X } from 'lucide-react';
import type { Staff } from '../types';

interface StaffManagementProps {
    staffList: Staff[];
    onUpdate: (staffList: Staff[]) => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ staffList, onUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        employmentType: 'full_time' as 'full_time' | 'part_time',
        canNightShift: false,
        canLeader: false,
    });

    const handleOpenModal = (staff?: Staff) => {
        if (staff) {
            setEditingStaff(staff);
            setFormData({
                name: staff.name,
                employmentType: staff.employmentType,
                canNightShift: staff.attributes.canNightShift || false,
                canLeader: staff.attributes.canLeader || false,
            });
        } else {
            setEditingStaff(null);
            setFormData({
                name: '',
                employmentType: 'full_time',
                canNightShift: false,
                canLeader: false,
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
                contract: {},
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
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {staffList.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
                                        {staff.employmentType === 'full_time' ? '常勤' : 'パート'}
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">
                                {editingStaff ? 'スタッフ編集' : 'スタッフ追加'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
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
                                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as 'full_time' | 'part_time' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="full_time">常勤</option>
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

                        <div className="flex gap-3 mt-6">
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
