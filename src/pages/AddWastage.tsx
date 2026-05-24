import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowRight, Save, HelpCircle, Package, Info, AlertTriangle, ClipboardList, Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import FloatingInput from '../components/FloatingInput';
import FloatingTextarea from '../components/FloatingTextarea';
import FloatingSelect from '../components/FloatingSelect';

const STORAGE_KEY_WASTAGE = 'my_wastage';
const STORAGE_KEY_PRODUCTS = 'my_products';

interface WastageLog {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalLoss: number;
  reason: string;
  notes?: string;
  createdAt: string;
}

interface AddWastageProps {
  setActivePage: (page: any) => void;
}

export const AddWastage: React.FC<AddWastageProps> = ({ setActivePage }) => {
  const { notify } = useApp();

  const [products] = useState<any[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  });

  // Product search state
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantName, setSelectedVariantName] = useState('');
  const [logQty, setLogQty] = useState('');
  const [logReason, setLogReason] = useState('تلف مخزني');
  const [logNotes, setLogNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 10);
    return products
      .filter(p => p.name?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, productSearch]);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const maxAvailableQty = useMemo(() => {
    if (!selectedProduct) return 0;
    if (selectedProduct.hasVariants && selectedProduct.variants?.length) {
      const v = selectedProduct.variants.find((v: any) => v.name === selectedVariantName);
      return v ? v.stock : 0;
    }
    return selectedProduct.stock || 0;
  }, [selectedProduct, selectedVariantName]);

  const handleSelectProduct = (product: any) => {
    setSelectedProductId(product.id);
    setProductSearch(product.name);
    setSelectedVariantName('');
    setLogQty('');
    setShowProductDropdown(false);
    setErrors(prev => ({ ...prev, productId: '', variantName: '', logQty: '' }));
  };

  const handleClearProduct = () => {
    setSelectedProductId('');
    setProductSearch('');
    setSelectedVariantName('');
    setLogQty('');
    setErrors(prev => ({ ...prev, productId: '' }));
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!selectedProductId) errs.productId = 'يرجى اختيار المنتج التالف';

    if (selectedProduct) {
      if (selectedProduct.hasVariants && selectedProduct.variants?.length && !selectedVariantName) {
        errs.variantName = 'يرجى اختيار متغير المنتج';
      }
      const qty = parseInt(logQty);
      if (isNaN(qty) || qty <= 0) {
        errs.logQty = 'يرجى إدخال كمية صحيحة أكبر من صفر';
      } else if (qty > maxAvailableQty) {
        errs.logQty = `الكمية المدخلة أكبر من الكمية المتاحة بالمخزن (${maxAvailableQty})`;
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const qty = parseInt(logQty);
    let sku = selectedProduct.id;
    let unitCost = selectedProduct.costPrice || 0;

    // Update local products list
    const storedProducts: any[] = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS) || '[]');
    const updatedProducts = storedProducts.map(p => {
      if (p.id === selectedProductId) {
        const pCopy = { ...p };
        if (pCopy.hasVariants && pCopy.variants?.length) {
          pCopy.variants = pCopy.variants.map((v: any) => {
            if (v.name === selectedVariantName) {
              sku = v.sku || pCopy.id;
              unitCost = v.costPrice || pCopy.costPrice || 0;
              return { ...v, stock: Math.max(0, v.stock - qty) };
            }
            return v;
          });
          pCopy.stock = pCopy.variants.reduce((s: number, v: any) => s + (v.stock || 0), 0);
        } else {
          pCopy.stock = Math.max(0, (pCopy.stock || 0) - qty);
        }
        return pCopy;
      }
      return p;
    });

    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updatedProducts));

    // Create wastage record
    const newLog: WastageLog = {
      id: 'WST-' + Date.now(),
      productId: selectedProductId,
      productName: selectedProduct.name,
      variantName: selectedProduct.hasVariants ? selectedVariantName : undefined,
      sku: sku,
      quantity: qty,
      unitCost: unitCost,
      totalLoss: qty * unitCost,
      reason: logReason,
      notes: logNotes.trim(),
      createdAt: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };

    const currentLogs: WastageLog[] = JSON.parse(localStorage.getItem(STORAGE_KEY_WASTAGE) || '[]');
    const newLogs = [newLog, ...currentLogs];
    localStorage.setItem(STORAGE_KEY_WASTAGE, JSON.stringify(newLogs));

    notify('success', 'تم تسجيل الهالك اليدوي وتحديث المخزون بنجاح');
    setActivePage('wastage');
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setActivePage('wastage')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors cursor-pointer">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">تسجيل هالك وتالف جديد بالمخزن</h1>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm cursor-pointer shadow-primary/20">
          <Save size={16} />
          <span>تأكيد وتسجيل الهالك</span>
        </button>
      </div>

      {/* Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b flex items-center gap-2">
          <ClipboardList size={18} className="text-primary" />
          <span>تفاصيل الهالك والتالف</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Product Search */}
          <div className="md:col-span-2" ref={searchRef}>
            <label className="block text-xs text-gray-500 font-medium mb-1.5">
              اختر المنتج التالف <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className={`flex items-center gap-2 w-full px-3 py-2.5 bg-gray-50 border rounded-xl transition-all ${errors.productId ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus-within:border-primary focus-within:bg-white focus-within:ring-1 focus-within:ring-primary'}`}>
                <Package size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                    if (!e.target.value) handleClearProduct();
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="ابحث باسم المنتج..."
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 text-right"
                />
                {selectedProductId ? (
                  <button
                    type="button"
                    onClick={handleClearProduct}
                    className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                  >
                    <X size={15} />
                  </button>
                ) : (
                  <Search size={15} className="text-gray-400 shrink-0" />
                )}
              </div>

              {/* Dropdown Results */}
              {showProductDropdown && productSearch && (
                <div className="absolute z-30 top-full mt-1 right-0 left-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => handleSelectProduct(p)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-right hover:bg-primary/5 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                      >
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">المخزون: {p.stock} قطعة</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-mono shrink-0 mr-2">{p.id}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">لا توجد منتجات مطابقة</div>
                  )}
                </div>
              )}
            </div>
            {errors.productId && <p className="text-xs text-red-500 mt-1 mr-1">{errors.productId}</p>}
          </div>

          {/* Variant Selector */}
          {selectedProduct && selectedProduct.hasVariants && selectedProduct.variants?.length > 0 && (
            <div className="md:col-span-2">
              <FloatingSelect
                label="اختر المتغير / الحجم / اللون"
                value={selectedVariantName}
                onChange={e => {
                  setSelectedVariantName(e.target.value);
                  setLogQty('');
                  setErrors(prev => ({ ...prev, variantName: '', logQty: '' }));
                }}
                error={errors.variantName}
                required
                icon={<Info size={16} />}
              >
                <option value="">-- يرجى اختيار المتغير المتاح --</option>
                {selectedProduct.variants.map((v: any) => (
                  <option key={v.name} value={v.name}>{v.name} (المخزون المتوفر: {v.stock})</option>
                ))}
              </FloatingSelect>
              {errors.variantName && <p className="text-xs text-red-500 mt-1 mr-1">{errors.variantName}</p>}
            </div>
          )}

          {/* Quantity Stock Info Badge */}
          {selectedProduct && (
            <div className="md:col-span-2 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl text-sm text-emerald-800 font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-emerald-600 animate-pulse" />
                <span>الكمية المتوفرة بالمخزن للقطع المحددة:</span>
              </div>
              <span className="font-bold text-lg text-primary">{maxAvailableQty} قطعة</span>
            </div>
          )}

          {/* Log Qty */}
          <div>
            <FloatingInput
              label="الكمية التالفة"
              type="number"
              value={logQty}
              onChange={e => {
                setLogQty(e.target.value);
                setErrors(prev => ({ ...prev, logQty: '' }));
              }}
              error={errors.logQty}
              required
              placeholder="مثال: 5"
              icon={<AlertTriangle size={16} />}
            />
            {errors.logQty && <p className="text-xs text-red-500 mt-1 mr-1">{errors.logQty}</p>}
          </div>

          {/* Reason Selector */}
          <div>
            <FloatingSelect
              label="سبب الهالك"
              value={logReason}
              onChange={e => setLogReason(e.target.value)}
              icon={<HelpCircle size={16} />}
            >
              <option value="تلف مخزني">تلف مخزني</option>
              <option value="فقدان مخزني">فقدان مخزني</option>
              <option value="آخر">آخر</option>
            </FloatingSelect>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <FloatingTextarea
              label="ملاحظات تفصيلية"
              value={logNotes}
              onChange={e => setLogNotes(e.target.value)}
              placeholder="أدخل تفاصيل سبب التلف واسم المسؤول لتسهيل المراجعة..."
              icon={<ClipboardList size={16} />}
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
