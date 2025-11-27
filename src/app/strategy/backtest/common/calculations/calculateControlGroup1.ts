import {
  BondData,
  ControlGroupResult,
} from '../types';

// 对照组1：现金国债
export function calculateControlGroup1(
  startDate: Date,
  endDate: Date,
  initialCapital: number,
  bondData: BondData[]
): ControlGroupResult {
  const dailyValues: Array<{ date: string; value: number; changePercent: number }> = [];
  let currentValue = initialCapital;
  let maxValue = initialCapital;
  let maxDrawdown = 0;
  
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  const yearValues: Map<number, number> = new Map();
  const yearRates: Map<number, number> = new Map();
  let yearValue = initialCapital;
  
  for (let year = startYear; year <= endYear; year++) {
    const yearData = bondData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getFullYear() === year && item.tcm_y10 !== undefined && item.tcm_y10 !== null;
    });
    
    let bondRate = 0.03;
    
    if (yearData.length > 0) {
      const rates = yearData.map(item => item.tcm_y10!);
      const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      bondRate = avgRate;
    } else if (year > startYear) {
      bondRate = yearRates.get(year - 1) || 0.03;
    }
    
    yearRates.set(year, bondRate);
    yearValue = yearValue * (1 + bondRate);
    yearValues.set(year, yearValue);
  }
  
  const lastYearStart = new Date(endYear, 0, 1);
  const daysInLastYear = Math.floor((endDate.getTime() - lastYearStart.getTime()) / (1000 * 60 * 60 * 24));
  const lastYearValue = yearValues.get(endYear - 1) || initialCapital;
  const lastYearRate = yearRates.get(endYear) || 0.03;
  const finalValue = lastYearValue * (1 + lastYearRate * (daysInLastYear / 365));
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const currentYear = currentDate.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);
    const daysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysFromYearStart = Math.floor((currentDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    
    const yearStartValue = currentYear === startYear ? initialCapital : (yearValues.get(currentYear - 1) || initialCapital);
    const yearEndValue = yearValues.get(currentYear) || initialCapital;
    
    currentValue = yearStartValue + (yearEndValue - yearStartValue) * (daysFromYearStart / daysInYear);
    
    if (currentYear === endYear && currentDate >= lastYearStart) {
      const daysFromLastYearStart = Math.floor((currentDate.getTime() - lastYearStart.getTime()) / (1000 * 60 * 60 * 24));
      const lastYearStartValue = yearValues.get(endYear - 1) || initialCapital;
      if (daysInLastYear > 0) {
        currentValue = lastYearStartValue + (finalValue - lastYearStartValue) * (daysFromLastYearStart / daysInLastYear);
      }
    }
    
    const dateStr = currentDate.toISOString().split('T')[0];
    const changePercent = ((currentValue / initialCapital) - 1) * 100;
    dailyValues.push({
      date: dateStr,
      value: currentValue,
      changePercent,
    });
    
    if (currentValue > maxValue) {
      maxValue = currentValue;
    }
    const drawdown = ((maxValue - currentValue) / maxValue) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const daysSinceStart = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const annualizedReturn = daysSinceStart > 0 ? ((finalValue / initialCapital) ** (365 / daysSinceStart) - 1) * 100 : 0;
  
  const yearlyDetails: Array<{
    year: string;
    startValue: number;
    endValue: number;
    return: number;
    interest?: number;
  }> = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const yearStartValue = year === startYear ? initialCapital : (yearValues.get(year - 1) || initialCapital);
    let yearEndValue: number;
    let interest: number;
    
    if (year === endYear) {
      yearEndValue = finalValue;
      interest = yearEndValue - yearStartValue;
    } else {
      yearEndValue = yearValues.get(year) || initialCapital;
      interest = yearEndValue - yearStartValue;
    }
    
    yearlyDetails.push({
      year: year.toString(),
      startValue: yearStartValue,
      endValue: yearEndValue,
      return: yearStartValue > 0 ? ((yearEndValue / yearStartValue) - 1) * 100 : 0,
      interest,
    });
  }
  
  return {
    finalValue,
    totalReturn: ((finalValue / initialCapital) - 1) * 100,
    annualizedReturn,
    maxDrawdown,
    dailyValues,
    yearlyDetails,
  };
}

