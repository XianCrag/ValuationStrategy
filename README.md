# Valuation Strategy - DCF Calculator

A professional-grade Discounted Cash Flow (DCF) valuation calculator built with Next.js, featuring a modern web interface and robust server-side calculations.

## Features

- **DCF Valuation Engine**: Advanced financial modeling with customizable parameters
- **Real-time Calculations**: Instant results with detailed year-by-year breakdowns
- **Professional UI**: Modern, responsive design built with Tailwind CSS
- **TypeScript**: Full type safety and better development experience
- **API Routes**: Server-side calculation endpoints for secure financial analysis
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Next.js API Routes (Node.js)
- **Development**: ESLint, PostCSS, Autoprefixer

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ValuationStrategy
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── valuation/
│   │       └── route.ts          # DCF calculation API endpoint
│   ├── valuation/
│   │   └── page.tsx              # Valuation calculator page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                    # Reusable components (future)
└── lib/                          # Utility functions (future)
```

## API Endpoints

### POST /api/valuation

Calculate DCF valuation with the following parameters:

**Request Body:**
```typescript
{
  freeCashFlow: number[];        // Base year cash flows
  growthRate: number;            // Annual growth rate (0.05 = 5%)
  discountRate: number;          // Discount rate (0.10 = 10%)
  terminalGrowthRate: number;    // Terminal growth rate (0.02 = 2%)
  years: number;                 // Projection period
}
```

**Response:**
```typescript
{
  presentValue: number;          // PV of projected cash flows
  terminalValue: number;         // PV of terminal value
  totalValue: number;            // Total enterprise value
  yearByYear: Array<{           // Year-by-year breakdown
    year: number;
    fcf: number;
    presentValue: number;
  }>;
}
```

## Usage

1. **Navigate to the Valuation Page**: Click "DCF Calculator" from the main navigation
2. **Input Parameters**: 
   - Enter base year free cash flows
   - Set growth rate, discount rate, and terminal growth rate
   - Choose projection period
3. **Calculate**: Click "Calculate Valuation" to see results
4. **Review Results**: View total enterprise value, breakdowns, and year-by-year analysis

## Financial Model Details

The DCF calculator implements the following methodology:

1. **Projected Cash Flows**: Apply growth rate to base year cash flows
2. **Present Value Calculation**: Discount each year's cash flow using the discount rate
3. **Terminal Value**: Calculate perpetuity value beyond projection period
4. **Total Valuation**: Sum of present values plus terminal value

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For questions or support, please open an issue in the repository.

---

Built with ❤️ using Next.js and modern web technologies.
