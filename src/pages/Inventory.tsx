import React, { useState, useMemo, useRef } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, BarChart2, Download, Upload, ChevronDown, ChevronUp, Package, Copy, Check, X, CheckSquare, Square, Trash, FileDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { exportMultiSheet, importMultiSheet, downloadInventoryTemplate, formatVariantsCell, formatSupplierLinksCell, parseVariantsCell, parseSupplierLinksCell, parseAttributesCell, formatAttributesCell } from '../utils/excel';
import { syncProductToSystem, getFromStorage, saveToStorage } from '../utils/sync';

const PAGE_SIZE = 20;

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2]);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d);
  }
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) return date;
  return null;
};

const DATE_PRESETS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'year', label: 'هذا العام' },
  { id: 'all', label: 'كل الفترات' },
] as const;

const getPresetRange = (preset: string): { from: string; to: string } | null => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (preset) {
    case 'today': return { from: new Date(y, m, d).toISOString().split('T')[0], to: new Date(y, m, d).toISOString().split('T')[0] };
    case 'week': {
      const monday = new Date(y, m, d - ((now.getDay() + 6) % 7));
      const sunday = new Date(y, m, monday.getDate() + 6);
      return { from: monday.toISOString().split('T')[0], to: sunday.toISOString().split('T')[0] };
    }
    case 'month': return { from: new Date(y, m, 1).toISOString().split('T')[0], to: new Date(y, m + 1, 0).toISOString().split('T')[0] };
    case 'year': return { from: new Date(y, 0, 1).toISOString().split('T')[0], to: new Date(y, 11, 31).toISOString().split('T')[0] };
    default: return null;
  }
};

