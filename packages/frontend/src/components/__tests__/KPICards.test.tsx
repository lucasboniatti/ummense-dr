import React from 'react';
import { render, screen } from '@testing-library/react';
import { KPICards } from '../KPICards';

describe('KPICards Component', () => {
  const mockMetrics = {
    rulesCount: 42,
    webhooksCount: 15,
    eventsProcessed24h: 5234,
    successRate: 98.5,
    avgExecutionTimeMs: 245,
  };

  it('should render all five metric cards', () => {
    render(<KPICards metrics={mockMetrics} />);

    expect(screen.getByText('Total Rules')).toBeInTheDocument();
    expect(screen.getByText('Total Webhooks')).toBeInTheDocument();
    expect(screen.getByText('Events (24h)')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Time')).toBeInTheDocument();
  });

  it('should display correct metric values', () => {
    render(<KPICards metrics={mockMetrics} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('5234')).toBeInTheDocument();
    expect(screen.getByText('98.5%')).toBeInTheDocument();
    expect(screen.getByText('245ms')).toBeInTheDocument();
  });

  it('should handle zero values', () => {
    const zeroMetrics = {
      rulesCount: 0,
      webhooksCount: 0,
      eventsProcessed24h: 0,
      successRate: 0,
      avgExecutionTimeMs: 0,
    };

    render(<KPICards metrics={zeroMetrics} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText('0ms')).toBeInTheDocument();
  });

  it('should format success rate with one decimal place', () => {
    const metricsWithDecimal = {
      ...mockMetrics,
      successRate: 99.97,
    };

    render(<KPICards metrics={metricsWithDecimal} />);

    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });
});
