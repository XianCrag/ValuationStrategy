import { formatDate } from '../indicators/utils';

interface DateRangeDisplayProps {
  dateRange: { startDate: string; endDate: string };
}

export default function DateRangeDisplay({ dateRange }: DateRangeDisplayProps) {
  return (
    <div className="mb-4 text-center text-sm text-gray-500">
      数据时间范围: {formatDate(dateRange.startDate)} 至 {formatDate(dateRange.endDate)}
    </div>
  );
}

