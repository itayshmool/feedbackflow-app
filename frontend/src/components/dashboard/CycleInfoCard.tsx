import { RotateCcw, Clock } from 'lucide-react';

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

  // Compact inline display for active cycles
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-gray-700">
          <RotateCcw className="h-4 w-4 text-blue-600" />
          <span className="text-xs sm:text-sm font-medium">Active:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {cycles.map((cycle) => {
            const days = daysRemaining(cycle.endDate);
            const isUrgent = days <= 7;
            
            return (
              <div
                key={cycle.id}
                className="flex items-center gap-2 bg-gray-50 rounded-md px-2 py-1"
              >
                <span className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-[200px]">
                  {cycle.name}
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                    isUrgent
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {days}d
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
