'use client';

import { useState } from 'react';
import { ValuationInput, ValuationResult } from '../api/valuation/route';

export default function ValuationPage() {
  const [inputs, setInputs] = useState<ValuationInput>({
    freeCashFlow: [1000000],
    growthRate: 0.05,
    discountRate: 0.10,
    terminalGrowthRate: 0.02,
    years: 5
  });
  
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof ValuationInput, value: string | number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const addCashFlow = () => {
    setInputs(prev => ({
      ...prev,
      freeCashFlow: [...prev.freeCashFlow, 1000000]
    }));
  };

  const removeCashFlow = (index: number) => {
    if (inputs.freeCashFlow.length > 1) {
      setInputs(prev => ({
        ...prev,
        freeCashFlow: prev.freeCashFlow.filter((_, i) => i !== index)
      }));
    }
  };

  const updateCashFlow = (index: number, value: number) => {
    setInputs(prev => ({
      ...prev,
      freeCashFlow: prev.freeCashFlow.map((cf, i) => i === index ? value : cf)
    }));
  };

  const calculateValuation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/valuation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputs),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate valuation');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            DCF Valuation Calculator
          </h1>
          <p className="text-lg text-gray-600">
            Calculate the intrinsic value of a company using Discounted Cash Flow analysis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Input Parameters</h2>
            
            <div className="space-y-6">
              {/* Free Cash Flow Inputs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Free Cash Flow (Base Year)
                </label>
                <div className="space-y-2">
                  {inputs.freeCashFlow.map((cf, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={cf}
                        onChange={(e) => updateCashFlow(index, parseFloat(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter cash flow"
                      />
                      {inputs.freeCashFlow.length > 1 && (
                        <button
                          onClick={() => removeCashFlow(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addCashFlow}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add Cash Flow Year
                  </button>
                </div>
              </div>

              {/* Growth Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Growth Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.growthRate * 100}
                  onChange={(e) => handleInputChange('growthRate', (parseFloat(e.target.value) || 0) / 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5.0"
                />
              </div>

              {/* Discount Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.discountRate * 100}
                  onChange={(e) => handleInputChange('discountRate', (parseFloat(e.target.value) || 0) / 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10.0"
                />
              </div>

              {/* Terminal Growth Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terminal Growth Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.terminalGrowthRate * 100}
                  onChange={(e) => handleInputChange('terminalGrowthRate', (parseFloat(e.target.value) || 0) / 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2.0"
                />
              </div>

              {/* Projection Years */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projection Years
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={inputs.years}
                  onChange={(e) => handleInputChange('years', parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                />
              </div>

              <button
                onClick={calculateValuation}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Calculating...' : 'Calculate Valuation'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Valuation Results</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Enterprise Value</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      ${result.totalValue.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Present Value of FCF</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${result.presentValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Terminal Value</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${result.terminalValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Year by Year Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Year by Year Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FCF</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present Value</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.yearByYear.map((year) => (
                          <tr key={year.year}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{year.year}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              ${year.fcf.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              ${year.presentValue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {!result && !loading && (
              <div className="text-center text-gray-500 py-8">
                <p>Enter your parameters and click &quot;Calculate Valuation&quot; to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
