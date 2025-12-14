import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Bell, Users, BarChart3, ChevronDown, ChevronUp, ChevronRight, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

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

interface ManagerData {
  pendingRecipients: PendingRecipient[];
  pendingCount: number;
  totalCount: number;
  completedCount: number;
}

interface NudgePanelProps {
  cycleId: string;
  employeeData: EmployeeData | null;
  managerData: ManagerData | null;
  onReminderSent?: () => void;
}

export default function NudgePanel({
  cycleId,
  employeeData,
  managerData,
  onReminderSent
}: NudgePanelProps) {
  const [isEmployeeReminderSending, setIsEmployeeReminderSending] = useState(false);
  const [isManagerReminderSending, setIsManagerReminderSending] = useState(false);
  const [sendingIndividualId, setSendingIndividualId] = useState<string | null>(null);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [showAllManagers, setShowAllManagers] = useState(false);

  const hasEmployeePending = employeeData && employeeData.pendingCount > 0;
  const hasManagerPending = managerData && managerData.pendingCount > 0;

  // Don't render if nothing to nudge
  if (!hasEmployeePending && !hasManagerPending) {
    // Show success message if both have data but no pending
    const employeeComplete = employeeData && employeeData.totalCount > 0 && employeeData.pendingCount === 0;
    const managerComplete = managerData && managerData.totalCount > 0 && managerData.pendingCount === 0;
    
    if (employeeComplete || managerComplete) {
      return (
        <Card className="transform transition-all duration-200 hover:shadow-lg overflow-hidden border-green-200 bg-green-50/50">
          <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">All reminders complete!</p>
                <p className="text-sm text-green-600">
                  {employeeComplete && managerComplete
                    ? 'All employees acknowledged and all managers completed feedback.'
                    : employeeComplete
                    ? 'All employees have acknowledged their feedback.'
                    : 'All your managers have completed team feedback.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return null;
  }

  const handleSendEmployeeReminders = async () => {
    if (!cycleId) return;
    setIsEmployeeReminderSending(true);
    try {
      const response = await api.post('/notifications/cycle-reminder', {
        cycleId,
        reminderType: 'acknowledge_feedback'
      });
      if (response.data.success) {
        toast.success(`Reminder sent to ${response.data.sentCount} employee(s)`);
        onReminderSent?.();
      }
    } catch (error: any) {
      console.error('Failed to send employee reminders:', error);
    } finally {
      setIsEmployeeReminderSending(false);
    }
  };

  const handleSendManagerReminders = async () => {
    if (!cycleId) return;
    setIsManagerReminderSending(true);
    try {
      const response = await api.post('/notifications/cycle-reminder', {
        cycleId,
        reminderType: 'give_feedback'
      });
      if (response.data.success) {
        toast.success(`Reminder sent to ${response.data.sentCount} manager(s)`);
        onReminderSent?.();
      }
    } catch (error: any) {
      console.error('Failed to send manager reminders:', error);
    } finally {
      setIsManagerReminderSending(false);
    }
  };

  const handleSendIndividualReminder = async (
    recipientId: string,
    recipientName: string,
    reminderType: 'acknowledge_feedback' | 'give_feedback'
  ) => {
    if (!cycleId) return;
    setSendingIndividualId(recipientId);
    try {
      const response = await api.post('/notifications/cycle-reminder', {
        cycleId,
        recipientId,
        reminderType
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

  return (
    <Card className="transform transition-all duration-200 hover:shadow-lg overflow-hidden">
      <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <CardTitle className="flex items-center text-base sm:text-lg">
          <Bell className="h-5 w-5 mr-2 text-purple-600" />
          Send Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-5 space-y-4">
        {/* Employee Reminders Section */}
        {hasEmployeePending && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  {employeeData!.pendingCount} employee{employeeData!.pendingCount > 1 ? 's' : ''} need to acknowledge
                </span>
              </div>
              <Button
                size="sm"
                onClick={handleSendEmployeeReminders}
                disabled={isEmployeeReminderSending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Bell className="w-3.5 h-3.5 mr-1.5" />
                {isEmployeeReminderSending ? 'Sending...' : 'Remind All'}
              </Button>
            </div>
            
            {/* Individual Recipients */}
            <div className="space-y-2">
              {(showAllEmployees
                ? employeeData!.pendingRecipients
                : employeeData!.pendingRecipients.slice(0, 3)
              ).map((recipient) => (
                <button
                  key={recipient.id}
                  onClick={() => handleSendIndividualReminder(recipient.id, recipient.name, 'acknowledge_feedback')}
                  disabled={sendingIndividualId === recipient.id}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-blue-100/60 hover:bg-blue-100 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-sm font-bold text-blue-800 flex-shrink-0">
                    {sendingIndividualId === recipient.id ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      recipient.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="flex-1 text-left font-medium text-blue-900 text-sm truncate">
                    {recipient.name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                </button>
              ))}
            </div>
            
            {employeeData!.pendingRecipients.length > 3 && (
              <button
                onClick={() => setShowAllEmployees(!showAllEmployees)}
                className="mt-2 w-full py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
              >
                {showAllEmployees ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show {employeeData!.pendingRecipients.length - 3} more
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Manager Reminders Section */}
        {hasManagerPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800">
                  {managerData!.pendingCount} manager{managerData!.pendingCount > 1 ? 's' : ''} need to give feedback
                </span>
              </div>
              <Button
                size="sm"
                onClick={handleSendManagerReminders}
                disabled={isManagerReminderSending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Bell className="w-3.5 h-3.5 mr-1.5" />
                {isManagerReminderSending ? 'Sending...' : 'Remind All'}
              </Button>
            </div>
            
            {/* Individual Recipients */}
            <div className="space-y-2">
              {(showAllManagers
                ? managerData!.pendingRecipients
                : managerData!.pendingRecipients.slice(0, 3)
              ).map((recipient) => (
                <button
                  key={recipient.id}
                  onClick={() => handleSendIndividualReminder(recipient.id, recipient.name, 'give_feedback')}
                  disabled={sendingIndividualId === recipient.id}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-amber-100/60 hover:bg-amber-100 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-sm font-bold text-amber-800 flex-shrink-0">
                    {sendingIndividualId === recipient.id ? (
                      <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      recipient.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-amber-900 text-sm truncate">{recipient.name}</p>
                    {recipient.detail && (
                      <p className="text-xs text-amber-600 truncate">{recipient.detail}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
                </button>
              ))}
            </div>
            
            {managerData!.pendingRecipients.length > 3 && (
              <button
                onClick={() => setShowAllManagers(!showAllManagers)}
                className="mt-2 w-full py-1.5 text-sm font-medium text-amber-600 hover:text-amber-800 flex items-center justify-center gap-1"
              >
                {showAllManagers ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show {managerData!.pendingRecipients.length - 3} more
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

