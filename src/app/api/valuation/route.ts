import { NextRequest, NextResponse } from 'next/server';

export interface ValuationInput {
  freeCashFlow: number[];
  growthRate: number;
  discountRate: number;
  terminalGrowthRate: number;
  years: number;
}

export interface ValuationResult {
  presentValue: number;
  terminalValue: number;
  totalValue: number;
  yearByYear: Array<{
    year: number;
    fcf: number;
    presentValue: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValuationInput = await request.json();
    
    const { freeCashFlow, growthRate, discountRate, terminalGrowthRate, years } = body;
    
    // Validate inputs
    if (!freeCashFlow || freeCashFlow.length === 0) {
      return NextResponse.json(
        { error: 'Free cash flow array is required' },
        { status: 400 }
      );
    }
    
    if (discountRate <= 0) {
      return NextResponse.json(
        { error: 'Discount rate must be positive' },
        { status: 400 }
      );
    }
    
    // Calculate DCF
    const result = calculateDCF(freeCashFlow, growthRate, discountRate, terminalGrowthRate, years);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Valuation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateDCF(
  freeCashFlow: number[],
  growthRate: number,
  discountRate: number,
  terminalGrowthRate: number,
  years: number
): ValuationResult {
  const yearByYear: Array<{ year: number; fcf: number; presentValue: number }> = [];
  let presentValue = 0;
  
  // Calculate present value of projected cash flows
  for (let year = 1; year <= years; year++) {
    const fcf = freeCashFlow[Math.min(year - 1, freeCashFlow.length - 1)] * Math.pow(1 + growthRate, year - 1);
    const pv = fcf / Math.pow(1 + discountRate, year);
    presentValue += pv;
    
    yearByYear.push({
      year,
      fcf: Math.round(fcf * 100) / 100,
      presentValue: Math.round(pv * 100) / 100
    });
  }
  
  // Calculate terminal value
  const lastFCF = yearByYear[yearByYear.length - 1].fcf;
  const terminalValue = (lastFCF * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  const terminalValuePV = terminalValue / Math.pow(1 + discountRate, years);
  
  const totalValue = presentValue + terminalValuePV;
  
  return {
    presentValue: Math.round(presentValue * 100) / 100,
    terminalValue: Math.round(terminalValuePV * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    yearByYear
  };
}