export const Inventory: React.FC<{ setActivePage?: (page: any) => void }> = ({ setActivePage }) => {
  const { confirm, notify } = useApp();
  const [showStats, setShowStats]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts]     = useState<any[]>(() =>
    JSON.parse(localStorage.getItem('my_products') || '[]')
  );
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [copiedId, setCopiedId]     = useState<string | null>(null);

  // ── Search & Filter state ──────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Pagination ─────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Selection ──────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Import ref ─────────────────────────────────────────
  const importRef = useRef<HTMLInputElement>(null);

  // ── Derived lists ──────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const effectiveFrom = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.from || dateFrom : dateFrom;
    const effectiveTo = datePreset !== 'custom' && datePreset !== 'all' ? getPresetRange(datePreset)?.to || dateTo : dateTo;
    const fromDate = effectiveFrom ? new Date(effectiveFrom + 'T00:00:00') : null;
    const toDate = effectiveTo ? new Date(effectiveTo + 'T23:59:59') : null;
    const q = searchQuery.trim().toLowerCase();
    return products.filter(p => {
      const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q) || p.variants?.some((v: any) => v.sku?.toLowerCase().includes(q) || v.barcode?.toLowerCase().includes(q));
      const matchCat    = !filterCategory || p.category === filterCategory;
      const matchStatus = !filterStatus   || p.status   === filterStatus;
      if (fromDate || toDate) {
        const d = parseDate(p.createdAt);
        if (d) {
          if (fromDate && d < fromDate) return false;
          if (toDate && d > toDate) return false;
        }
      }
      return matchSearch && matchCat && matchStatus;
    });
  }, [products, searchQuery, filterCategory, filterStatus, datePreset, dateFrom, dateTo]);

  const totalPages    = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage      = Math.min(currentPage, totalPages);
  const pagedProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filters change
  const handleSearch = (v: string) => { setSearchQuery(v); setCurrentPage(1); };
  const handleCat    = (v: string) => { setFilterCategory(v); setCurrentPage(1); };
  const handleStatus = (v: string) => { setFilterStatus(v); setCurrentPage(1); };
  const clearFilters = () => { setFilterCategory(''); setFilterStatus(''); setCurrentPage(1); };
  const hasActiveFilters = filterCategory || filterStatus || datePreset !== 'all' || dateFrom || dateTo;

  // ── Categories from localStorage ──────────────────────
  const categories = useMemo(() => {
    try {
      const raw = localStorage.getItem('my_categories');
      const list: any[] = raw ? JSON.parse(raw) : [];
      return list.map(c => [c.id, c.name] as [string, string]);
    } catch { return []; }
  }, []);

  // ── Stats ──────────────────────────────────────────────
  const totalProducts = products.length;
  const lowStock      = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockAlert || 10)).length;
  const outOfStock    = products.filter(p => p.stock === 0 || p.status === 'نفد').length;

  // ── Helpers ────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'متوفر': return 'bg-green-100 text-green-700';
      case 'منخفض': return 'bg-yellow-100 text-yellow-700';
      case 'نفد':   return 'bg-red-100 text-red-700';
      default:      return 'bg-gray-100 text-gray-700';
    }
  };

  const categoryLabel = (cat: string) => {
    const found = categories.find(([id]) => id === cat);
    return found ? found[1] : cat;
  };

  const toggleVariants = (id: string, product: any) => {
    if (!product.hasVariants || !product.variants?.length) return;
    setExpandedProductId(expandedProductId === id ? null : id);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const saveProducts = (list: any[]) => {
    setProducts(list);
    localStorage.setItem('my_products', JSON.stringify(list));
  };

  // ── Selection handlers ─────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const ids = pagedProducts.map(p => p.id);
    if (ids.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set([...selectedIds, ...ids]));
    }
  };
  const deleteSelected = () => {
    if (!selectedIds.size) return;
    const count = selectedIds.size;
    confirm({
      title: 'حذف المحدد',
      message: `هل أنت متأكد من حذف ${count} منتج؟`,
      onConfirm: () => {
        const updated = products.filter(p => !selectedIds.has(p.id));
        saveProducts(updated);
        setSelectedIds(new Set());
        notify('success', `تم حذف ${count} منتج بنجاح`);
      }
    });
  };

  // ── Export Excel (Multi-Sheet) ──────────────────────────
  const handleExport = () => {
    if (!products.length) { notify('info', 'لا توجد منتجات للتصدير'); return; }

    // Sheet 1: Basic Products
    const basicData = products.map(p => ({
      'رقم المنتج (SKU)': p.id,
      'اسم المنتج': p.name,
      'التصنيف': p.category,
      'الوصف': p.description || '',
      'سعر البيع': Number(String(p.price).replace(/[^0-9.-]/g, '')) || 0,
      'سعر التكلفة': p.costPrice || '',
      'سعر الخصم': p.discountPrice || '',
      'الباركود': p.barcode || '',
      'الكمية': p.stock || 0,
      'حد التنبيه': p.lowStockAlert ?? 10,
      'الحالة': p.status,
      'لديه متغيرات': p.hasVariants ? 'نعم' : 'لا',
      'الخصائص': p.hasVariants && p.attributes?.length ? formatAttributesCell(p.attributes) : '',
    }));

    // Sheet 2: Variants
    const variantData: any[] = [];
    products.forEach(p => {
      if (p.hasVariants && p.variants?.length) {
        p.variants.forEach((v: any) => {
          variantData.push({
            'رقم المنتج (SKU)': p.id,
            'اسم المتغير': v.name,
            'SKU المتغير': v.sku || '',
            'سعر البيع': v.sellingPrice || '',
            'سعر الخصم': v.discountPrice || '',
            'سعر التكلفة': v.costPrice || '',
            'الكمية': v.quantity || 0,
            'الباركود': v.barcode || '',
            'حد التنبيه': v.lowStockAlert ?? '',
          });
        });
      }
    });

    // Sheet 3: Supplier Links
    const supplierData: any[] = [];
    products.forEach(p => {
      if (p.supplierLinks?.length) {
        p.supplierLinks.forEach((link: any) => {
          supplierData.push({
            'رقم المنتج (SKU)': p.id,
            'رقم المورد': link.supplierId || '',
            'اسم المورد': link.supplierName || link.name || '',
            'تصنيف المورد': link.category || '',
            'هاتف المورد': link.phone || '',
            'سعر التكلفة من المورد': link.costPrice || '',
            'مدفوع بالكامل': link.isPaid ? 'نعم' : 'لا',
            'المبلغ المدفوع': link.paidAmount || 0,
          });
        });
      }
    });

    exportMultiSheet([
      {
        name: 'المنتجات الأساسية',
        data: basicData,
        columns: [
          { key: 'رقم المنتج (SKU)', header: 'رقم المنتج (SKU)', width: 20 },
          { key: 'اسم المنتج', header: 'اسم المنتج', width: 30 },
          { key: 'التصنيف', header: 'التصنيف', width: 20 },
          { key: 'الوصف', header: 'الوصف', width: 40 },
          { key: 'سعر البيع', header: 'سعر البيع', width: 12 },
          { key: 'سعر التكلفة', header: 'سعر التكلفة', width: 12 },
          { key: 'سعر الخصم', header: 'سعر الخصم', width: 12 },
          { key: 'الباركود', header: 'الباركود', width: 20 },
          { key: 'الكمية', header: 'الكمية', width: 10 },
          { key: 'حد التنبيه', header: 'حد التنبيه', width: 12 },
          { key: 'الحالة', header: 'الحالة', width: 15 },
          { key: 'لديه متغيرات', header: 'لديه متغيرات', width: 15 },
          { key: 'الخصائص', header: 'الخصائص', width: 40 },
        ],
      },
      {
        name: 'المتغيرات',
        data: variantData.length ? variantData : [{}],
        columns: [
          { key: 'رقم المنتج (SKU)', header: 'رقم المنتج (SKU)', width: 20 },
          { key: 'اسم المتغير', header: 'اسم المتغير', width: 30 },
          { key: 'SKU المتغير', header: 'SKU المتغير', width: 20 },
          { key: 'سعر البيع', header: 'سعر البيع', width: 12 },
          { key: 'سعر الخصم', header: 'سعر الخصم', width: 12 },
          { key: 'سعر التكلفة', header: 'سعر التكلفة', width: 12 },
          { key: 'الكمية', header: 'الكمية', width: 10 },
          { key: 'الباركود', header: 'الباركود', width: 20 },
          { key: 'حد التنبيه', header: 'حد التنبيه', width: 12 },
        ],
      },
      {
        name: 'روابط الموردين',
        data: supplierData.length ? supplierData : [{}],
        columns: [
          { key: 'رقم المنتج (SKU)', header: 'رقم المنتج (SKU)', width: 20 },
          { key: 'رقم المورد', header: 'رقم المورد', width: 20 },
          { key: 'اسم المورد', header: 'اسم المورد', width: 25 },
          { key: 'تصنيف المورد', header: 'تصنيف المورد', width: 15 },
          { key: 'هاتف المورد', header: 'هاتف المورد', width: 15 },
          { key: 'سعر التكلفة من المورد', header: 'سعر التكلفة من المورد', width: 18 },
          { key: 'مدفوع بالكامل', header: 'مدفوع بالكامل', width: 15 },
          { key: 'المبلغ المدفوع', header: 'المبلغ المدفوع', width: 15 },
        ],
      },
    ], 'inventory');
    notify('success', `تم تصدير ${products.length} منتج (${variantData.length} متغير، ${supplierData.length} رابط مورد)`);
  };

  // ── Download Template ──────────────────────────────────
  const handleDownloadTemplate = () => {
    downloadInventoryTemplate();
  };

  // ── Import Excel (Multi-Sheet) ──────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importMultiSheet(file);
    if (!result.success) {
      notify('error', result.errors[0] || 'خطأ في قراءة الملف');
      e.target.value = '';
      return;
    }

    let totalCreated = 0, totalUpdated = 0, totalVariants = 0, totalSuppliers = 0, totalErrors = 0;
    const allErrors: string[] = [];
    const allDetails: string[] = [];

    // Find sheets by name from imported workbook
    const findSheet = (keywords: string[]) =>
      result.sheets.find(s => keywords.some(k => s.name.includes(k)));

    const basicSheet = findSheet(['المنتجات الأساسية', 'المنتجات']) || result.sheets[0];
    if (!basicSheet || !basicSheet.data.length) {
      notify('error', 'ورقة المنتجات فارغة أو غير موجودة');
      e.target.value = '';
      return;
    }

    // Collect existing barcodes to avoid duplicates
    const existingProducts = getFromStorage('my_products');
    const usedBarcodes = new Set<string>();
    existingProducts.forEach((p: any) => {
      if (p.barcode) usedBarcodes.add(p.barcode);
      p.variants?.forEach((v: any) => { if (v.barcode) usedBarcodes.add(v.barcode); });
    });

    const generateBarcode = (): string => {
      let barcode: string;
      do {
        barcode = String(Math.floor(Math.random() * 9000000000000 + 1000000000000));
      } while (usedBarcodes.has(barcode));
      usedBarcodes.add(barcode);
      return barcode;
    };

    const generateSku = (): string => {
      return `#PRD-${Math.floor(Math.random() * 9000 + 1000)}`;
    };

    for (const row of basicSheet.data) {
      const r = row as Record<string, any>;
      const name = String(r['اسم المنتج'] || r['name'] || '').trim();
      if (!name) continue;

      const hasVariants = String(r['لديه متغيرات'] || r['hasVariants'] || '').trim() === 'نعم';
      const attrsStr = String(r['الخصائص'] || r['attributes'] || '');
      const attributes = attrsStr ? parseAttributesCell(attrsStr) : [];

      // Auto-generate SKU if empty
      const rawId = String(r['رقم المنتج (SKU)'] || r['id'] || '').trim();
      const productId = rawId || generateSku();

      // Auto-generate barcode if empty
      const rawBarcode = String(r['الباركود'] || r['barcode'] || '').trim();
      const barcode = rawBarcode || generateBarcode();

      const product = {
        id: productId,
        baseSku: productId,
        name,
        category: String(r['التصنيف'] || r['category'] || 'عام'),
        description: String(r['الوصف'] || r['description'] || ''),
        price: `${Number(r['سعر البيع'] || r['sellingPrice'] || 0)} ج.م`,
        costPrice: String(r['سعر التكلفة'] || r['costPrice'] || ''),
        discountPrice: String(r['سعر الخصم'] || r['discountPrice'] || ''),
        barcode,
        stock: Number(r['الكمية'] || r['quantity'] || 0),
        lowStockAlert: Number(r['حد التنبيه'] || r['lowStockAlert'] || 10),
        status: String(r['الحالة'] || r['status'] || 'متوفر'),
        hasVariants,
        attributes,
        variants: [],
        supplierLinks: [],
        createdAt: String(r['تاريخ الإنشاء'] || r['createdAt'] || new Date().toISOString()),
      };

      const syncResult = syncProductToSystem(product);
      totalCreated += syncResult.created;
      totalUpdated += syncResult.updated;
      allErrors.push(...syncResult.errors);
      allDetails.push(...syncResult.details);
    }

    // 2. Process variants sheet (if present)
    const variantsSheet = findSheet(['متغير']);
    if (variantsSheet && variantsSheet.data.length) {
      const variantsData = variantsSheet.data;

      // Group variants by product ID
      const variantsByProduct: Map<string, any[]> = new Map();
      for (const row of variantsData) {
        const productId = String(row['رقم المنتج (SKU)'] || row['productId'] || '').trim();
        if (!productId) continue;
        if (!variantsByProduct.has(productId)) variantsByProduct.set(productId, []);
        variantsByProduct.get(productId)!.push(row);
      }

      // Apply variants to products
      const products = getFromStorage('my_products');
      variantsByProduct.forEach((variantRows, productId) => {
        const product = products.find((p: any) => p.id === productId || p.baseSku === productId);
        if (!product) {
          allErrors.push(`المنتج ${productId} غير موجود لإضافة المتغيرات`);
          totalErrors++;
          return;
        }

        const variants = variantRows.map(r => {
          const rawVariantSku = String(r['SKU المتغير'] || r['sku'] || '').trim();
          const rawVariantBarcode = String(r['الباركود'] || r['barcode'] || '').trim();
          return {
            name: String(r['اسم المتغير'] || r['variantName'] || ''),
            sku: rawVariantSku || `${productId}-${Math.floor(Math.random() * 9000 + 1000)}`,
            sellingPrice: Number(r['سعر البيع'] || r['sellingPrice'] || 0),
            discountPrice: Number(r['سعر الخصم'] || r['discountPrice'] || 0),
            costPrice: Number(r['سعر التكلفة'] || r['costPrice'] || 0),
            quantity: Number(r['الكمية'] || r['quantity'] || 0),
            barcode: rawVariantBarcode || generateBarcode(),
            lowStockAlert: Number(r['حد التنبيه'] || r['lowStockAlert'] || product.lowStockAlert || 10),
          };
        }).filter(v => v.name);

        if (variants.length > 0) {
          product.variants = variants;
          product.hasVariants = true;
          product.stock = variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);
          product.status = product.stock > 0 ? 'متوفر' : 'نفد';
          totalVariants += variants.length;
          allDetails.push(`تم إضافة ${variants.length} متغير للمنتج ${product.name}`);
        }
      });
      saveToStorage('my_products', products);
    }

    // 3. Process supplier links sheet (if present)
    const suppliersSheet = findSheet(['مورد']);
    if (suppliersSheet && suppliersSheet.data.length) {
      const supplierRows = suppliersSheet.data;

      // Group by product ID
      const suppliersByProduct: Map<string, any[]> = new Map();
      for (const row of supplierRows) {
        const productId = String(row['رقم المنتج (SKU)'] || row['productId'] || '').trim();
        if (!productId) continue;
        if (!suppliersByProduct.has(productId)) suppliersByProduct.set(productId, []);
        suppliersByProduct.get(productId)!.push(row);
      }

      const products = getFromStorage('my_products');
      suppliersByProduct.forEach((linkRows, productId) => {
        const product = products.find((p: any) => p.id === productId || p.baseSku === productId);
        if (!product) {
          allErrors.push(`المنتج ${productId} غير موجود لإضافة الموردين`);
          totalErrors++;
          return;
        }

        const links = linkRows.map(r => ({
          supplierId: String(r['رقم المورد'] || r['supplierId'] || ''),
          supplierName: String(r['اسم المورد'] || r['supplierName'] || ''),
          category: String(r['تصنيف المورد'] || r['supplierCategory'] || ''),
          phone: String(r['هاتف المورد'] || r['supplierPhone'] || ''),
          costPrice: Number(r['سعر التكلفة من المورد'] || r['costPrice'] || 0),
          isPaid: String(r['مدفوع بالكامل'] || r['isPaid'] || '').trim() === 'نعم',
          paidAmount: Number(r['المبلغ المدفوع'] || r['paidAmount'] || 0),
        })).filter(l => l.supplierName);

        if (links.length > 0) {
          product.supplierLinks = links;
          totalSuppliers += links.length;
          allDetails.push(`تم ربط ${links.length} مورد للمنتج ${product.name}`);

          // Sync to suppliers
          const suppliers = getFromStorage('my_suppliers');
          links.forEach(link => {
            let sup = suppliers.find((s: any) => s.id === link.supplierId || s.name === link.supplierName);
            if (!sup && link.supplierName) {
              sup = {
                id: link.supplierId || `SUP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: link.supplierName,
                category: link.category,
                phone: link.phone,
                email: '',
                address: '',
                supplied: 0,
                dues: 0,
                paid: 0,
                totalInvoices: 0,
                invoices: [],
                status: 'نشط',
                notes: '',
                createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
              };
              suppliers.push(sup);
            }
            if (sup) {
              const cost = link.costPrice || 0;
              const qty = product.stock || 0;
              const totalCost = cost * qty;
              const paid = link.isPaid ? (link.paidAmount || totalCost) : (link.paidAmount || 0);
              const remaining = Math.max(0, totalCost - paid);

              if (!sup.invoices) sup.invoices = [];
              sup.invoices.push({
                id: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                date: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
                items: [{ productName: product.name, sku: product.baseSku || product.id, quantity: qty, price: cost, total: totalCost }],
                total: totalCost,
                paid,
                notes: 'من استيراد Excel',
              });
              sup.supplied = (sup.supplied || 0) + qty;
              sup.paid = (sup.paid || 0) + paid;
              if (remaining > 0) {
                sup.dues = (sup.dues || 0) + remaining;
                sup.financialStatus = 'مدين';
                sup.financialAmount = (sup.financialAmount || 0) + remaining;
              }
              sup.totalInvoices = (sup.totalInvoices || 0) + 1;
            }
          });
          saveToStorage('my_suppliers', suppliers);
        }
      });
      saveToStorage('my_products', products);
    }

    // Refresh local state
    setProducts(getFromStorage('my_products'));

    let msg = `تم استيراد ${basicSheet.data.length} منتج`;
    if (totalCreated > 0) msg += ` | إنشاء: ${totalCreated}`;
    if (totalUpdated > 0) msg += ` | تحديث: ${totalUpdated}`;
    if (totalVariants > 0) msg += ` | متغيرات: ${totalVariants}`;
    if (totalSuppliers > 0) msg += ` | روابط مورد: ${totalSuppliers}`;
    if (totalErrors > 0) msg += ` | أخطاء: ${totalErrors}`;
    notify(totalErrors > 0 ? 'error' : 'success', msg);

    if (allDetails.length > 0) console.log('تفاصيل الاستيراد:', allDetails);
    if (allErrors.length > 0) console.log('أخطاء الاستيراد:', allErrors);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col">
      {/* Hidden import input */}
      <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showStats ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart2 size={16} />
            <span>الإحصائيات</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-primary-light border-primary-light text-primary' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={16} />
            <span>تصفية</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
            )}
          </button>
          <button onClick={() => setActivePage?.('categories')} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Filter size={16} />
            <span>الفئات</span>
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={16} className="text-[#00c950]" />
            <span>تصدير</span>
          </button>
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown size={16} />
            <span>نموذج</span>
          </button>
          <button onClick={() => importRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Upload size={16} />
            <span>استيراد</span>
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="ابحث باسم المنتج أو الرقم..."
              className="w-full py-2 pr-10 pl-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setActivePage && setActivePage('add-product')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>إضافة منتج</span>
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="p-1 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">إجمالي المنتجات</p>
                  <h3 className="text-2xl font-bold text-gray-800">{totalProducts}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">منتجات منخفضة المخزون</p>
                  <h3 className="text-2xl font-bold text-yellow-600">{lowStock}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <p className="text-gray-500 font-medium">منتجات نفدت</p>
                  <h3 className="text-2xl font-bold text-red-500">{outOfStock}</h3>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="p-1 pb-2">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-gray-500 mb-1">التصنيف</label>
                  <select
                    value={filterCategory}
                    onChange={e => handleCat(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary"
                  >
                    <option value="">الكل</option>
                    {categories.map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-gray-500 mb-1">الحالة</label>
                  <select
                    value={filterStatus}
                    onChange={e => handleStatus(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary"
                  >
                    <option value="">الكل</option>
                    <option value="متوفر">متوفر</option>
                    <option value="منخفض">منخفض</option>
                    <option value="نفد">نفد</option>
                    <option value="مسودة">مسودة</option>
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-xs text-gray-500 mb-1.5">تاريخ الإنشاء</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DATE_PRESETS.map(p => (
                      <button key={p.id}
                        onClick={() => {
                          setDatePreset(p.id);
                          if (p.id === 'all') { setDateFrom(''); setDateTo(''); }
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${datePreset === p.id ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom}
                      onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                      className="flex-1 p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary" />
                    <span className="text-xs text-gray-400">إلى</span>
                    <input type="date" value={dateTo}
                      onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }}
                      className="flex-1 p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-primary" />
                  </div>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary border border-primary/20 bg-primary-light hover:bg-primary hover:text-white rounded-lg transition-colors"
                  >
                    <X size={14} />
                    مسح الفلاتر
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected actions bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-primary">{selectedIds.size} منتج محدد</span>
              <div className="flex items-center gap-2">
                <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  <Trash size={14} /> حذف المحدد
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  <X size={14} /> إلغاء التحديد
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-gray-500 text-sm border-b border-gray-100">
                <th className="px-3 py-2.5 w-10">
                  {filteredProducts.length > 0 && (
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-primary transition-colors">
                      {pagedProducts.every(p => selectedIds.has(p.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  )}
                </th>
                <th className="px-4 py-2.5 font-medium text-center">رقم المنتج</th>
                <th className="px-4 py-2.5 font-medium text-center">المنتج</th>
                <th className="px-4 py-2.5 font-medium text-center">التصنيف</th>
                <th className="px-4 py-2.5 font-medium text-center">السعر</th>
                <th className="px-4 py-2.5 font-medium text-center">الكمية</th>
                <th className="px-4 py-2.5 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {searchQuery || hasActiveFilters
                      ? 'لا توجد نتائج تطابق البحث أو الفلترة.'
                      : 'لا توجد منتجات حالياً. قم بإضافة منتج جديد.'}
                  </td>
                </tr>
              ) : pagedProducts.map((product, index) => {
                const limit = product.lowStockAlert || 10;
                let stockColor = 'text-gray-800';
                if (product.stock === 0) stockColor = 'text-red-500 font-bold';
                else if (product.stock <= limit) stockColor = 'text-yellow-600 font-bold';
                else stockColor = 'text-green-600 font-bold';

                const globalIndex = products.findIndex(p => p.id === product.id);

                return (
                  <React.Fragment key={product.id ?? index}>
                    <tr className={`hover:bg-gray-50 transition-colors ${selectedIds.has(product.id) ? 'bg-primary/5' : ''}`}>
                      {/* Checkbox */}
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => toggleSelect(product.id)} className={`transition-colors ${selectedIds.has(product.id) ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
                          {selectedIds.has(product.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>

                      {/* ID — click to copy */}
                      <td
                        className="px-4 py-2.5 font-bold text-primary text-center cursor-pointer select-none group"
                        onClick={() => handleCopyId(product.id)}
                        title="انقر للنسخ"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {product.id}
                          <span className={`transition-all duration-200 ${
                            copiedId === product.id
                              ? 'opacity-100 text-green-500'
                              : 'opacity-0 group-hover:opacity-50 text-gray-400'
                          }`}>
                            {copiedId === product.id
                              ? <Check size={13} strokeWidth={2.5} />
                              : <Copy size={13} />}
                          </span>
                        </span>
                      </td>

                      {/* Name — click to expand variants */}
                      <td
                        className={`px-4 py-2.5 font-medium text-center ${(product.hasVariants && product.variants?.length > 0) ? 'cursor-pointer hover:text-primary' : ''} text-gray-800`}
                        onClick={() => toggleVariants(product.id, product)}
                      >
                        <div className="flex items-center gap-3 justify-center">
                          {product.image || product.imageUrl ? (
                            <img src={product.image || product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0 shadow-sm" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-400 shrink-0">
                              <Package size={18} />
                            </div>
                          )}
                          <span className="inline-flex items-center gap-1">
                            {product.name}
                            {product.hasVariants && product.variants?.length > 0 && (
                              <span className="text-gray-400">
                                {expandedProductId === product.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-center text-gray-500">{categoryLabel(product.category)}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-800">{product.price}</td>
                      <td className={`px-4 py-2.5 text-center font-medium ${stockColor}`}>{product.stock}</td>

                      {/* Actions */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { localStorage.setItem('view_product', JSON.stringify(product)); setActivePage && setActivePage('view-product'); }}
                            className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => { localStorage.setItem('edit_product', JSON.stringify(product)); setActivePage && setActivePage('edit-product'); }}
                            className="p-1.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              confirm({
                                title: 'حذف المنتج',
                                message: 'هل أنت متأكد من حذف هذا المنتج؟',
                                onConfirm: () => {
                                  const newProds = products.filter((_, i) => i !== globalIndex);
                                  saveProducts(newProds);
                                  notify('success', 'تم حذف المنتج بنجاح');
                                }
                              });
                            }}
                            className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-md transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Variants expandable row */}
                    <AnimatePresence initial={false}>
                      {expandedProductId === product.id && product.hasVariants && product.variants?.length > 0 && (
                        <motion.tr key={`variants-${product.id}`} initial={false} className="bg-blue-50/30">
                          <td colSpan={7} className="p-0 overflow-hidden">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div className="border-t border-b border-primary/10 bg-white">
                                <table className="w-full text-sm text-center">
                                  <thead className="bg-primary/5 text-gray-500 border-b border-primary/10">
                                    <tr>
                                      <th className="py-2.5 px-4 font-medium text-center">المتغير</th>
                                      <th className="py-2.5 px-4 font-medium text-center">كود (SKU)</th>
                                      <th className="py-2.5 px-4 font-medium text-center">السعر</th>
                                      <th className="py-2.5 px-4 font-medium text-center">الكمية</th>
                                      <th className="py-2.5 px-4 font-medium text-center">الباركود</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {product.variants.map((variant: any, vIndex: number) => {
                                      const vQty = parseInt(variant.quantity);
                                      let vColor = 'text-gray-800';
                                      if (vQty === 0) vColor = 'text-red-500 font-bold';
                                      else if (vQty <= limit) vColor = 'text-yellow-600 font-bold';
                                      else vColor = 'text-green-600 font-bold';
                                      return (
                                        <tr key={vIndex} className="hover:bg-gray-50 transition-colors">
                                          <td className="py-2.5 px-4 font-medium text-gray-800">{variant.name}</td>
                                          <td className="py-2.5 px-4 text-xs text-gray-500">{variant.sku || '—'}</td>
                                          <td className="py-2.5 px-4 text-gray-700">{variant.sellingPrice ? `${variant.sellingPrice} ج.م` : '—'}</td>
                                          <td className={`py-2.5 px-4 font-semibold ${vColor}`}>{variant.quantity || '0'}</td>
                                          <td className="py-2.5 px-4 text-xs font-mono text-gray-500">{variant.barcode || '—'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs sm:text-sm text-gray-500 shrink-0">
          <div>
            عرض {filteredProducts.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredProducts.length)} من {filteredProducts.length} منتج
            {(searchQuery || hasActiveFilters) && totalProducts !== filteredProducts.length && (
              <span className="text-gray-400"> (من إجمالي {totalProducts})</span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              disabled={safePage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...'
                  ? <span key={`dots-${i}`} className="px-2 py-1 text-gray-400">…</span>
                  : <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`px-2 py-1 border rounded-md transition-colors ${safePage === p ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:bg-gray-50'}`}
                    >{p}</button>
              )}
            <button
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
