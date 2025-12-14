import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { Users, CheckCircle, Clock } from 'lucide-react';

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
}

export default function FeedbackAcceptanceStatus({
  cycles,
  selectedCycleId,
  onCycleChange,
  employeeData,
  isLoading = false
}: FeedbackAcceptanceStatusProps) {
  const daysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Don't render if no employee data or no cycles
  if (!employeeData || cycles.length === 0) {
    return null;
  }

  const percentage = employeeData.totalCount > 0 
    ? Math.round((employeeData.completedCount / employeeData.totalCount) * 100) 
    : 0;
  const allAcknowledged = employeeData.pendingCount === 0 && employeeData.totalCount > 0;

  return (
    <Card className="transform transition-all duration-200 hover:shadow-lg overflow-hidden">
      <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="flex items-center text-base sm:text-lg">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Feedback Acceptance by My Team
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
                <span className="text-gray-600">Acknowledgment Progress</span>
                <span className="font-semibold">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {employeeData.completedCount} of {employeeData.totalCount} employees acknowledged
              </p>
            </div>

            {/* Pending List */}
            {employeeData.pendingCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  Waiting to acknowledge ({employeeData.pendingCount}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {employeeData.pendingRecipients.slice(0, 5).map((recipient) => (
                    <span
                      key={recipient.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-800">
                        {recipient.name.charAt(0).toUpperCase()}
                      </span>
                      {recipient.name}
                    </span>
                  ))}
                  {employeeData.pendingCount > 5 && (
                    <span className="text-xs text-blue-600 px-2 py-1">
                      +{employeeData.pendingCount - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* All Complete Message */}
            {allAcknowledged && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700">
                  All team members have acknowledged their feedback!
                </span>
              </div>
            )}

            {/* No Feedback Given Yet */}
            {employeeData.totalCount === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  No feedback submitted to employees in this cycle yet.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

