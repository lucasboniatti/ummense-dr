import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeSeriesChart } from '../TimeSeriesChart';

// Mock recharts to avoid DOM complexity
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ data }: any) => <div data-testid="line-chart" data-points={data.length} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Line: ({ dataKey, name }: any) => (
    <div data-testid={`line-${dataKey}`} data-name={name} />
  ),
}));

describe('TimeSeriesChart Component', () => {
  const mockData = [
    { date: '2026-02-25', success: 150, failed: 10 },
    { date: '2026-02-26', success: 200, failed: 15 },
    { date: '2026-02-27', success: 180, failed: 12 },
    { date: '2026-02-28', success: 220, failed: 18 },
    { date: '2026-03-01', success: 250, failed: 20 },
  ];

  it('should render the chart container', () => {
    render(<TimeSeriesChart data={mockData} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should render both success and failed lines', () => {
    render(<TimeSeriesChart data={mockData} />);

    expect(screen.getByTestId('line-success')).toBeInTheDocument();
    expect(screen.getByTestId('line-failed')).toBeInTheDocument();
  });

  it('should pass correct data points to chart', () => {
    render(<TimeSeriesChart data={mockData} />);

    const lineChart = screen.getByTestId('line-chart');
    expect(lineChart).toHaveAttribute('data-points', '5');
  });

  it('should render all chart components', () => {
    render(<TimeSeriesChart data={mockData} />);

    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    render(<TimeSeriesChart data={[]} />);

    const lineChart = screen.getByTestId('line-chart');
    expect(lineChart).toHaveAttribute('data-points', '0');
  });
});
