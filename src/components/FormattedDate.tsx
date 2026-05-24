import React from 'react';

interface FormattedDateProps {
  dateStr?: string | null;
  className?: string;
}

export const normDigits = (s: string) => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

export const FormattedDate: React.FC<FormattedDateProps> = ({ dateStr, className = '' }) => {
  if (!dateStr || dateStr === '—') return <span className={`text-gray-400 ${className}`}>—</span>;
  
  return (
    <span className={`text-gray-500 font-medium whitespace-nowrap dir-ltr inline-block ${className}`}>
      {normDigits(dateStr)}
    </span>
  );
};
