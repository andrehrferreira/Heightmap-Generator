import React from 'react';
import './RangeInput.css';

interface RangeInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export const RangeInput: React.FC<RangeInputProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}) => {
  return (
    <div className="form-group">
      <label className="form-label">
        <span>{label}</span>
        <span className="form-value">{value}</span>
      </label>
      <input
        type="range"
        className="form-input"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
};

