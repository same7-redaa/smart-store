import React, { useState, useRef } from 'react';

interface FloatingTextareaProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  icon?: React.ReactNode;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
  error?: string;
}

const FloatingTextarea: React.FC<FloatingTextareaProps> = ({
  label, value, onChange, icon, required,
  placeholder, rows = 3, className = '', error,
}) => {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasValue = typeof value === 'string' ? value.trim().length > 0 : false;
  const isFloating = focused || hasValue;

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={() => textareaRef.current?.focus()}
        className={`
          relative border-2 rounded-xl cursor-text transition-all duration-300 ease-out
          ${error ? 'border-red-500' : focused ? 'border-primary' : hasValue ? 'border-gray-300' : 'border-gray-200'}
          ${focused ? (error ? 'shadow-[0_0_0_4px_rgba(239,68,68,0.08)]' : 'shadow-[0_0_0_4px_rgba(0,201,80,0.08)]') : 'shadow-none'}
        `}
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={isFloating ? (placeholder || '') : ''}
            rows={rows}
            className={`
              w-full bg-transparent outline-none text-sm transition-all duration-300 ease-out resize-none
              ${icon ? 'pr-11' : 'pr-3.5'}
              pl-3.5
              ${isFloating ? 'pt-6 pb-1.5 text-gray-800' : 'pt-3 pb-3 text-transparent'}
            `}
          />

          <label
            className={`
              absolute flex items-center pointer-events-none select-none transition-all duration-300 ease-out whitespace-nowrap
              ${isFloating
                ? `-top-2.5 bg-white px-1 text-[10px] leading-4 font-medium ${error ? 'text-red-500' : 'text-primary'} z-10`
                : 'top-0 h-full text-sm text-gray-400 z-0'
              }
              ${icon ? 'right-11' : 'right-3.5'}
            `}
          >
            {label}
            {required && <span className="text-red-500 mr-0.5">*</span>}
          </label>

          {icon && (
            <div className="absolute top-0 right-0 flex items-start pt-3.5 pr-3.5 pointer-events-none z-20">
              <span className={`transition-all duration-300 ease-out ${focused ? (error ? 'text-red-500 scale-110' : 'text-primary scale-110') : 'text-gray-400'}`}>
                {icon}
              </span>
            </div>
          )}
        </div>
      </div>
      {error && (
        <span className="text-xs text-red-500 mt-1 block pr-1.5 animate-fadeIn">
          {error}
        </span>
      )}
    </div>
  );
};

export default FloatingTextarea;
