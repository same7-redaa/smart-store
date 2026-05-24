import React, { useState, useRef } from 'react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  icon?: React.ReactNode;
  required?: boolean;
  placeholder?: string;
  endAdornment?: React.ReactNode;
  className?: string;
  error?: string;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label, value, onChange, type = 'text', icon, required,
  placeholder, endAdornment, className = '', error, ...props
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = typeof value === 'string' ? value.trim().length > 0 : false;
  const isFloating = focused || hasValue;

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={() => inputRef.current?.focus()}
        className={`
          relative border-2 rounded-xl cursor-text transition-all duration-300 ease-out
          ${error ? 'border-red-500' : focused ? 'border-primary' : hasValue ? 'border-gray-300' : 'border-gray-200'}
          ${focused ? (error ? 'shadow-[0_0_0_4px_rgba(239,68,68,0.08)]' : 'shadow-[0_0_0_4px_rgba(0,201,80,0.08)]') : 'shadow-none'}
        `}
      >
        <div className="relative h-14">
          <input
            ref={inputRef}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={isFloating ? (placeholder || '') : ''}
            className={`
              w-full h-full bg-transparent outline-none text-sm transition-all duration-300 ease-out
              ${icon ? 'pr-11' : 'pr-3.5'}
              ${endAdornment ? 'pl-10' : 'pl-3.5'}
              ${isFloating ? 'pt-6 pb-1.5 text-gray-800' : 'pt-3 pb-3 text-transparent'}
            `}
            {...props}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
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
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none z-20">
              <span className={`transition-all duration-300 ease-out ${focused ? (error ? 'text-red-500 scale-110' : 'text-primary scale-110') : 'text-gray-400'}`}>
                {icon}
              </span>
            </div>
          )}

          {endAdornment && isFloating && (
            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3.5">
              <span className={`text-xs transition-all duration-300 ease-out ${focused ? (error ? 'text-red-500' : 'text-primary') : 'text-gray-500'}`}>
                {endAdornment}
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


export default FloatingInput;
