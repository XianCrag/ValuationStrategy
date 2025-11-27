interface YearSelectorProps {
  selectedYears: number;
  onYearsChange: (years: number) => void;
}

const YEAR_OPTIONS = [1, 3, 5, 10, 15, 20];

export default function YearSelector({ selectedYears, onYearsChange }: YearSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <label htmlFor="year-selector" className="text-sm font-medium text-gray-700">
        时间范围：
      </label>
      <select
        id="year-selector"
        value={selectedYears}
        onChange={(e) => onYearsChange(Number(e.target.value))}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer"
      >
        {YEAR_OPTIONS.map((years) => (
          <option key={years} value={years}>
            近 {years} 年
          </option>
        ))}
      </select>
    </div>
  );
}
