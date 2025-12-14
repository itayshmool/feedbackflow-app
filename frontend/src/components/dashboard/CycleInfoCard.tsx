import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { RotateCcw, Clock, Calendar } from 'lucide-react';

interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface CycleInfoCardProps {
  cycles: Cycle[];
}

export default function CycleInfoCard({ cycles }: CycleInfoCardProps) {
  const daysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (!cycles || cycles.length === 0) {
    return null;
  }

  return (
    <Card className="transform transition-all duration-200 hover:shadow-lg overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-5">
        <CardTitle className="flex items-center text-base sm:text-lg">
          <RotateCcw className="h-5 w-5 mr-2 text-blue-600" />
          Active Cycles
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-5">
        <div className={`grid gap-3 ${cycles.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {cycles.map((cycle) => {
            const days = daysRemaining(cycle.endDate);
            const isUrgent = days <= 7;
            
            return (
              <div
                key={cycle.id}
                className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100"
              >
                {/* Cycle Name */}
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 truncate">
                  {cycle.name}
                </h4>
                
                {/* Dates Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 min-w-0">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-gray-400" />
                    <span className="truncate">
                      {new Date(cycle.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' - '}
                      {new Date(cycle.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  {/* Days Remaining Badge */}
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1 ${
                      isUrgent
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {days}d left
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

