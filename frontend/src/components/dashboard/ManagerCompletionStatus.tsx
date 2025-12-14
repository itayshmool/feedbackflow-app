import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { BarChart3, CheckCircle, Clock } from 'lucide-react';

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
}

export default function ManagerCompletionStatus({
  cycles,
  selectedCycleId,
  onCycleChange,
  managerData,
  isLoading = false
}: ManagerCompletionStatusProps) {
  const daysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
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
    <Card className="transform transition-all duration-200 hover:shadow-lg overflow-hidden">
      <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="flex items-center text-base sm:text-lg">
            <BarChart3 className="h-5 w-5 mr-2 text-amber-600" />
            Feedback Completion by Your Managers
          </span>
          {cycles.length > 1 && (
            <Select
              value={selectedCycleId}
              onChange={(e) => onCycleChange(e.target.value)}
              className="w-full sm:w-56"
            >
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name} ({daysRemaining(cycle.endDate)}d left)
                </option>
              ))}
            </Select>
          )}
          {cycles.length === 1 && (
            <span className="text-sm text-gray-500 font-normal">
              {cycles[0].name}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-5">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded-full w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Section */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Team Feedback Completion</span>
                <span className="font-semibold">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-amber-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {managerData.completedCount} of {managerData.totalCount} managers completed all feedback
              </p>
            </div>

            {/* Pending List */}
            {managerData.pendingCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  Need to complete feedback ({managerData.pendingCount}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {managerData.pendingRecipients.slice(0, 5).map((recipient) => (
                    <span
                      key={recipient.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-800">
                        {recipient.name.charAt(0).toUpperCase()}
                      </span>
                      <span>{recipient.name}</span>
                      {recipient.detail && (
                        <span className="text-amber-500 text-[10px]">
                          ({recipient.detail})
                        </span>
                      )}
                    </span>
                  ))}
                  {managerData.pendingCount > 5 && (
                    <span className="text-xs text-amber-600 px-2 py-1">
                      +{managerData.pendingCount - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* All Complete Message */}
            {allComplete && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700">
                  All your managers have completed feedback for their teams!
                </span>
              </div>
            )}

            {/* No Managers With Teams */}
            {managerData.totalCount === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  No managers with team members in this cycle.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

