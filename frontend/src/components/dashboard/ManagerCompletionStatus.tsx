import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
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

  const daysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const handleRemindAll = async () => {
    if (!selectedCycleId) return;
    setIsRemindingAll(true);
    try {
      const response = await api.post('/notifications/cycle-reminder', {
        cycleId: selectedCycleId,
        reminderType: 'give_feedback'
      });
      if (response.data.success) {
        toast.success(`Reminder sent to ${response.data.sentCount} manager(s)`);
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
        toast.success(`Reminder sent to ${recipientName}`);
        onReminderSent?.();
      }
    } catch (error: any) {
      console.error(`Failed to send reminder to ${recipientName}:`, error);
    } finally {
      setSendingIndividualId(null);
    }
  };

  // Don't render if no manager data or no cycles
  if (!managerData || cycles.length === 0) {
    return null;
  }

  const percentage = managerData.totalCount > 0 
    ? Math.round((managerData.completedCount / managerData.totalCount) * 100) 
    : 0;
  const allComplete = managerData.pendingCount === 0 && managerData.totalCount > 0;

  return (
    <Card className="transform transition-all duration-200 hover:shadow-lg overflow-hidden h-full">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="flex flex-col gap-2">
          <span className="flex items-center text-sm font-semibold">
            <BarChart3 className="h-4 w-4 mr-1.5 text-amber-600" />
            Managers Completion
          </span>
          {cycles.length > 1 ? (
            <Select
              value={selectedCycleId}
              onChange={(e) => onCycleChange(e.target.value)}
              className="w-full text-xs"
            >
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name} ({daysRemaining(cycle.endDate)}d)
                </option>
              ))}
            </Select>
          ) : (
            <span className="text-xs text-gray-500 font-normal">
              {cycles[0].name}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            <div className="h-2 bg-gray-200 rounded-full w-full"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Compact Progress Section */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {managerData.completedCount}/{managerData.totalCount} completed
              </p>
            </div>

            {/* Pending List with Nudge Buttons */}
            {managerData.pendingCount > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">
                  Pending ({managerData.pendingCount}):
                </p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {managerData.pendingRecipients.slice(0, 4).map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between bg-amber-50 rounded-lg px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-800 flex-shrink-0">
                          {recipient.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-amber-900 truncate block">
                            {recipient.name}
                          </span>
                          {recipient.detail && (
                            <span className="text-[10px] text-amber-600 truncate block">
                              {recipient.detail}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleNudgeIndividual(recipient.id, recipient.name)}
                        disabled={sendingIndividualId === recipient.id}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                      >
                        {sendingIndividualId === recipient.id ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Bell className="w-3 h-3" />
                        )}
                        Nudge
                      </button>
                    </div>
                  ))}
                </div>
                {managerData.pendingCount > 4 && (
                  <p className="text-[10px] text-amber-600">
                    +{managerData.pendingCount - 4} more
                  </p>
                )}
                
                {/* Remind All Button */}
                <Button
                  size="sm"
                  onClick={handleRemindAll}
                  disabled={isRemindingAll}
                  className="w-full mt-2 text-xs h-8 bg-amber-600 hover:bg-amber-700"
                >
                  <Bell className="w-3 h-3 mr-1.5" />
                  {isRemindingAll ? 'Sending...' : `Remind All (${managerData.pendingCount})`}
                </Button>
              </div>
            )}

            {/* All Complete Message */}
            {allComplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-xs text-green-700">
                  All completed!
                </span>
              </div>
            )}

            {/* No Managers With Teams */}
            {managerData.totalCount === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs text-gray-600">
                  No managers with teams.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
