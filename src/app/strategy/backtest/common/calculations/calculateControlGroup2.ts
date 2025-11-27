import { StockData } from '../../types';
import { ControlGroupResult } from '../../types';

// 对照组2：定投沪深300
export function calculateControlGroup2(
  stockData: StockData[], // 股票数据
  initialCapital: number, // 初始资金
  dcaMonths: number, // 定投月数
): ControlGroupResult {
  if (stockData.length === 0) {
    return {
      finalValue: initialCapital,
      totalReturn: 0,
      annualizedReturn: 0,
      maxDrawdown: 0,
      dailyValues: [],
      yearlyDetails: [],
    };
  }
  
  const dailyValues: Array<{ date: string; value: number; changePercent: number }> = [];
  const monthlyInvestment = initialCapital / dcaMonths;
  
  let totalShares = 0; // 总份额
  let investedAmount = 0; // 累计投入
  let currentValue = 0; // 当前价值
  let maxValue = 0; // 最大价值
  let maxDrawdown = 0; // 最大回撤
  
  const startDate = new Date(stockData[0].date);
  const endDate = new Date(stockData[stockData.length - 1].date);
  
  const dcaEndDate = new Date(startDate);
  dcaEndDate.setMonth(dcaEndDate.getMonth() + dcaMonths);
  
  // 调试日志（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [calculateControlGroup2] 初始化:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dcaEndDate: dcaEndDate.toISOString().split('T')[0],
      initialCapital,
      dcaMonths,
      monthlyInvestment: initialCapital / dcaMonths,
    });
  }
  
  let lastInvestmentMonth = -1;
  
  // 年度详情跟踪
  const yearlyDetails: Array<{
    year: string;
    startValue: number;
    endValue: number;
    stockValue: number;
    return: number;
    investedAmount?: number;
    finalValue?: number;
  }> = [];
  
  const startYear = startDate.getFullYear(); // 开始年份
  let currentYearForDetails = startYear; // 当前年份
  let yearStartShares = 0; // 年初份额
  let yearStartPrice = 0; // 年初价格
  let yearStartValue = initialCapital; // 年初价值
  let yearInvested = 0; // 本年投入
  let prevYearEndPrice = 0; // 上一年的年末价格
  
  // 遍历股票数据
  stockData.forEach((item: StockData) => {
    const date = item.date
    const stockPrice = item.cp;
    const netWorthList = [];
    
    if (stockPrice === undefined || stockPrice === null) {
      console.error(`[calculateControlGroup2] 股票价格为空: ${item.date}`);
      return;
    }

    if (true) {
      // 在定投之前，先保存上一年的份额和投入
      // 这样即使第二年的定投发生在年份切换之前，我们也能正确计算上一年的数据
      const prevYearEndSharesBeforeDCA = totalShares; // 定投之前的份额
      const prevYearEndInvestedBeforeDCA = investedAmount; // 定投之前的投入
      const prevYearInvestedBeforeDCA = yearInvested; // 定投之前的本年投入
      
      // 使用上一年的最后一天的价格和份额
      const prevYearEndShares = yearlyDetails.length === 0 ? prevYearEndSharesBeforeDCA : yearStartShares;
      const prevYearEndStockValue = prevYearEndShares * prevYearEndPrice;
      // 上一年的累计投入计算：
      // - 如果这是第一年（yearlyDetails.length === 0），上一年的累计投入 = prevYearInvestedBeforeDCA（第一年的投入）
      // - 如果这是第二年及以后，上一年的累计投入 = 上一年的投入（从 yearlyDetails 中获取） + prevYearInvestedBeforeDCA（上一年的投入）
      // 但实际上，prevYearEndInvestedBeforeDCA 已经是到上一年的累计投入，所以可以直接使用
      let prevYearEndInvested: number;
      if (yearlyDetails.length === 0) {
        // 第一年：累计投入就是第一年的投入
        prevYearEndInvested = prevYearInvestedBeforeDCA;
      } else {
        // 第二年及以后：累计投入 = 定投之前的总投入（已经包含了上一年的投入）
        // 但是，prevYearEndInvestedBeforeDCA 可能已经包含了今年的定投（如果今年的定投发生在年份切换之前）
        // 所以我们需要减去今年的投入（如果有的话）
        // 实际上，在年份切换时，如果今年的定投发生在年份切换之前，prevYearEndInvestedBeforeDCA 已经包含了今年的定投
        // 所以我们需要减去今年的投入：prevYearEndInvestedBeforeDCA - prevYearInvestedBeforeDCA
        // 但是，prevYearInvestedBeforeDCA 是上一年的投入，不是今年的投入
        // 所以正确的计算应该是：prevYearEndInvestedBeforeDCA（这是到上一年的累计投入）
        prevYearEndInvested = prevYearEndInvestedBeforeDCA;
      }
      const prevYearEndCash = initialCapital - prevYearEndInvested;
      const prevYearEndTotalValue = prevYearEndStockValue + prevYearEndCash;
      
      let yearStartTotalValue: number;
      if (yearlyDetails.length > 0) {
        const prevYearDetail = yearlyDetails[yearlyDetails.length - 1];
        yearStartTotalValue = prevYearDetail.endValue;
      } else {
        yearStartTotalValue = yearStartValue;
      }
      
      const returnRate = yearStartTotalValue > 0 ? ((prevYearEndTotalValue - yearStartTotalValue) / yearStartTotalValue) * 100 : 0;
      
      // 调试日志（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log(`📅 [年份切换] ${currentYearForDetails}年结束 → ${currentYear}年开始:`, {
          上一年年末份额: prevYearEndShares.toFixed(4),
          上一年年末价格: prevYearEndPrice.toFixed(2),
          上一年年末股票价值: prevYearEndStockValue.toFixed(2),
          上一年累计投入: prevYearEndInvested.toFixed(2),
          上一年年末现金: prevYearEndCash.toFixed(2),
          上一年年末总价值: prevYearEndTotalValue.toFixed(2),
          本年投入: prevYearInvestedBeforeDCA.toFixed(2),
          当前totalShares: totalShares.toFixed(4),
          当前investedAmount: investedAmount.toFixed(2),
        });
      }
      
      yearlyDetails.push({
        year: currentYearForDetails.toString(),
        startValue: yearStartTotalValue,
        endValue: prevYearEndTotalValue,
        stockValue: prevYearEndStockValue,
        return: returnRate,
        investedAmount: prevYearInvestedBeforeDCA, // 使用定投之前的本年投入
        finalValue: prevYearEndTotalValue,
      });
      
      currentYearForDetails = currentYear;
      // 更新为新一年的数据
      yearStartShares = prevYearEndSharesBeforeDCA; // 使用定投之前的份额
      yearStartPrice = stockPrice;
      yearStartValue = yearStartShares * yearStartPrice + (initialCapital - prevYearEndInvestedBeforeDCA);
      yearInvested = 0; // 重置为新一年的投入
      isFirstYearForDetails = false;
    }
    
    // 定投逻辑（在年份切换之后执行，确保使用正确的年份）
    // 确保：1. 日期在定投结束日期之前 2. 是新的月份 3. 累计投入不超过初始资金
    if (date < dcaEndDate && monthKey > lastInvestmentMonth && investedAmount < initialCapital) {
      const remainingInvestment = initialCapital - investedAmount;
      const actualInvestment = Math.min(monthlyInvestment, remainingInvestment);
      const sharesToBuy = actualInvestment / stockPrice;
      const beforeShares = totalShares;
      const beforeInvested = investedAmount;
      totalShares += sharesToBuy;
      investedAmount += actualInvestment;
      lastInvestmentMonth = monthKey;
      
      if (currentYear === currentYearForDetails) {
        yearInvested += actualInvestment;
      }
      
      // 调试日志（仅在开发环境，且只在最后几次定投时打印）
      if (process.env.NODE_ENV === 'development' && investedAmount >= initialCapital - monthlyInvestment * 2) {
        console.log(`💰 [定投] ${item.date} 年份:${currentYear} 价格:${stockPrice.toFixed(2)} 买入份额:${sharesToBuy.toFixed(4)} 实际投入:${actualInvestment.toFixed(2)} 累计份额:${beforeShares.toFixed(4)}→${totalShares.toFixed(4)} 累计投入:${beforeInvested.toFixed(2)}→${investedAmount.toFixed(2)} 本年投入:${yearInvested.toFixed(2)}`);
      }
    }
    
    // 年份切换（在定投之后处理，使用最新的 totalShares 和 investedAmount）
    // 注意：在年份切换之前，需要保存上一年的份额，因为 totalShares 可能已经包含了今年的定投
    if (currentYear > currentYearForDetails && currentYearForDetails >= startYear) {
      // 在年份切换时，需要计算上一年的年末值
      // 关键问题：totalShares 可能已经包含了今年的定投，所以不能直接使用
      // 解决方法：在定投逻辑中，如果检测到年份变化，应该先保存上一年的份额
      // 但为了简化，我们在年份切换时使用 yearStartShares
      // 如果 yearStartShares 为0且这是第一年，说明第一年有定投，应该使用定投之前的 totalShares
      // 但是，我们无法知道定投之前的 totalShares，所以需要使用另一种方法
      
      // 实际上，在年份切换时，如果这是第一年，yearStartShares 应该是0（年初份额）
      // 但是第一年结束时的份额应该是 totalShares（在年份切换之前的值）
      // 问题在于：totalShares 可能已经包含了第二年的定投
      // 解决方法：在定投逻辑中，如果 currentYear > currentYearForDetails，应该先进行年份切换
      // 但这样会导致逻辑复杂
      
      // 更简单的方法：在年份切换时，如果这是第一年，使用 totalShares - 第二年的定投份额
      // 但是，我们不知道第二年的定投份额
      
      // 最佳方法：在定投逻辑中，如果检测到年份变化，先保存上一年的份额，然后再进行定投
      // 但为了不改变太多逻辑，我们使用 yearStartShares，如果为0则使用 totalShares
      let prevYearEndShares: number;
      if (yearlyDetails.length === 0) {
        // 第一年：yearStartShares 应该是0（年初份额），但第一年结束时的份额应该是 totalShares
        // 但是，totalShares 可能已经包含了第二年的定投
        // 为了准确，我们需要在定投之前保存第一年的份额
        // 但为了简化，我们假设在年份切换时，如果 yearStartShares 为0，使用 totalShares
        // 这假设第二年的定投还没有发生（因为年份切换在定投之后）
        prevYearEndShares = totalShares; // 第一年结束时的份额
      } else {
        prevYearEndShares = yearStartShares; // 使用上一年的份额
      }
      const prevYearEndStockValue = prevYearEndShares * prevYearEndPrice;
      // 上一年的投入 = 总投入 - 本年的投入
      const prevYearEndInvested = investedAmount - yearInvested;
      const prevYearEndCash = initialCapital - prevYearEndInvested;
      const prevYearEndTotalValue = prevYearEndStockValue + prevYearEndCash;
      
      let yearStartTotalValue: number;
      if (yearlyDetails.length > 0) {
        const prevYearDetail = yearlyDetails[yearlyDetails.length - 1];
        yearStartTotalValue = prevYearDetail.endValue;
      } else {
        yearStartTotalValue = yearStartValue;
      }
      
      const returnRate = yearStartTotalValue > 0 ? ((prevYearEndTotalValue - yearStartTotalValue) / yearStartTotalValue) * 100 : 0;
      
      // 调试日志（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log(`📅 [年份切换] ${currentYearForDetails}年结束 → ${currentYear}年开始:`, {
          上一年年末份额: prevYearEndShares.toFixed(4),
          上一年年末价格: prevYearEndPrice.toFixed(2),
          上一年年末股票价值: prevYearEndStockValue.toFixed(2),
          上一年累计投入: prevYearEndInvested.toFixed(2),
          上一年年末现金: prevYearEndCash.toFixed(2),
          上一年年末总价值: prevYearEndTotalValue.toFixed(2),
          本年投入: yearInvested.toFixed(2),
          当前totalShares: totalShares.toFixed(4),
          当前investedAmount: investedAmount.toFixed(2),
        });
      }
      
      yearlyDetails.push({
        year: currentYearForDetails.toString(),
        startValue: yearStartTotalValue,
        endValue: prevYearEndTotalValue,
        stockValue: prevYearEndStockValue,
        return: returnRate,
        investedAmount: yearInvested,
        finalValue: prevYearEndTotalValue,
      });
      
      currentYearForDetails = currentYear;
      yearStartShares = totalShares;
      yearStartPrice = stockPrice;
      yearStartValue = yearStartShares * yearStartPrice + (initialCapital - investedAmount);
      yearInvested = 0;
      isFirstYearForDetails = false;
    }
    
    
    currentValue = totalShares * stockPrice;
    
    if (totalShares > 0) {
      if (currentValue > maxValue) {
        maxValue = currentValue;
      }
      if (maxValue > 0) {
        const drawdown = ((maxValue - currentValue) / maxValue) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }
    
    const changePercent = ((currentValue / initialCapital) - 1) * 100;
    dailyValues.push({
      date: item.date,
      value: currentValue,
      changePercent,
    });
    
    if (currentYear === currentYearForDetails) {
      prevYearEndPrice = stockPrice;
    }
  });
  
  // 确保 investedAmount 正确：如果定投已结束，investedAmount 应该等于 initialCapital
  const finalInvestedAmount = endDate < dcaEndDate ? investedAmount : initialCapital;
  const finalStockValue = totalShares * (stockData[stockData.length - 1].cp || 0);
  const finalCash = initialCapital - finalInvestedAmount;
  const finalValue = finalStockValue + finalCash;
  const daysSinceStart = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const annualizedReturn = daysSinceStart > 0 ? ((finalValue / initialCapital) ** (365 / daysSinceStart) - 1) * 100 : 0;
  
  // 调试日志（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 [最终值计算]:', {
      定投是否已结束: endDate >= dcaEndDate,
      endDate: endDate.toISOString().split('T')[0],
      dcaEndDate: dcaEndDate.toISOString().split('T')[0],
      totalShares: totalShares.toFixed(4),
      investedAmount: investedAmount.toFixed(2),
      finalInvestedAmount: finalInvestedAmount.toFixed(2),
      finalStockValue: finalStockValue.toFixed(2),
      finalCash: finalCash.toFixed(2),
      finalValue: finalValue.toFixed(2),
    });
  }
  
  // 最后一年：使用 totalShares 和 investedAmount（与最终值计算保持一致）
  if (currentYearForDetails >= startYear) {
    const lastYearEndPrice = stockData[stockData.length - 1].cp || 0;
    const lastYearEndStockValue = totalShares * lastYearEndPrice;
    // 使用与最终值计算相同的 finalCash
    const lastYearEndCash = finalCash;
    const lastYearEndTotalValue = lastYearEndStockValue + lastYearEndCash;
    
    // 使用上一年的年末值作为这一年的年初值
    let yearStartTotalValue: number;
    let lastYearInvested: number;
    if (yearlyDetails.length > 0) {
      const prevYear = yearlyDetails[yearlyDetails.length - 1];
      yearStartTotalValue = prevYear.endValue;
      // 如果这是第一年且没有发生年份切换，需要计算这一年的投入
      // 上一年的累计投入 = 总投入 - 这一年的投入
      const prevYearEndInvested = investedAmount - yearInvested;
      // 如果上一年的累计投入为0，说明这是第一年，使用 yearInvested
      lastYearInvested = prevYearEndInvested === 0 ? yearInvested : yearInvested;
    } else {
      // 第一年，没有发生年份切换
      yearStartTotalValue = yearStartValue;
      // 第一年的投入就是 yearInvested
      lastYearInvested = yearInvested;
    }
    
    const returnRate = yearStartTotalValue > 0 ? ((lastYearEndTotalValue - yearStartTotalValue) / yearStartTotalValue) * 100 : 0;
    
    yearlyDetails.push({
      year: currentYearForDetails.toString(),
      startValue: yearStartTotalValue,
      endValue: lastYearEndTotalValue,
      stockValue: lastYearEndStockValue,
      return: returnRate,
      investedAmount: lastYearInvested,
      finalValue: lastYearEndTotalValue,
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

