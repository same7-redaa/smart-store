import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  height?: number;
  width?: number;
}

export const Barcode: React.FC<BarcodeProps> = ({ value, height = 40, width = 1.5 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue: false,
          margin: 0,
          background: '#ffffff',
        });
      } catch {}
    }
  }, [value, height, width]);

  if (!value) return <span className="text-gray-400 text-xs">—</span>;

  return (
    <svg ref={svgRef} className="inline-block" />
  );
};
