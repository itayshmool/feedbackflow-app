import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Users, CheckCircle, Clock, Bell } from 'lucide-react';
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

interface EmployeeData {
  pendingRecipients: PendingRecipient[];
  pendingCount: number;
  totalCount: number;
  completedCount: number;
}

interface FeedbackAcceptanceStatusProps {
  cycles: Cycle[];
  selectedCycleId: string;
  onCycleChange: (cycleId: string) => void;
  employeeData: EmployeeData | null;
  isLoading?: boolean;
  onReminderSent?: () => void;
}

export default function FeedbackAcceptanceStatus({
  cycles,
  selectedCycleId,
  onCycleChange,
  employeeData,
  isLoading = false,
  onReminderSent
}: FeedbackAcceptanceStatusProps) {
  const [isRemindingAll, setIsRemindingAll] = useState(false);
  const [sendingIndividualId, setSendingIndividualId] = useState<string | null>(null);

  const handleRemindAll = async () => {
    if (!selectedCycleId) return;
    setIsRemindingAll(true);
    try {
      const response = await api.post('/notifications/cycle-reminder', {
        cycleId: selectedCycleId,
        reminderType: 'acknowledge_feedback'
      });
      if (response.data.success) {
        toast.success(`Sent to ${response.data.sentCount} employee(s)`);
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
        reminderType: 'acknowledge_feedback'
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

  if (!employeeData || cycles.length === 0) {
    return null;
  }

  const percentage = employeeData.totalCount > 0 
    ? Math.round((employeeData.completedCount / employeeData.totalCount) * 100) 
    : 0;
  const allAcknowledged = employeeData.pendingCount === 0 && employeeData.totalCount > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-1.5 px-3 pt-3 sm:px-4 sm:pt-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center text-xs sm:text-sm font-semibold text-gray-800">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-blue-600" />
            Feedback Acceptance
          </span>
          <span className="text-xs font-bold text-blue-600">{percentage}%</span>
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
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {employeeData.completedCount}/{employeeData.totalCount} acknowledged
              </p>
            </div>

            {/* Pending List - Compact */}
            {employeeData.pendingCount > 0 && (
              <div className="space-y-1.5">
                <div className="space-y-1">
                  {employeeData.pendingRecipients.slice(0, 3).map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between bg-blue-50 rounded px-2 py-1"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-800 flex-shrink-0">
                          {recipient.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-[11px] font-medium text-blue-900 truncate">
                          {recipient.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleNudgeIndividual(recipient.id, recipient.name)}
                        disabled={sendingIndividualId === recipient.id}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
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
                {employeeData.pendingCount > 3 && (
                  <p className="text-[10px] text-blue-600 pl-1">
                    +{employeeData.pendingCount - 3} more
                  </p>
                )}
                
                {/* Remind All - Compact */}
                <Button
                  size="sm"
                  onClick={handleRemindAll}
                  disabled={isRemindingAll}
                  className="w-full text-[10px] sm:text-xs h-7"
                >
                  <Bell className="w-3 h-3 mr-1" />
                  {isRemindingAll ? 'Sending...' : `Remind All (${employeeData.pendingCount})`}
                </Button>
              </div>
            )}

            {/* All Complete */}
            {allAcknowledged && (
              <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="text-[11px] text-green-700">All acknowledged!</span>
              </div>
            )}

            {/* No Feedback Yet */}
            {employeeData.totalCount === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-[11px] text-gray-600">No feedback yet</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
