import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { BarChart3, CheckCircle, Clock, Bell } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Cycle {
  id: string;
  name: string;
  endDate: string;
}

interface PendingRecipient {
  id: string;
  name: string;
  detail?: string;
}

interface ManagerData {
  pendingRecipients: PendingRecipient[];
  pendingCount: number;
  totalCount: number;
  completedCount: number;
}

interface ManagerCompletionStatusProps {
  cycles: Cycle[];
  selectedCycleId: string;
  onCycleChange: (cycleId: string) => void;
  managerData: ManagerData | null;
  isLoading?: boolean;
  onReminderSent?: () => void;
}

export default function ManagerCompletionStatus({
  cycles,
  selectedCycleId,
  onCycleChange,
  managerData,
  isLoading = false,
  onReminderSent
}: ManagerCompletionStatusProps) {
  const [isRemindingAll, setIsRemindingAll] = useState(false);
  const [sendingIndividualId, setSendingIndividualId] = useState<string | null>(null);

  const handleRemindAll = async () => {
    if (!selectedCycleId) return;
    setIsRemindingAll(true);
    try {
      const response = await api.post('/notifications/cycle-reminder', {
        cycleId: selectedCycleId,
        reminderType: 'give_feedback'
      });
      if (response.data.success) {
        toast.success(`Sent to ${response.data.sentCount} manager(s)`);
        onReminderSent?.();
      }
    } catch (error: any) {
      console.error('Failed to send reminders:', error);
    } finally {
      setIsRemindingAll(false);
    }
  };

  const handleNudgeIndividual = async (recipientId: string, recipientName: string) => {
    if (!selectedCycleId) return;
    setSendingIndividualId(recipientId);
    try {
      const response = await api.post('/notifications/cycle-reminder', {
        cycleId: selectedCycleId,
        recipientId,
        reminderType: 'give_feedback'
      });
      if (response.data.success) {
        toast.success(`Sent to ${recipientName}`);
        onReminderSent?.();
      }
    } catch (error: any) {
      console.error(`Failed to send reminder:`, error);
    } finally {
      setSendingIndividualId(null);
    }
  };

  if (!managerData || cycles.length === 0) {
    return null;
  }

  const percentage = managerData.totalCount > 0 
    ? Math.round((managerData.completedCount / managerData.totalCount) * 100) 
    : 0;
  const allComplete = managerData.pendingCount === 0 && managerData.totalCount > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-1.5 px-3 pt-3 sm:px-4 sm:pt-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center text-xs sm:text-sm font-semibold text-gray-800">
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-amber-600" />
            Managers Completion
          </span>
          <span className="text-xs font-bold text-amber-600">{percentage}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-4 sm:pb-3">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-2 bg-gray-200 rounded-full w-full"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Progress Bar */}
            <div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {managerData.completedCount}/{managerData.totalCount} completed
              </p>
            </div>

            {/* Pending List - Compact */}
            {managerData.pendingCount > 0 && (
              <div className="space-y-1.5">
                <div className="space-y-1">
                  {managerData.pendingRecipients.slice(0, 3).map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between bg-amber-50 rounded px-2 py-1"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-800 flex-shrink-0">
                          {recipient.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-medium text-amber-900 truncate block">
                            {recipient.name}
                          </span>
                          {recipient.detail && (
                            <span className="text-[9px] text-amber-600 truncate block">
                              {recipient.detail}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleNudgeIndividual(recipient.id, recipient.name)}
                        disabled={sendingIndividualId === recipient.id}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 flex-shrink-0 ml-1"
                        title={`Send reminder to ${recipient.name}`}
                      >
                        {sendingIndividualId === recipient.id ? (
                          <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Bell className="w-2.5 h-2.5" />
                        )}
                        <span className="hidden sm:inline">Nudge</span>
                      </button>
                    </div>
                  ))}
                </div>
                {managerData.pendingCount > 3 && (
                  <p className="text-[10px] text-amber-600 pl-1">
                    +{managerData.pendingCount - 3} more
                  </p>
                )}
                
                {/* Remind All - Compact */}
                <Button
                  size="sm"
                  onClick={handleRemindAll}
                  disabled={isRemindingAll}
                  className="w-full text-[10px] sm:text-xs h-7 bg-amber-600 hover:bg-amber-700"
                >
                  <Bell className="w-3 h-3 mr-1" />
                  {isRemindingAll ? 'Sending...' : `Remind All (${managerData.pendingCount})`}
                </Button>
              </div>
            )}

            {/* All Complete */}
            {allComplete && (
              <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="text-[11px] text-green-700">All completed!</span>
              </div>
            )}

            {/* No Managers */}
            {managerData.totalCount === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">No managers</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
