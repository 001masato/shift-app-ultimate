import React from 'react';
import { AlertCircle, AlertTriangle, Bell, X } from 'lucide-react';

export interface Alert {
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    date?: string;
    staffName?: string;
}

interface AlertPanelProps {
    alerts: Alert[];
    onDismiss?: (alertId: string) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onDismiss }) => {
    if (alerts.length === 0) {
        return null;
    }

    const getAlertIcon = (type: Alert['type']) => {
        switch (type) {
            case 'error':
                return <AlertCircle size={20} />;
            case 'warning':
                return <AlertTriangle size={20} />;
            case 'info':
                return <Bell size={20} />;
        }
    };

    const getAlertStyle = (type: Alert['type']) => {
        switch (type) {
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'info':
                return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 max-h-[300px] overflow-y-auto">
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <AlertCircle size={20} />
                        アラート ({alerts.length})
                    </h3>
                </div>

                <div className="space-y-2">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`flex items-start gap-3 p-3 border rounded-lg ${getAlertStyle(
                                alert.type
                            )}`}
                        >
                            <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.type)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{alert.message}</p>
                                {(alert.staffName || alert.date) && (
                                    <div className="text-xs mt-1 space-x-2">
                                        {alert.staffName && <span>スタッフ: {alert.staffName}</span>}
                                        {alert.date && <span>日付: {alert.date}</span>}
                                    </div>
                                )}
                            </div>
                            {onDismiss && (
                                <button
                                    onClick={() => onDismiss(alert.id)}
                                    className="flex-shrink-0 hover:opacity-70 transition-opacity"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
