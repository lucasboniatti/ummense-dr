/**
 * CronExpressionInput Component
 * Story 3.3: Scheduled Automations & Cron Support
 *
 * Input field for cron expressions with real-time validation and preview
 */

import React, { useState, useCallback, useEffect } from 'react';
import { SchedulerService } from '../services/scheduler.service';

interface CronExpressionInputProps {
  value: string;
  timezone: string;
  onChange: (cronExpression: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CronExpressionInput: React.FC<CronExpressionInputProps> = ({
  value,
  timezone,
  onChange,
  onValidationChange,
  placeholder = "e.g., 0 9 * * * (daily at 9am UTC)",
  disabled = false
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [nextExecutions, setNextExecutions] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  // Validate and get preview
  const validateAndPreview = useCallback(async (cronExpr: string) => {
    if (!cronExpr.trim()) {
      setIsValid(null);
      setError('');
      setNextExecutions([]);
      onValidationChange?.(false);
      return;
    }

    setLoading(true);
    try {
      const validation = await SchedulerService.validateCron(cronExpr, timezone);

      if (validation.valid) {
        setIsValid(true);
        setError('');

        // Get preview of next executions
        const preview = await SchedulerService.getPreview(cronExpr, timezone, 3);
        setNextExecutions(preview.nextExecutions);
        onValidationChange?.(true);
      } else {
        setIsValid(false);
        setError(validation.error || 'Invalid cron expression');
        setNextExecutions([]);
        onValidationChange?.(false);
      }
    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : 'Validation error');
      setNextExecutions([]);
      onValidationChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [timezone, onValidationChange]);

  // Debounce validation
  useEffect(() => {
    const timer = setTimeout(() => {
      validateAndPreview(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [value, validateAndPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const formatExecutionTime = (date: Date): string => {
    return new Date(date).toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone
    });
  };

  return (
    <div className="cron-expression-input">
      <div className="input-group">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled || loading}
          className={`cron-input ${isValid === true ? 'valid' : isValid === false ? 'invalid' : ''}`}
          aria-label="Cron expression"
        />
        {loading && <span className="spinner">⟳</span>}
        {isValid === true && <span className="icon-valid">✓</span>}
        {isValid === false && <span className="icon-invalid">✗</span>}
      </div>

      {error && <p className="error-message">{error}</p>}

      {nextExecutions.length > 0 && (
        <div className="preview-executions">
          <p className="preview-label">Next executions ({timezone}):</p>
          <ul className="execution-list">
            {nextExecutions.map((execution, idx) => (
              <li key={idx} className="execution-item">
                {formatExecutionTime(execution)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        .cron-expression-input {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .cron-input {
          width: 100%;
          padding: 8px 12px 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-family: 'Monaco', 'Courier', monospace;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .cron-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .cron-input.valid {
          border-color: #28a745;
        }

        .cron-input.invalid {
          border-color: #dc3545;
        }

        .cron-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .spinner {
          position: absolute;
          right: 12px;
          animation: spin 1s linear infinite;
          color: #007bff;
        }

        .icon-valid {
          position: absolute;
          right: 12px;
          color: #28a745;
          font-weight: bold;
        }

        .icon-invalid {
          position: absolute;
          right: 12px;
          color: #dc3545;
          font-weight: bold;
        }

        .error-message {
          color: #dc3545;
          font-size: 13px;
          margin: 0;
        }

        .preview-executions {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 12px;
        }

        .preview-label {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        .execution-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .execution-item {
          padding: 4px 0;
          font-size: 13px;
          color: #555;
          font-family: 'Monaco', 'Courier', monospace;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
