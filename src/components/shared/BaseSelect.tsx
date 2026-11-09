"use client";

import React from "react";

interface BaseSelectOption {
  value: string;
  label: string;
}

interface BaseSelectProps {
  options: BaseSelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function BaseSelect({
  options,
  value,
  onChange,
  label,
  disabled,
  placeholder = "Selecione",
  className = "",
  required = false,
}: BaseSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`
          w-full px-3 py-2 border border-gray-300 dark:border-gray-600
          rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500
          disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500
          transition-colors text-sm
          ${className}
        `}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
