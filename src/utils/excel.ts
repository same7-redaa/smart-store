import * as XLSX from 'xlsx';

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ExcelSheet {
  name: string;
  data: Record<string, any>[];
  columns: ExcelColumn[];
}

export interface ImportResult<T = any> {
  success: boolean;
  count: number;
  errors: { row: number; message: string }[];
  data: T[];
}

export interface MultiSheetImportResult {
  success: boolean;
  sheets: { name: string; data: Record<string, any>[] }[];
  errors: string[];
}

export const exportToExcel = (
  data: Record<string, any>[],
  columns: ExcelColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
): void => {
  if (!data.length) return;
  const wsData = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => { obj[col.header] = row[col.key] ?? ''; });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(wsData, { header: columns.map(c => c.header) });
  ws['!cols'] = columns.map(col => ({ wch: col.width || Math.max(col.header.length, 15) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportMultiSheet = (
  sheets: ExcelSheet[],
  filename: string
): void => {
  const wb = XLSX.utils.book_new();
  sheets.forEach(sheet => {
    if (!sheet.data.length) {
      sheet.data = [{}];
    }
    const wsData = sheet.data.map(row => {
      const obj: Record<string, any> = {};
      sheet.columns.forEach(col => { obj[col.header] = row[col.key] ?? ''; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(wsData, { header: sheet.columns.map(c => c.header) });
    ws['!cols'] = sheet.columns.map(col => ({ wch: col.width || Math.max(col.header.length, 15) }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const importFromExcel = <T = Record<string, any>>(
  file: File
): Promise<ImportResult<T>> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: T[] = XLSX.utils.sheet_to_json(worksheet);
        if (!jsonData.length) {
          resolve({ success: false, count: 0, errors: [{ row: 0, message: 'الملف فارغ' }], data: [] });
          return;
        }
        resolve({ success: true, count: jsonData.length, errors: [], data: jsonData });
      } catch {
        resolve({ success: false, count: 0, errors: [{ row: 0, message: 'خطأ في قراءة ملف Excel' }], data: [] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const importMultiSheet = (file: File): Promise<MultiSheetImportResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheets: { name: string; data: Record<string, any>[] }[] = [];
        workbook.SheetNames.forEach(name => {
          const ws = workbook.Sheets[name];
          const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);
          sheets.push({ name, data: jsonData });
        });
        resolve({ success: true, sheets, errors: [] });
      } catch {
        resolve({ success: false, sheets: [], errors: ['خطأ في قراءة ملف Excel'] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const downloadTemplate = (
  columns: ExcelColumn[],
  filename: string,
  sheetName: string = 'Template'
): void => {
  const ws = XLSX.utils.json_to_sheet([{}], { header: columns.map(c => c.header) });
  ws['!cols'] = columns.map(col => ({ wch: col.width || Math.max(col.header.length, 15) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}-template.xlsx`);
};

export const downloadInventoryTemplate = (): void => {
  const wb = XLSX.utils.book_new();

  // ═════════════════════════════════════
  // Sheet 1: Instructions
  // ═════════════════════════════════════
  const instrData = [
    ['📋 دليل استخدام نموذج استيراد المنتجات'],
    [''],
    ['الورقة التالية: "المنتجات" — كل صف = منتج واحد'],
    [''],
    ['🔹 اسم المنتج: الحقل الوحيد المطلوب'],
    ['🔹 SKU والباركود: اتركهما فارغين ليتم توليدهما تلقائياً'],
    ['🔹 التصنيف والحالة: اختر من القائمة المنسدلة في الخلية'],
    ['🔹 الخصوم + لديه متغيرات: اختر من القائمة المنسدلة'],
    ['🔹 المتغيرات: اكتب في خلية واحدة بصيغة: اسم|كمية|سعر;اسم2|كمية2|سعر2'],
    ['    مثال: أحمر,10,160;أزرق,20,150'],
    ['🔹 الموردين: اكتب بصيغة: اسم_المورد|سعر_التكلفة|مدفوع(نعم/لا)|المبلغ'],
    ['    مثال: شركة الأمل|80|لا|2000'],
    [''],
    ['💡 بعد الاستيراد يتم إنشاء/تحديث المنتجات والموردين والتصنيفات تلقائياً'],
  ];
  const instrWs = XLSX.utils.aoa_to_sheet(instrData);
  instrWs['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, instrWs, 'تعليمات');

  // ═════════════════════════════════════
  // Sheet 2: Products (single flat sheet)
  // ═════════════════════════════════════
  const headers = [
    'رقم المنتج (SKU)',
    'اسم المنتج',
    'التصنيف',
    'الوصف',
    'سعر البيع',
    'سعر التكلفة',
    'سعر الخصم',
    'الباركود',
    'الكمية',
    'حد التنبيه',
    'الحالة',
    'لديه متغيرات',
    'المتغيرات (اسم|كمية|سعر)',
    'الموردين (اسم|تكلفة|مدفوع|مبلغ)',
  ];

  const row2 = [
    '', // SKU
    'تيشيرت قطني', // name
    'ملابس', // category
    'قطن 100%', // description
    150, // price
    80, // cost
    120, // discount
    '', // barcode (auto)
    50, // quantity
    5, // lowStockAlert
    'متوفر', // status
    'لا', // hasVariants
    '', // variants
    '', // suppliers
  ];

  // Build rows: header + example + 60 empty rows
  const rows: any[][] = [headers, row2];

  for (let i = 0; i < 60; i++) {
    rows.push(headers.map(() => ''));
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 20 },  // SKU
    { wch: 30 },  // name
    { wch: 15 },  // category
    { wch: 35 },  // description
    { wch: 12 },  // price
    { wch: 12 },  // cost
    { wch: 12 },  // discount
    { wch: 20 },  // barcode
    { wch: 10 },  // quantity
    { wch: 12 },  // alert
    { wch: 12 },  // status
    { wch: 14 },  // hasVariants
    { wch: 40 },  // variants
    { wch: 40 },  // suppliers
  ];

  // Pre-fill status (col 11) and hasVariants (col 12) for rows 3–62
  for (let r = 3; r <= 62; r++) {
    const statusCell = XLSX.utils.encode_cell({ r: r - 1, c: 10 });
    const varCell = XLSX.utils.encode_cell({ r: r - 1, c: 11 });
    ws[statusCell] = { t: 's', v: 'متوفر' };
    ws[varCell] = { t: 's', v: 'لا' };
  }

  // ── Data Validations ──
  const dv: Record<string, any> = {};

  // Column C (index 2): Category — rows 2 to 62
  dv['C2:C62'] = {
    type: 'list',
    formula1: '"ملابس,إلكترونيات,أحذية,إكسسوارات,مواد غذائية,مواد تعبئة,متنوع,خدمات"',
    allowBlank: true,
    showInputMessage: true,
    promptTitle: 'التصنيف',
    prompt: 'اختر تصنيف أو اكتب تصنيف جديد',
  };

  // Column K (index 10): Status — rows 2 to 62
  dv['K2:K62'] = {
    type: 'list',
    formula1: '"متوفر,مسودة,نفد"',
    allowBlank: true,
    showInputMessage: true,
    promptTitle: 'الحالة',
    prompt: 'متوفر = منشور | مسودة = غير منشور | نفد = نفذ من المخزون',
  };

  // Column L (index 11): HasVariants — rows 2 to 62
  dv['L2:L62'] = {
    type: 'list',
    formula1: '"نعم,لا"',
    allowBlank: true,
    showInputMessage: true,
    promptTitle: 'لديه متغيرات',
    prompt: 'نعم = له مقاسات/ألوان | لا = منتج بسيط',
  };

  ws['!dataValidations'] = dv;

  XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');

  XLSX.writeFile(wb, 'inventory-template.xlsx');
};

// ── Cell parsing helpers ──

export const parseItemsCell = (cellValue: string): { sku: string; productName: string; quantity: number; price: number; total: number }[] => {
  if (!cellValue || typeof cellValue !== 'string') return [];
  return cellValue.split(';').filter(Boolean).map(item => {
    const parts = item.split('|');
    return { sku: parts[0]?.trim() || '', productName: parts[1]?.trim() || '', quantity: Number(parts[2]) || 0, price: Number(parts[3]) || 0, total: Number(parts[4]) || 0 };
  });
};

export const formatItemsCell = (items: { sku?: string; productName?: string; quantity?: number; price?: number; total?: number }[]): string => {
  return items.map(item => `${item.sku || ''}|${item.productName || ''}|${item.quantity || 0}|${item.price || 0}|${item.total || 0}`).join(';');
};

export const parseAttributesCell = (cellValue: string): { id: string; name: string; values: string[] }[] => {
  if (!cellValue || typeof cellValue !== 'string') return [];
  return cellValue.split(';').filter(Boolean).map((attr, i) => {
    const colonIdx = attr.indexOf(':');
    if (colonIdx === -1) return { id: String(i + 1), name: attr.trim(), values: [] };
    return {
      id: String(i + 1),
      name: attr.substring(0, colonIdx).trim(),
      values: attr.substring(colonIdx + 1).split(',').map(v => v.trim()).filter(Boolean),
    };
  });
};

export const formatAttributesCell = (attrs: { name?: string; values?: string[] }[]): string => {
  return attrs.map(a => `${a.name || ''}:${(a.values || []).join(',')}`).join(';');
};

export const parseVariantsCell = (cellValue: string): { name: string; sku: string; sellingPrice: number; discountPrice: number; costPrice: number; quantity: number; barcode: string; lowStockAlert: number }[] => {
  if (!cellValue || typeof cellValue !== 'string') return [];
  return cellValue.split(';').filter(Boolean).map(v => {
    const parts = v.split('|');
    return {
      name: parts[0]?.trim() || '',
      sku: parts[1]?.trim() || '',
      sellingPrice: Number(parts[2]) || 0,
      discountPrice: Number(parts[3]) || 0,
      costPrice: Number(parts[4]) || 0,
      quantity: Number(parts[5]) || 0,
      barcode: parts[6]?.trim() || '',
      lowStockAlert: Number(parts[7]) || 0,
    };
  });
};

export const formatVariantsCell = (variants: { name?: string; sku?: string; sellingPrice?: number; discountPrice?: number; costPrice?: number; quantity?: number; barcode?: string; lowStockAlert?: number }[]): string => {
  return variants.map(v =>
    `${v.name || ''}|${v.sku || ''}|${v.sellingPrice || 0}|${v.discountPrice || 0}|${v.costPrice || 0}|${v.quantity || 0}|${v.barcode || ''}|${v.lowStockAlert || 0}`
  ).join(';');
};

export const parseSupplierLinksCell = (cellValue: string): { supplierId: string; supplierName: string; category: string; phone: string; costPrice: number; isPaid: boolean; paidAmount: number }[] => {
  if (!cellValue || typeof cellValue !== 'string') return [];
  return cellValue.split(';').filter(Boolean).map(link => {
    const parts = link.split('|');
    return {
      supplierId: parts[0]?.trim() || '',
      supplierName: parts[1]?.trim() || '',
      category: parts[2]?.trim() || '',
      phone: parts[3]?.trim() || '',
      costPrice: Number(parts[4]) || 0,
      isPaid: parts[5]?.trim() === 'نعم' || parts[5]?.trim() === 'true',
      paidAmount: Number(parts[6]) || 0,
    };
  });
};

export const formatSupplierLinksCell = (links: { supplierId?: string; supplierName?: string; category?: string; phone?: string; costPrice?: number; isPaid?: boolean; paidAmount?: number }[]): string => {
  return links.map(link =>
    `${link.supplierId || ''}|${link.supplierName || ''}|${link.category || ''}|${link.phone || ''}|${link.costPrice || 0}|${link.isPaid ? 'نعم' : 'لا'}|${link.paidAmount || 0}`
  ).join(';');
};

export const parseGovernoratesCell = (cellValue: string): { name: string; originalPrice: number; customerPrice: number }[] => {
  if (!cellValue || typeof cellValue !== 'string') return [];
  return cellValue.split(';').filter(Boolean).map(gov => {
    const parts = gov.split('|');
    return { name: parts[0]?.trim() || '', originalPrice: Number(parts[1]) || 0, customerPrice: Number(parts[2]) || 0 };
  });
};

export const formatGovernoratesCell = (govs: { name?: string; originalPrice?: number; customerPrice?: number }[]): string => {
  return govs.map(g => `${g.name || ''}|${g.originalPrice || 0}|${g.customerPrice || 0}`).join(';');
};

export const parseInvoicesCell = (cellValue: string): { id: string; date: string; items: any[]; total: number; paid: number; notes: string }[] => {
  if (!cellValue || typeof cellValue !== 'string') return [];
  return cellValue.split(';').filter(Boolean).map(inv => {
    const parts = inv.split('|');
    return { id: parts[0]?.trim() || '', date: parts[1]?.trim() || '', items: parts[2] ? parseItemsCell(parts[2]) : [], total: Number(parts[3]) || 0, paid: Number(parts[4]) || 0, notes: parts[5]?.trim() || '' };
  });
};

export const formatInvoicesCell = (invoices: { id?: string; date?: string; items?: any[]; total?: number; paid?: number; notes?: string }[]): string => {
  return invoices.map(inv =>
    `${inv.id || ''}|${inv.date || ''}|${inv.items ? formatItemsCell(inv.items) : ''}|${inv.total || 0}|${inv.paid || 0}|${inv.notes || ''}`
  ).join(';');
};
