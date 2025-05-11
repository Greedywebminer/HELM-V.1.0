// frontend/src/components/Dropdown.jsx
import React from 'react';

export default function Dropdown({
  label,           // string label shown before the select
  value,           // currently selected value
  options,         // array of { value, label } objects
  onChange,        // function(newValue) => void
  onApply,         // optional function() => void, called when Apply clicked
  applyLabel = 'Apply',  // text for the apply button
  disabled = false // disable both select and button if true
}) {
  return (
    <div className="flex items-center space-x-2">
      {label && <span className="font-medium">{label}</span>}
      <select
        className="border px-2 py-1 rounded flex-1"
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
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={onApply}
          disabled={disabled}
        >
          {applyLabel}
        </button>
      )}
    </div>
  );
}
