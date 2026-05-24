import React, { useEffect, useState, useCallback } from 'react';
import { ArrowRight, Package, Edit, Trash2, Printer } from 'lucide-react';
import { Barcode } from '../components/Barcode';
import { useApp } from '../context/AppContext';

export const ViewProduct: React.FC<{ setActivePage: (p: any) => void }> = ({ setActivePage }) => {
  const { confirm, notify } = useApp();
  const [product, setProduct] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const data = localStorage.getItem('view_product');
    if (data) {
      const parsed = JSON.parse(data);
      setProduct(parsed);
      setActivePreviewImage(parsed.image || parsed.imageUrl || null);
    }
  }, []);

  const printBarcodes = useCallback((names: string[]) => {
    const p = product;
    if (!p || names.length === 0) return;
    const vars = p.hasVariants ? p.variants || [] : [];
    const items = names.map(name => vars.find((v: any) => v.name === name)).filter(Boolean);
    if (items.length === 0) return;

    const win = window.open('', '_blank');
    if (!win) return;

    const barcodeHtml = items.map((v: any) => {
      const bc = v.barcode;
      if (!bc) return '';
      return `<div class="barcode-item">
        <svg id="bc-${v.name.replace(/\s+/g, '-')}"></svg>
        <div class="bc-label">${bc}</div>
      </div>`;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>طباعة الباركود - ${p.name}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3/dist/JsBarcode.all.min.js"></script>
<style>
  @page { margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: sans-serif; padding: 20px; direction: rtl; }
  .header { text-align: center; margin-bottom: 20px; }
  .header h2 { font-size: 18px; color: #333; }
  .header p { font-size: 13px; color: #666; }
  .barcode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .barcode-item { text-align: center; padding: 15px; border: 1px dashed #ccc; border-radius: 8px; page-break-inside: avoid; }
  .barcode-item svg { max-width: 100%; height: auto; }
  .bc-label { margin-top: 6px; font-size: 14px; font-family: monospace; color: #333; letter-spacing: 1px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header no-print">
    <h2>${p.name}</h2>
    <p>${p.id}</p>
    <button onclick="window.print()" style="margin-top:10px;padding:8px 24px;background:#0866ff;color:white;border:none;border-radius:6px;cursor:pointer;">طباعة</button>
  </div>
  <div class="barcode-grid">
    ${barcodeHtml}
  </div>
  <script>
    ${items.map((v: any) => {
      const id = `bc-${v.name.replace(/\s+/g, '-')}`;
      return `try { JsBarcode("#${id}", "${v.barcode}", { format: "CODE128", width: 1.5, height: 50, displayValue: false, margin: 5 }); } catch(e) {}`;
    }).join('\n    ')}
  </script>
</body>
</html>`);
    win.document.close();
  }, [product]);

  if (!product) return <div className="p-10 text-center">جاري التحميل...</div>;

  const isPublished = product.status !== 'مسودة';

  const handleToggleStatus = () => {
    const newStatus = isPublished ? 'مسودة' : (product.stock > 0 ? 'متوفر' : 'نفد');
    const updated = { ...product, status: newStatus };
    setProduct(updated);
    localStorage.setItem('view_product', JSON.stringify(updated));
    const all = JSON.parse(localStorage.getItem('my_products') || '[]');
    const idx = all.findIndex((p: any) => p.id === product.id);
    if (idx > -1) { all[idx] = updated; localStorage.setItem('my_products', JSON.stringify(all)); }
  };

  const handleEdit = () => {
    localStorage.setItem('edit_product', JSON.stringify(product));
    localStorage.setItem('edit_source', 'view-product');
    setActivePage('edit-product');
  };

  const handleDelete = () => {
    confirm({
      title: 'حذف المنتج',
      message: 'هل أنت متأكد من حذف هذا المنتج؟',
      onConfirm: () => {
        const all = JSON.parse(localStorage.getItem('my_products') || '[]');
        const filtered = all.filter((p: any) => p.id !== product.id);
        localStorage.setItem('my_products', JSON.stringify(filtered));
        notify('success', 'تم حذف المنتج بنجاح');
        setActivePage('inventory');
      }
    });
  };

  const toggleVariant = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const variants = product.hasVariants ? product.variants || [] : [];

  const handlePrintSelected = () => printBarcodes(selected);
  const handlePrintAll = () => printBarcodes(variants.map((v: any) => v.name));

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePage('inventory')}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowRight size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-800">معاينة المنتج</h1>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors text-sm">
            <span className={`font-medium ${isPublished ? 'text-green-600' : 'text-gray-500'}`}>
              {isPublished ? 'نشط' : 'مسودة'}
            </span>
            <div className="relative" onClick={handleToggleStatus}>
              <div className={`block w-9 h-5 rounded-full transition-colors ${isPublished ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isPublished ? 'translate-x-4' : ''}`}></div>
            </div>
          </label>

          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
          >
            <Edit size={15} />
            <span>تعديل</span>
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary-light text-primary hover:bg-primary hover:text-white text-sm font-medium transition-colors"
          >
            <Trash2 size={15} />
            <span>حذف</span>
          </button>
        </div>
      </div>

      {/* Product Premium Gallery + Name Details */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Photo Gallery Frame */}
          <div className="w-full md:w-64 flex flex-col gap-3 shrink-0">
            {/* Main Preview Box */}
            <div className="w-full h-64 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 relative overflow-hidden group shadow-inner">
              {activePreviewImage ? (
                <img src={activePreviewImage} alt={product.name} className="absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Package size={48} className="text-gray-300" />
                  <span className="text-xs text-gray-400">لا توجد صور للمنتج</span>
                </div>
              )}
            </div>

            {/* Sub-Photos Carousel (Horizontal List) */}
            {((product.image || product.imageUrl) || (product.subPhotos && product.subPhotos.length > 0)) && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {/* Main Image Slot */}
                {(product.image || product.imageUrl) && (
                  <button
                    onClick={() => setActivePreviewImage(product.image || product.imageUrl)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      activePreviewImage === (product.image || product.imageUrl) ? 'border-primary scale-95 shadow-sm' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <img src={product.image || product.imageUrl} alt="Main" className="w-full h-full object-cover" />
                  </button>
                )}
                {/* Sub Image Slots */}
                {product.subPhotos?.map((sub: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setActivePreviewImage(sub)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      activePreviewImage === sub ? 'border-primary scale-95 shadow-sm' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <img src={sub} alt={`Sub ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="px-3 py-1 bg-primary/5 text-primary rounded-full text-xs font-semibold">
                  {product.category === 'electronics' ? 'إلكترونيات' :
                   product.category === 'clothing'    ? 'ملابس' :
                   product.category === 'shoes'       ? 'أحذية' : product.category || 'عام'}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  product.status === 'متوفر'  ? 'bg-green-50 text-green-600'  :
                  product.status === 'منخفض' ? 'bg-yellow-50 text-yellow-600' :
                  product.status === 'نفد'   ? 'bg-red-50 text-red-600'       :
                  'bg-gray-50 text-gray-500'
                }`}>{product.status}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{product.name}</h2>
              <p className="text-xs text-gray-400 font-mono mb-4">{product.id}</p>
              
              {product.description && (
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-sm text-gray-600 leading-relaxed mb-4">
                  <h4 className="text-xs font-bold text-gray-400 mb-1">وصف المنتج</h4>
                  {product.description}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">معلومات المنتج</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">السعر</p>
            <p className="font-bold text-base text-gray-800">{product.price}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">الكمية</p>
            <p className="font-bold text-base text-gray-800">{product.stock}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">حد التنبيه</p>
            <p className="font-bold text-base text-gray-800">{product.lowStockAlert || 10}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">SKU</p>
            <p className="font-bold text-base text-gray-800 font-mono">{product.baseSku || product.id}</p>
          </div>
        </div>
      </div>

        {variants.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <h2 className="text-sm font-bold text-gray-800">متغيرات المنتج ({variants.length})</h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrintAll} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors">
                  <Printer size={12} />
                  طباعة الكل
                </button>
                <button onClick={handlePrintSelected} disabled={selected.length === 0} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-primary text-primary rounded-lg hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <Printer size={12} />
                  طباعة المحدد ({selected.length})
                </button>
              </div>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="p-2 w-8">
                      <input type="checkbox" checked={selected.length === variants.length} onChange={() => setSelected(selected.length === variants.length ? [] : variants.map((v: any) => v.name))} className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary" />
                    </th>
                    <th className="p-2 text-center font-medium text-xs">المتغير</th>
                    <th className="p-2 text-center font-medium text-xs">SKU</th>
                    <th className="p-2 text-center font-medium text-xs">الباركود</th>
                    <th className="p-2 text-center font-medium text-xs">الكمية</th>
                    <th className="p-2 text-center font-medium text-xs">السعر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {variants.map((v: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2 text-center">
                        <input type="checkbox" checked={selected.includes(v.name)} onChange={() => toggleVariant(v.name)} className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary" />
                      </td>
                      <td className="p-2 text-center font-medium text-gray-800 text-sm">{v.name}</td>
                      <td className="p-2 text-center text-xs text-gray-500 font-mono">{v.sku || '—'}</td>
                      <td className="p-2 text-center">
                        {v.barcode ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Barcode value={v.barcode} height={24} width={1} />
                            <span className="font-mono text-[10px] text-gray-500">{v.barcode}</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="p-2 text-center text-sm text-gray-800">{v.quantity || 0}</td>
                      <td className="p-2 text-center text-sm text-gray-800 font-medium">{v.sellingPrice ? `${v.sellingPrice} ج.م` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
};
