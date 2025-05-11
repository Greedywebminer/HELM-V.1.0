// frontend/src/components/Dropdown.jsx
import React from 'react';

/**
 * A labeled dropdown with an optional action button.
 *
 * Props:
 *  - label: string shown before the select
 *  - options: array of { value, label } items
 *  - value: currently selected value
 *  - onChange: fn(newValue)
 *  - onApply: optional fn() when “Apply” is clicked
 *  - applyLabel: text for the apply button (default: "Apply")
 *  - disabled: boolean to disable both controls
 */
export default function Dropdown({
  label,
  options,
  value,
  onChange,
  onApply,
  applyLabel = 'Apply',
  disabled = false
}) {
  return (
    <div className="inline-flex items-center space-x-2">
      {label && <span className="font-medium">{label}</span>}
      <select
        className="border rounded px-2 py-1 focus:outline-none"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {onApply && (
        <button
          onClick={onApply}
          disabled={disabled}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {applyLabel}
        </button>
      )}
    </div>
  );
}
