import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowRight, Save, Plus, Trash2, Image as ImageIcon, Copy, UploadCloud, Wand2, X, Tag, Folder, FileText, DollarSign, Package, Hash, Barcode, AlertTriangle, Building2, Search, Check, User, Phone as PhoneIcon, MapPin, BadgeCheck, CreditCard, Wallet, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FloatingInput from '../components/FloatingInput';
import FloatingTextarea from '../components/FloatingTextarea';
import FloatingSelect from '../components/FloatingSelect';
import { useApp } from '../context/AppContext';
import { uploadProductImage } from '../utils/supabaseSync';

interface AddProductProps {
  setActivePage: (page: any) => void;
  isEditing?: boolean;
}

interface Attribute {
  id: string;
  name: string;
  values: string[];
}

const SUPPLIER_CATEGORIES = ['إلكترونيات', 'مواد تعبئة', 'متنوع', 'إكسسوارات', 'مواد خام', 'خدمات', 'ملابس', 'مواد غذائية'];

export const AddProduct: React.FC<AddProductProps> = ({ setActivePage, isEditing }) => {
  const { notify } = useApp();
  // Basic Info
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  
  // Pricing & Cost (Globals)
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');

  // Basic Inventory
  const [baseSku, setBaseSku] = useState('');
  const [baseBarcode, setBaseBarcode] = useState('');
  const [baseQuantity, setBaseQuantity] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('');

  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>([
    { id: '1', name: '', values: [] }
  ]);

  // Bulk Apply
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCost, setBulkCost] = useState('');
  const [bulkQuantity, setBulkQuantity] = useState('');
  const [bulkDiscount, setBulkDiscount] = useState('');
  const [variantsData, setVariantsData] = useState<{ [key: string]: any }>({});
  const [variantAlertEnabled, setVariantAlertEnabled] = useState(false);
  const [tempAttrValues, setTempAttrValues] = useState<Record<string, string>>({});
  
  // Supplier fields — multiple suppliers
  const [hasSupplier, setHasSupplier] = useState(false);
  const [supplierLinks, setSupplierLinks] = useState<any[]>([]);
  // Add-supplier inline form
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierResults, setShowSupplierResults] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [selectedSupplierToAdd, setSelectedSupplierToAdd] = useState<any>(null);
  const [addSupCostPrice, setAddSupCostPrice] = useState('');
  const [addSupIsPaid, setAddSupIsPaid] = useState(false);
  const [addSupPaidAmount, setAddSupPaidAmount] = useState('');
  const [showQuickSupplierForm, setShowQuickSupplierForm] = useState(false);
  const [quickSupName, setQuickSupName] = useState('');
  const [quickSupCategory, setQuickSupCategory] = useState('');
  const [quickSupPhone, setQuickSupPhone] = useState('');
  const [quickSupStatus, setQuickSupStatus] = useState<'مدين' | 'دائن' | 'متوازن'>('متوازن');
  const [quickSupAmount, setQuickSupAmount] = useState('');
  const [quickSupSaving, setQuickSupSaving] = useState(false);
  const [quickSupErrors, setQuickSupErrors] = useState<{ name?: string; phone?: string }>({});
  const supSearchRef = useRef<HTMLDivElement>(null);
  
  const categories = useMemo(() => {
    try {
      const raw = localStorage.getItem('my_categories');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const [globalAttributes, setGlobalAttributes] = useState<any[]>([]);
  useEffect(() => {
    try {
      const data = localStorage.getItem('my_attributes');
      if (data) setGlobalAttributes(JSON.parse(data));
    } catch {}
  }, []);

  useEffect(() => {
    if (isEditing) {
      const data = localStorage.getItem('edit_product');
      if (data) {
        try {
          const p = JSON.parse(data);
          setProductName(p.name || '');
          // price is like "500 ج.م", so we parse it
          const price = p.price?.replace(' ج.م', '');
          setSellingPrice(price || '');
          setCostPrice(p.costPrice || '');
          setDiscountPrice(p.discountPrice || '');
          setBaseBarcode(p.barcode || '');
          setCategory(p.category || '');
          setBaseQuantity(p.stock?.toString() || '');
          // Restore baseSku from dedicated field, fallback to id
          setBaseSku(p.baseSku || p.id || '');
          setLowStockAlert(p.lowStockAlert?.toString() || '');
          // Restore publish status
          setIsPublished(p.status !== 'مسودة');
          // Restore variants
          if (p.hasVariants) {
            setHasVariants(true);
            if (p.attributes && p.attributes.length > 0) {
              setAttributes(p.attributes);
            }
            const vData: any = {};
            if (p.variants) {
              p.variants.forEach((v: any) => {
                vData[v.name] = { ...v };
              });
              // Restore variantAlertEnabled if any variant has a custom alert
              const hasCustomAlert = p.variants.some((v: any) => v.lowStockAlert !== undefined && v.lowStockAlert !== null);
              setVariantAlertEnabled(hasCustomAlert);
            }
            setVariantsData(vData);
          } else {
            setHasVariants(false);
          }
          // Restore supplier links with normalization
          if (p.supplierLinks && p.supplierLinks.length > 0) {
            setHasSupplier(true);
            setSupplierLinks(p.supplierLinks.map((l: any) => ({
              ...l,
              id: l.id || l.supplierId,
              name: l.name || l.supplierName
            })));
          }
          // Restore photos
          setMainPhoto(p.image || p.imageUrl || null);
          if (p.subPhotos && Array.isArray(p.subPhotos)) {
            const restoredSubs = [null, null, null];
            for (let i = 0; i < 3; i++) {
              if (p.subPhotos[i]) restoredSubs[i] = p.subPhotos[i];
            }
            setSubPhotos(restoredSubs);
          } else {
            setSubPhotos([null, null, null]);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [isEditing]);

  // Auto Generate functions
  const handleAutoGenerateBaseSku = () => {
    setBaseSku('SKU-' + Math.random().toString(36).substr(2, 6).toUpperCase());
  };

  const handleAutoGenerateBaseBarcode = () => {
    setBaseBarcode(Math.floor(Math.random() * 899999999999 + 100000000000).toString());
  };

  const [isPublished, setIsPublished] = useState(true);

  // Photos
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);
  const [subPhotos, setSubPhotos] = useState<(string | null)[]>([null, null, null]);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingSubs, setUploadingSubs] = useState<boolean[]>([false, false, false]);

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingMain(true);
      try {
        const publicUrl = await uploadProductImage(file);
        setMainPhoto(publicUrl);
        notify('success', 'تم رفع الصورة الرئيسية بنجاح سحابياً 🚀');
      } catch (err: any) {
        console.error(err);
        notify('error', 'فشل رفع الصورة الرئيسية سحابياً: ' + (err.message || err));
      } finally {
        setUploadingMain(false);
      }
    }
  };

  const handleSubPhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingSubs(prev => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
      try {
        const publicUrl = await uploadProductImage(file);
        setSubPhotos(prev => {
          const next = [...prev];
          next[index] = publicUrl;
          return next;
        });
        notify('success', `تم رفع الصورة الفرعية ${index + 1} بنجاح سحابياً 🚀`);
      } catch (err: any) {
        console.error(err);
        notify('error', `فشل رفع الصورة الفرعية ${index + 1} سحابياً: ` + (err.message || err));
      } finally {
        setUploadingSubs(prev => {
          const next = [...prev];
          next[index] = false;
          return next;
        });
      }
    }
  };

  // Save Product
  const [isSaving, setIsSaving] = useState(false);
  const handleSaveProduct = () => {
    if (!productName) {
      notify('error', 'الرجاء إدخال اسم المنتج');
      return;
    }
    setIsSaving(true);
    
    // Save logic
    const savedVariants = hasVariants && combinations.length > 0 
      ? combinations.map(combo => {
          const key = combo.names.join(' - ');
          const data = variantsData[key] || {};
          return {
            name: key,
            ...data,
            // Fall back to base values if variant-specific ones were not explicitly set
            sellingPrice:  data.sellingPrice  !== undefined && data.sellingPrice  !== '' ? data.sellingPrice  : sellingPrice,
            costPrice:     data.costPrice     !== undefined && data.costPrice     !== '' ? data.costPrice     : costPrice,
            discountPrice: data.discountPrice !== undefined && data.discountPrice !== '' ? data.discountPrice : discountPrice,
            quantity:      data.quantity      !== undefined && data.quantity      !== '' ? data.quantity      : baseQuantity,
          };
        })
      : [];

    const totalStock = hasVariants && savedVariants.length > 0
      ? savedVariants.reduce((acc, curr) => acc + parseInt(curr.quantity || '0', 10), 0)
      : parseInt(baseQuantity || '0', 10);

    const displayPrice = hasVariants && savedVariants.length > 0 
      ? savedVariants[0].sellingPrice || sellingPrice
      : sellingPrice;

    const newProduct = {
      id: baseSku || `#PRD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      baseSku: baseSku || '',
      name: productName,
      category: category || 'عام',
      price: displayPrice ? `${displayPrice} ج.م` : '0 ج.م',
      costPrice: costPrice || '',
      discountPrice: discountPrice || '',
      barcode: baseBarcode || '',
      stock: totalStock,
      lowStockAlert: parseInt(lowStockAlert || '10', 10),
      status: isPublished ? (totalStock > 0 ? 'متوفر' : 'نفد') : 'مسودة',
      hasVariants: hasVariants,
      attributes: hasVariants ? attributes : [],
      variants: savedVariants,
      image: mainPhoto || '',
      subPhotos: subPhotos.filter(Boolean) as string[],
      createdAt: new Date().toISOString(),
      supplierLinks: hasSupplier ? supplierLinks.map(l => ({ supplierId: l.id, supplierName: l.name, category: l.category, phone: l.phone, costPrice: l.costPrice, isPaid: l.isPaid, paidAmount: l.paidAmount })) : []
    };

    const existingProducts = JSON.parse(localStorage.getItem('my_products') || '[]');
    
    if (isEditing) {
      const editData = localStorage.getItem('edit_product');
      if (editData) {
        const oldProduct = JSON.parse(editData);
        // Retain original ID
        newProduct.id = oldProduct.id;
        // Retain original baseSku if user didn't change it
        if (!baseSku) newProduct.baseSku = oldProduct.baseSku || oldProduct.id;
        const index = existingProducts.findIndex((p: any) => p.id === oldProduct.id);
        if (index > -1) {
          existingProducts[index] = newProduct;
        } else {
          existingProducts.unshift(newProduct);
        }
      }
    } else {
      existingProducts.unshift(newProduct);
    }
    
    localStorage.setItem('my_products', JSON.stringify(existingProducts));

    // Record this product in each linked supplier's record
    if (hasSupplier && supplierLinks.length > 0) {
      const suppliers: any[] = JSON.parse(localStorage.getItem('my_suppliers') || '[]');
      supplierLinks.forEach(link => {
        const sIdx = suppliers.findIndex((s: any) => s.id === link.id);
        if (sIdx === -1) return;
        if (!suppliers[sIdx].invoices) suppliers[sIdx].invoices = [];
        const cost = Number(link.costPrice) || 0;
        const qty = totalStock;
        const totalCost = cost * qty;
        const paid = link.isPaid ? (Number(link.paidAmount) || totalCost) : (Number(link.paidAmount) || 0);
        const remaining = Math.max(0, totalCost - paid);
        suppliers[sIdx].invoices.push({
          id: `INV-${Date.now()}`,
          date: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
          items: [{ productName: newProduct.name, sku: newProduct.baseSku || newProduct.id, quantity: qty, price: cost, total: totalCost }],
          total: totalCost,
          paid,
          notes: 'من إضافة منتج',
        });
        suppliers[sIdx].supplied = (suppliers[sIdx].supplied || 0) + qty;
        suppliers[sIdx].paid = (suppliers[sIdx].paid || 0) + paid;
        if (remaining > 0) {
          suppliers[sIdx].dues = (suppliers[sIdx].dues || 0) + remaining;
          suppliers[sIdx].financialStatus = 'مدين';
          suppliers[sIdx].financialAmount = (suppliers[sIdx].financialAmount || 0) + remaining;
        }
        suppliers[sIdx].totalInvoices = (suppliers[sIdx].totalInvoices || 0) + 1;
      });
      localStorage.setItem('my_suppliers', JSON.stringify(suppliers));
    }

    // Determine where to go back after save
    const editSource = localStorage.getItem('edit_source') || 'inventory';
    localStorage.removeItem('edit_source');

    setTimeout(() => {
      setIsSaving(false);
      notify('success', isEditing ? 'تم تعديل المنتج بنجاح!' : 'تم حفظ المنتج بنجاح!');
      // If came from view-product, update its data so it reflects latest changes
      if (isEditing && editSource === 'view-product') {
        localStorage.setItem('view_product', JSON.stringify(newProduct));
      }
      setActivePage(isEditing ? editSource : 'inventory');
    }, 500);
  };

  const addAttribute = () => {
    setAttributes([...attributes, { id: Math.random().toString(), name: '', values: [] }]);
  };

  const removeAttribute = (id: string) => {
    setAttributes(attributes.filter(a => a.id !== id));
  };

  const updateAttributeName = (id: string, name: string) => {
    setAttributes(attributes.map(a => a.id === id ? { ...a, name } : a));
  };

  const handleAddValue = (id: string, value: string) => {
    const trimmed = value.replace(',', '').trim();
    if (!trimmed) return;
    setAttributes(attributes.map(a => {
      if (a.id === id) {
        if (!a.values.includes(trimmed)) {
          return { ...a, values: [...a.values, trimmed] };
        }
      }
      return a;
    }));
    setTempAttrValues(prev => ({ ...prev, [id]: '' }));
  };

  const handleRemoveValue = (id: string, valueToRemove: string) => {
    setAttributes(attributes.map(a => {
      if (a.id === id) {
        return { ...a, values: a.values.filter(v => v !== valueToRemove) };
      }
      return a;
    }));
  };

  const handleSelectGlobalAttribute = (id: string, globalAttrId: string) => {
    if (!globalAttrId) return;
    const globalAttr = globalAttributes.find(a => a.id === globalAttrId);
    if (!globalAttr) return;
    
    setAttributes(attributes.map(a => {
      if (a.id === id) {
        // Merge values, avoid duplicates
        const newValues = Array.from(new Set([...a.values, ...globalAttr.values]));
        return { ...a, name: globalAttr.name, values: newValues };
      }
      return a;
    }));
  };

  // Arabic → Latin transliteration map
  const arabicToLatin: Record<string, string> = {
    'أ':'A','إ':'I','آ':'A','ا':'A','ب':'B','ت':'T','ث':'TH','ج':'J','ح':'H',
    'خ':'KH','د':'D','ذ':'TH','ر':'R','ز':'Z','س':'S','ش':'SH','ص':'S','ض':'D',
    'ط':'T','ظ':'Z','ع':'A','غ':'GH','ف':'F','ق':'Q','ك':'K','ل':'L','م':'M',
    'ن':'N','ه':'H','و':'W','ي':'Y','ى':'A','ة':'H','ء':'A','ئ':'Y','ؤ':'W',
    'لا':'LA','لأ':'LA','لإ':'LI','لآ':'LA',
  };

  const transliterate = (text: string): string => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const twoChar = text.substring(i, i + 2);
      if (arabicToLatin[twoChar]) {
        result += arabicToLatin[twoChar];
        i++;
      } else if (arabicToLatin[text[i]]) {
        result += arabicToLatin[text[i]];
      } else {
        result += text[i];
      }
    }
    // Remove non-ASCII characters, replace spaces with hyphen
    return result.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '-').toUpperCase();
  };

  const generateSku = (base: string, comboNames: string[], usedSkus: Set<string> = new Set()): string => {
    if (!base) return '';
    const suffix = comboNames.map(n => transliterate(n).substring(0, 3) || n.substring(0, 3).toUpperCase()).join('-');
    let candidate = `${base}-${suffix}`;
    // Ensure uniqueness by appending counter if collision
    if (usedSkus.has(candidate)) {
      let counter = 2;
      while (usedSkus.has(`${candidate}-${counter}`)) counter++;
      candidate = `${candidate}-${counter}`;
    }
    usedSkus.add(candidate);
    return candidate;
  };

  // Generate a barcode that doesn't exist anywhere in the system
  const generateUniqueBarcode = (usedBarcodes: Set<string>): string => {
    let bc: string;
    do {
      bc = Math.floor(Math.random() * 899999999999 + 100000000000).toString();
    } while (usedBarcodes.has(bc));
    usedBarcodes.add(bc);
    return bc;
  };

  // Generate combinations based on attributes
  const combinations = useMemo(() => {
    if (!hasVariants || attributes.length === 0) return [];
    
    const validAttrs = attributes.filter(a => a.name.trim() !== '' && a.values.length > 0);
    if (validAttrs.length === 0) return [];

    let currentCombos: { names: string[] }[] = validAttrs[0].values.map(val => ({ names: [val] }));

    for (let i = 1; i < validAttrs.length; i++) {
      const nextCombos: { names: string[] }[] = [];
      for (const combo of currentCombos) {
        for (const val of validAttrs[i].values) {
          nextCombos.push({ names: [...combo.names, val] });
        }
      }
      currentCombos = nextCombos;
    }

    return currentCombos;
  }, [attributes, hasVariants]);

  // Auto-populate SKU when baseSKU changes — with uniqueness guarantee
  useEffect(() => {
    if (baseSku && hasVariants) {
      const newData = { ...variantsData };
      const usedSkus = new Set<string>(
        Object.values(newData).map((d: any) => d.sku).filter(Boolean)
      );
      combinations.forEach(combo => {
        const key = combo.names.join(' - ');
        if (!newData[key]) newData[key] = {};
        if (!newData[key].sku) {
          newData[key].sku = generateSku(baseSku, combo.names, usedSkus);
        }
      });
      setVariantsData(newData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseSku, combinations, hasVariants]);

  // Auto-fill base prices/qty into NEW variant rows when combinations are generated
  useEffect(() => {
    if (!hasVariants || combinations.length === 0) return;
    setVariantsData(prev => {
      const newData = { ...prev };
      let changed = false;
      combinations.forEach(combo => {
        const key = combo.names.join(' - ');
        if (!newData[key]) { newData[key] = {}; changed = true; }
        const row = newData[key];
        if (!row.sellingPrice && sellingPrice)  { row.sellingPrice  = sellingPrice;  changed = true; }
        if (!row.costPrice    && costPrice)      { row.costPrice     = costPrice;     changed = true; }
        if (!row.discountPrice && discountPrice) { row.discountPrice = discountPrice; changed = true; }
        if (!row.quantity     && baseQuantity)   { row.quantity      = baseQuantity;  changed = true; }
      });
      return changed ? newData : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinations, hasVariants]);

  // Keep variant rows in sync when the user changes base prices (only for rows that still match the old value)
  const prevBasePricesRef = useRef({ sellingPrice, costPrice, discountPrice, baseQuantity });
  useEffect(() => {
    if (!hasVariants || combinations.length === 0) {
      prevBasePricesRef.current = { sellingPrice, costPrice, discountPrice, baseQuantity };
      return;
    }
    const prev = prevBasePricesRef.current;
    setVariantsData(old => {
      const newData = { ...old };
      let changed = false;
      combinations.forEach(combo => {
        const key = combo.names.join(' - ');
        if (!newData[key]) return;
        const row = { ...newData[key] };
        if (row.sellingPrice  === prev.sellingPrice  || row.sellingPrice  === '')  { row.sellingPrice  = sellingPrice;  changed = true; }
        if (row.costPrice     === prev.costPrice     || row.costPrice     === '')  { row.costPrice     = costPrice;     changed = true; }
        if (row.discountPrice === prev.discountPrice || row.discountPrice === '')  { row.discountPrice = discountPrice; changed = true; }
        if (row.quantity      === prev.baseQuantity  || row.quantity      === '')  { row.quantity      = baseQuantity;  changed = true; }
        newData[key] = row;
      });
      return changed ? newData : old;
    });
    prevBasePricesRef.current = { sellingPrice, costPrice, discountPrice, baseQuantity };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellingPrice, costPrice, discountPrice, baseQuantity]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return [];
    const all: any[] = JSON.parse(localStorage.getItem('my_suppliers') || '[]');
    const q = supplierSearch.trim().toLowerCase();
    return all.filter((s: any) => s.name?.toLowerCase().includes(q) || s.phone?.includes(q));
  }, [supplierSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (supSearchRef.current && !supSearchRef.current.contains(e.target as Node)) {
        setShowSupplierResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-calculate paid amount when costPrice, quantity, or isPaid changes
  useEffect(() => {
    if (addSupIsPaid) {
      const qty = hasVariants 
        ? (Object.values(variantsData) as any[]).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
        : (Number(baseQuantity) || 0);
      const unitC = Number(addSupCostPrice || costPrice || 0);
      setAddSupPaidAmount(String(unitC * qty));
    }
  }, [addSupIsPaid, addSupCostPrice, costPrice, baseQuantity, variantsData, hasVariants]);

  // Sync already linked suppliers with product's general costPrice if they matched the previous one
  const prevCostPriceRef = useRef(costPrice);
  useEffect(() => {
    const prevCost = prevCostPriceRef.current;
    if (prevCost !== costPrice) {
      setSupplierLinks(prev => prev.map(link => {
        if (link.costPrice === prevCost || link.costPrice === '') {
          return { ...link, costPrice: costPrice };
        }
        return link;
      }));
      prevCostPriceRef.current = costPrice;
    }
  }, [costPrice]);

  const addSupplierLink = (sup: any, paidAmountVal?: string, isPaidVal?: boolean) => {
    const link = {
      ...sup,
      costPrice: addSupCostPrice || costPrice || '',
      isPaid: isPaidVal !== undefined ? isPaidVal : false,
      paidAmount: paidAmountVal || '',
    };
    setSupplierLinks(prev => [...prev, link]);
    if (!hasSupplier) setHasSupplier(true);
  };

  const removeSupplierLink = (id: string) => {
    setSupplierLinks(prev => prev.filter(l => l.id !== id));
  };

  const handleSupplierSelect = (sup: any) => {
    setSelectedSupplierToAdd(sup);
    setAddingSupplier(true);
    setSupplierSearch('');
    setShowSupplierResults(false);
    setShowQuickSupplierForm(false);
    setAddSupCostPrice(costPrice);
    setAddSupIsPaid(true);
    setAddSupPaidAmount('');
  };

  const handleConfirmSupplier = () => {
    if (!selectedSupplierToAdd) return;
    addSupplierLink(selectedSupplierToAdd, addSupPaidAmount, addSupIsPaid);
    setSelectedSupplierToAdd(null);
    setAddingSupplier(false);
    setAddSupCostPrice('');
    setAddSupIsPaid(false);
    setAddSupPaidAmount('');
  };

  const handleQuickSaveSupplier = () => {
    const errors: { name?: string; phone?: string } = {};
    if (!quickSupName.trim()) {
      errors.name = 'الرجاء إدخال اسم المورد';
    }
    if (!quickSupPhone.trim()) {
      errors.phone = 'الرجاء إدخال رقم الهاتف';
    } else if (!/^(010|011|012|015)\d{8}$/.test(quickSupPhone.trim())) {
      errors.phone = 'رقم الهاتف غير صحيح';
    }

    if (Object.keys(errors).length > 0) {
      setQuickSupErrors(errors);
      return;
    }
    setQuickSupErrors({});
    setQuickSupSaving(true);
    const list: any[] = JSON.parse(localStorage.getItem('my_suppliers') || '[]');
    const amount = Number(quickSupAmount) || 0;
    const newSup = {
      id: `SUP-${Date.now()}`,
      name: quickSupName.trim(),
      category: quickSupCategory,
      phone: quickSupPhone,
      email: '',
      address: '',
      financialStatus: quickSupStatus,
      financialAmount: amount,
      notes: '',
      supplied: 0, dues: 0, paid: 0, totalInvoices: 0,
      invoices: [],
      status: 'نشط',
      createdAt: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
    };
    list.push(newSup);
    localStorage.setItem('my_suppliers', JSON.stringify(list));
    setQuickSupSaving(false);
    // Reset quick form fields
    setQuickSupName(''); setQuickSupCategory(''); setQuickSupPhone('');
    setQuickSupStatus('متوازن'); setQuickSupAmount('');
    setShowQuickSupplierForm(false);
    // Show the payment confirmation form for the new supplier
    handleSupplierSelect(newSup);
    notify('success', 'تم إضافة المورد — أدخل تفاصيل الدفع لاكتمال الربط');
  };

  const handleVariantDataChange = (comboKey: string, field: string, value: string) => {
    setVariantsData(prev => ({
      ...prev,
      [comboKey]: {
        ...(prev[comboKey] || {}),
        [field]: value
      }
    }));
  };

  const applyBulkToVariants = () => {
    const priceToApply = bulkPrice !== '' ? bulkPrice : sellingPrice;
    const costToApply = bulkCost !== '' ? bulkCost : costPrice;
    const qtyToApply = bulkQuantity !== '' ? bulkQuantity : baseQuantity;
    const discountToApply = bulkDiscount !== '' ? bulkDiscount : discountPrice;
    
    const newData = { ...variantsData };
    combinations.forEach(combo => {
      const key = combo.names.join(' - ');
      if (!newData[key]) newData[key] = {};
      
      if (priceToApply) newData[key].sellingPrice = priceToApply;
      if (costToApply) newData[key].costPrice = costToApply;
      if (qtyToApply) newData[key].quantity = qtyToApply;
      if (discountToApply) newData[key].discountPrice = discountToApply;
      
      // Default auto-sku with uniqueness guarantee
      if (!newData[key].sku && baseSku) {
        const usedSkus = new Set<string>(Object.values(newData).map((d: any) => d.sku).filter(Boolean));
        newData[key].sku = generateSku(baseSku, combo.names, usedSkus);
      }
    });
    setVariantsData(newData);
    setBulkPrice('');
    setBulkCost('');
    setBulkQuantity('');
    setBulkDiscount('');
  };

  const applyAutoBarcodesToVariants = () => {
    // Collect all barcodes already used in the entire system
    const allProducts: any[] = JSON.parse(localStorage.getItem('my_products') || '[]');
    const usedBarcodes = new Set<string>();
    allProducts.forEach(p => {
      if (p.barcode) usedBarcodes.add(p.barcode);
      p.variants?.forEach((v: any) => { if (v.barcode) usedBarcodes.add(v.barcode); });
    });
    // Also add barcodes already assigned in current session
    Object.values(variantsData).forEach((d: any) => { if (d.barcode) usedBarcodes.add(d.barcode); });

    const newData = { ...variantsData };
    combinations.forEach(combo => {
      const key = combo.names.join(' - ');
      if (!newData[key]) newData[key] = {};
      if (!newData[key].barcode) {
        newData[key].barcode = generateUniqueBarcode(usedBarcodes);
      }
    });
    setVariantsData(newData);
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 px-5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const src = localStorage.getItem('edit_source');
              localStorage.removeItem('edit_source');
              setActivePage(src || 'inventory');
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Publish Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors text-sm">
            <span className={`font-medium ${isPublished ? 'text-green-600' : 'text-gray-500'}`}>
              {isPublished ? 'نشط' : 'مسودة'}
            </span>
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              <div className={`block w-9 h-5 rounded-full transition-colors ${isPublished ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isPublished ? 'translate-x-4' : ''}`}></div>
            </div>
          </label>

          <button 
            onClick={handleSaveProduct}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSaving ? 'جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : 'حفظ المنتج')}</span>
          </button>
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b">صور المنتج</h2>
        <div className="flex flex-wrap gap-3">
          <label className="w-24 h-24 border-2 border-dashed border-gray-200 hover:border-primary rounded-xl flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-primary-light transition-colors relative overflow-hidden shrink-0">
            <input type="file" accept="image/*" className="hidden" onChange={handleMainPhotoUpload} disabled={uploadingMain} />
            {mainPhoto ? (
              <>
                <img src={mainPhoto} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMainPhoto(null);
                  }}
                  className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors z-10 shadow"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <UploadCloud size={20} className="text-gray-400" />
                <span className="text-[10px] text-gray-500 mt-1">رئيسية</span>
              </>
            )}
            {uploadingMain && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white z-20">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                <span className="text-[9px]">جاري الرفع...</span>
              </div>
            )}
          </label>
          {[0, 1, 2].map((i) => (
            <label key={i} className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary hover:bg-primary-light cursor-pointer transition-colors relative overflow-hidden shrink-0">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSubPhotoUpload(i, e)} disabled={uploadingSubs[i]} />
              {subPhotos[i] ? (
                <>
                  <img src={subPhotos[i]!} alt={`${i+1}`} className="absolute inset-0 w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSubPhotos(prev => {
                        const next = [...prev];
                        next[i] = null;
                        return next;
                      });
                    }}
                    className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors z-10 shadow"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <Plus size={20} />
              )}
              {uploadingSubs[i] && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white z-20">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                  <span className="text-[9px]">جاري الرفع...</span>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="mb-3 pb-2 border-b">
          <h2 className="text-sm font-bold text-gray-800">المعلومات الأساسية</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2 md:col-span-4">
            <FloatingInput label="اسم المنتج" value={productName} onChange={(e) => setProductName(e.target.value)} required icon={<Tag size={16} />} />
          </div>
          <div className="sm:col-span-2 md:col-span-4">
            <FloatingSelect label="التصنيف" value={category} onChange={e => setCategory(e.target.value)} icon={<Folder size={16} />}>
              <option value="">اختر الفئة</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </FloatingSelect>
          </div>
          <div className="sm:col-span-2 md:col-span-4">
            <FloatingTextarea label="وصف مختصر (اختياري)" value={description} onChange={e => setDescription(e.target.value)} icon={<FileText size={16} />} placeholder="وصف للعملاء بمتجر الواجهة..." rows={2} />
          </div>
          <div>
            <FloatingInput label="سعر البيع" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} required type="number" icon={<DollarSign size={16} />} endAdornment={<span>ج.م</span>} placeholder="0.00" />
          </div>
          <div>
            <FloatingInput label="تكلفة المنتج" value={costPrice} onChange={e => setCostPrice(e.target.value)} type="number" icon={<DollarSign size={16} />} endAdornment={<span>ج.م</span>} placeholder="0.00" />
          </div>
          <div>
            <FloatingInput label="السعر بعد الخصم" value={discountPrice} onChange={e => setDiscountPrice(e.target.value)} type="number" icon={<DollarSign size={16} />} endAdornment={<span>ج.م</span>} placeholder="0.00" />
          </div>
          {!hasVariants && (
            <>
              <div>
                <FloatingInput label="الكمية المتاحة" value={baseQuantity} onChange={e => setBaseQuantity(e.target.value)} required type="number" icon={<Package size={16} />} placeholder="0" />
              </div>
            </>
          )}
          <div className={hasVariants ? "sm:col-span-2 md:col-span-2" : "sm:col-span-2"}>
            <FloatingInput label="كود المنتج (SKU)" value={baseSku} onChange={e => setBaseSku(e.target.value)} required icon={<Hash size={16} />} placeholder={hasVariants ? "مثال: T-SHIRT" : "مثال: T-SHIRT-BLK-01"} />
            <div className="flex justify-between items-center mt-1 px-1">
              {hasVariants ? (
                <p className="text-[11px] text-gray-400">سيتم استخدام هذا الكود لتوليد أكواد فريدة لكل متغير.</p>
              ) : (
                <span />
              )}
              <button 
                type="button"
                onClick={handleAutoGenerateBaseSku} 
                className="text-[11px] text-primary hover:text-primary-hover flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <Wand2 size={11} />
                {hasVariants ? 'توليد كود أساسي' : 'توليد تلقائي'}
              </button>
            </div>
          </div>
          {!hasVariants && (
            <div>
              <FloatingInput label="الباركود (Barcode)" value={baseBarcode} onChange={e => setBaseBarcode(e.target.value)} icon={<Barcode size={16} />} placeholder="امسح الباركود أو اكتبه" />
              <div className="flex justify-end mt-1 px-1">
                <button 
                  type="button"
                  onClick={handleAutoGenerateBaseBarcode} 
                  className="text-[11px] text-primary hover:text-primary-hover flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <Wand2 size={11} />
                  توليد باركود تلقائي
                </button>
              </div>
            </div>
          )}
          <div className={hasVariants ? "sm:col-span-2" : ""}>
            <FloatingInput label="حد التنبيه بنقص المخزون" value={lowStockAlert} onChange={e => setLowStockAlert(e.target.value)} type="number" icon={<AlertTriangle size={16} />} placeholder="مثال: 5" />
            {hasVariants && <p className="text-xs text-gray-400 mt-1">يمكنك تعيين حد مختلف لكل متغير من جدول المتغيرات أدناه.</p>}
          </div>
        </div>
      </div>

      {/* Variants Switch Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-800">متغيرات المنتج</h2>
            <p className="text-xs text-gray-400 mt-1">تفعيل هذا الخيار لإضافة أحجام، ألوان، أو أشكال مختلفة من هذا المنتج مع تخصيص السعر، التكلفة، والكمية لكل متغير.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
            <span className={`text-xs ${hasVariants ? 'font-medium text-primary' : 'text-gray-500'}`}>
              {hasVariants ? 'مفعل (نعم)' : 'معطل (لا)'}
            </span>
            <div className="relative" onClick={(e) => { e.stopPropagation(); setHasVariants(!hasVariants); }}>
              <div className={`block w-9 h-5 rounded-full transition-colors ${hasVariants ? 'bg-primary' : 'bg-gray-300'}`}></div>
              <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${hasVariants ? 'translate-x-4' : ''}`}></div>
            </div>
          </label>
        </div>

        <AnimatePresence initial={false}>
          {hasVariants && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-6">
                
                {/* Attributes Setup */}
                <div>
                  <h3 className="text-xs font-bold text-gray-700 mb-3">إعداد السمات والقيم</h3>
                  <div className="space-y-4">
                    {attributes.map((attr) => (
                      <div key={attr.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 w-full flex flex-col gap-2">
                          <FloatingSelect
                            label="اختيار سمة محفوظة (اختياري)"
                            value=""
                            onChange={(e) => handleSelectGlobalAttribute(attr.id, e.target.value)}
                            icon={<Sliders size={16} />}
                          >
                            <option value="">-- اختر من المحفوظ --</option>
                            {globalAttributes.map(ga => (
                              <option key={ga.id} value={ga.id}>{ga.name}</option>
                            ))}
                          </FloatingSelect>
                          <FloatingInput
                            label="أو اكتب اسم السمة"
                            value={attr.name}
                            onChange={(e) => updateAttributeName(attr.id, e.target.value)}
                            placeholder="مثال: اللون، المقاس"
                            required
                            icon={<Tag size={16} />}
                          />
                        </div>
                        <div className="flex-[2] w-full flex flex-col gap-2">
                          <FloatingInput
                            label="القيم (اضغط Enter للإضافة)"
                            value={tempAttrValues[attr.id] || ''}
                            onChange={(e) => setTempAttrValues(prev => ({ ...prev, [attr.id]: e.target.value }))}
                            placeholder="مثال: أحمر، XL"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                handleAddValue(attr.id, tempAttrValues[attr.id] || '');
                              }
                            }}
                            onBlur={() => {
                              handleAddValue(attr.id, tempAttrValues[attr.id] || '');
                            }}
                          />
                          {attr.values.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 px-1">
                              {attr.values.map(val => (
                                <span key={val} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-800 pl-1.5 pr-2.5 py-1 rounded-lg text-xs shadow-sm font-medium">
                                  <span>{val}</span>
                                  <button type="button" onClick={() => handleRemoveValue(attr.id, val)} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {attributes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAttribute(attr.id)}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0 cursor-pointer border border-transparent hover:border-red-100"
                            title="حذف السمة"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addAttribute} className="flex items-center gap-2 text-sm text-primary font-medium hover:text-primary-hover p-3 w-full justify-center border-2 border-dashed border-primary/30 rounded-xl transition-colors hover:bg-primary-light/50 cursor-pointer">
                      <Plus size={16} />
                      <span>إضافة سمة أخرى</span>
                    </button>
                  </div>
                </div>

                {/* Generated Variants Table */}
                {combinations.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-700 mb-3">جدول المتغيرات المُولدة</h3>

                    {/* Bulk Apply Bar */}
                    <div className="mb-4 space-y-2">
                      {/* Auto-applied badge */}
                      {(sellingPrice || costPrice || discountPrice || baseQuantity) && (
                        <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-lg px-3 py-2">
                          <Check size={13} className="text-primary shrink-0" />
                          <p className="text-xs text-primary font-medium">
                            الأسعار من المعلومات الأساسية مطبقة تلقائياً على جميع المتغيرات
                            {sellingPrice && <span className="opacity-70 mr-1">(سعر البيع: {sellingPrice} ج.م{costPrice ? ` · التكلفة: ${costPrice} ج.م` : ''}{baseQuantity ? ` · الكمية: ${baseQuantity}` : ''})</span>}
                          </p>
                        </div>
                      )}
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-wrap gap-3 items-center">
                        <span className="text-xs font-bold text-gray-500 whitespace-nowrap ml-1">تطبيق جماعي مخصص:</span>
                        <FloatingInput
                          label="السعر"
                          value={bulkPrice}
                          onChange={(e) => setBulkPrice(e.target.value)}
                          type="number"
                          icon={<DollarSign size={16} />}
                          endAdornment={<span>ج.م</span>}
                          placeholder={sellingPrice || "0.00"}
                          className="w-32"
                        />
                        <FloatingInput
                          label="الخصم"
                          value={bulkDiscount}
                          onChange={(e) => setBulkDiscount(e.target.value)}
                          type="number"
                          icon={<DollarSign size={16} />}
                          endAdornment={<span>ج.م</span>}
                          placeholder={discountPrice || "0.00"}
                          className="w-32"
                        />
                        <FloatingInput
                          label="التكلفة"
                          value={bulkCost}
                          onChange={(e) => setBulkCost(e.target.value)}
                          type="number"
                          icon={<DollarSign size={16} />}
                          endAdornment={<span>ج.م</span>}
                          placeholder={costPrice || "0.00"}
                          className="w-32"
                        />
                        <FloatingInput
                          label="الكمية"
                          value={bulkQuantity}
                          onChange={(e) => setBulkQuantity(e.target.value)}
                          type="number"
                          icon={<Package size={16} />}
                          placeholder={baseQuantity || "0"}
                          className="w-28"
                        />
                        <button
                          type="button"
                          onClick={applyBulkToVariants}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors whitespace-nowrap shadow-sm h-14 cursor-pointer"
                        >
                          <Copy size={16} />
                          <span>تطبيق</span>
                        </button>
                      </div>
                    </div>

                    <div className="mb-3 flex items-center gap-4 flex-wrap">
                      <button type="button" onClick={applyAutoBarcodesToVariants} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                        <Wand2 size={14} />
                        توليد باركود للمتغيرات
                      </button>
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-500">
                        <span>حد تنبيه لكل متغير</span>
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={variantAlertEnabled} onChange={(e) => setVariantAlertEnabled(e.target.checked)} />
                          <div className={`block w-8 h-4 rounded-full transition-colors ${variantAlertEnabled ? 'bg-primary' : 'bg-gray-300'}`}></div>
                          <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${variantAlertEnabled ? 'translate-x-4' : ''}`}></div>
                        </div>
                      </label>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm text-right border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                            <th className="p-2 text-center font-medium whitespace-nowrap text-xs">المتغير</th>
                            <th className="p-2 text-center font-medium text-xs">SKU</th>
                            <th className="p-2 text-center font-medium text-xs w-20">السعر</th>
                            <th className="p-2 text-center font-medium text-xs w-20">الخصم</th>
                            <th className="p-2 text-center font-medium text-xs w-20">التكلفة</th>
                            <th className="p-2 text-center font-medium text-xs w-16">الكمية</th>
                            <th className="p-2 text-center font-medium text-xs min-w-[100px]">الباركود</th>
                            {variantAlertEnabled && <th className="p-2 font-medium text-xs w-16 text-center">تنبيه</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {combinations.map((combo, idx) => {
                            const key = combo.names.join(' - ');
                            const data = variantsData[key] || {};
                            // Resolved display values — fall back to base info when no variant-specific value set
                            const displaySellingPrice  = data.sellingPrice  !== undefined && data.sellingPrice  !== '' ? data.sellingPrice  : sellingPrice;
                            const displayDiscountPrice = data.discountPrice !== undefined && data.discountPrice !== '' ? data.discountPrice : discountPrice;
                            const displayCostPrice     = data.costPrice     !== undefined && data.costPrice     !== '' ? data.costPrice     : costPrice;
                            const displayQuantity      = data.quantity      !== undefined && data.quantity      !== '' ? data.quantity      : baseQuantity;
                            return (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-2 text-center font-medium text-gray-800 whitespace-nowrap text-sm font-sans">{key}</td>
                                <td className="p-2 text-center">
                                  <input type="text" value={data.sku || ''} onChange={(e) => handleVariantDataChange(key, 'sku', e.target.value)} className="w-full p-1.5 border border-gray-200 rounded outline-none focus:border-primary text-xs text-center font-sans" placeholder="SKU" />
                                </td>
                                <td className="p-2 text-center">
                                  <input type="number" value={displaySellingPrice} onChange={(e) => handleVariantDataChange(key, 'sellingPrice', e.target.value)} className="w-full p-1.5 border border-gray-200 rounded outline-none focus:border-primary text-sm text-center font-sans" placeholder="0" />
                                </td>
                                <td className="p-2 text-center">
                                  <input type="number" value={displayDiscountPrice} onChange={(e) => handleVariantDataChange(key, 'discountPrice', e.target.value)} className="w-full p-1.5 border border-gray-200 rounded outline-none focus:border-primary text-sm text-center font-sans" placeholder="0" />
                                </td>
                                <td className="p-2 text-center">
                                  <input type="number" value={displayCostPrice} onChange={(e) => handleVariantDataChange(key, 'costPrice', e.target.value)} className="w-full p-1.5 border border-gray-200 rounded outline-none focus:border-primary text-sm text-center font-sans" placeholder="0" />
                                </td>
                                <td className="p-2 text-center">
                                  <input type="number" value={displayQuantity} onChange={(e) => handleVariantDataChange(key, 'quantity', e.target.value)} className="w-full p-1.5 border border-gray-200 rounded outline-none focus:border-primary text-sm text-center font-sans" placeholder="0" />
                                </td>
                                <td className="p-2 text-center">
                                  <input type="text" value={data.barcode || ''} onChange={(e) => handleVariantDataChange(key, 'barcode', e.target.value)} className="w-full p-1.5 border border-gray-200 rounded outline-none focus:border-primary text-xs text-center font-sans" placeholder="باركود" />
                                </td>
                                {variantAlertEnabled && (
                                  <td className="p-2 text-center">
                                    <input type="number" value={data.lowStockAlert || ''} onChange={(e) => handleVariantDataChange(key, 'lowStockAlert', e.target.value)} className="w-full p-1.5 border border-amber-300 bg-amber-50 rounded outline-none focus:border-amber-500 text-center text-xs font-sans" placeholder={lowStockAlert || '5'} />
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Supplier Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Building2 className="text-primary shrink-0" size={18} />
            <div>
              <h2 className="text-sm font-bold text-gray-800">ربط المنتج بموردين</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">تسجيل فواتير الشراء وتكاليف التوريد والمبالغ المدفوعة وتحديث حسابات الموردين تلقائياً.</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
            <span className={`text-xs ${hasSupplier ? 'font-medium text-primary' : 'text-gray-500'}`}>
              {hasSupplier ? 'مفعل (نعم)' : 'معطل (لا)'}
            </span>
            <div className="relative" onClick={(e) => { e.stopPropagation(); setHasSupplier(!hasSupplier); if (!hasSupplier) { setSupplierLinks([]); setAddingSupplier(false); } }}>
              <div className={`block w-9 h-5 rounded-full transition-colors ${hasSupplier ? 'bg-primary' : 'bg-gray-300'}`}></div>
              <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${hasSupplier ? 'translate-x-4' : ''}`}></div>
            </div>
          </label>
        </div>

        <AnimatePresence initial={false}>
          {hasSupplier && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className=""
            >
              <div className="space-y-4 pt-2">
                
                {/* 1. Linked Suppliers List */}
                {supplierLinks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-700">الموردين المرتبطين حالياً:</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {supplierLinks.map((link, idx) => {
                        const totalUnitCost = Number(link.costPrice || costPrice || 0);
                        const totalQty = hasVariants 
                          ? (Object.values(variantsData) as any[]).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
                          : (Number(baseQuantity) || 0);
                        const invoiceTotal = totalUnitCost * totalQty;
                        const paidAmt = link.isPaid ? invoiceTotal : (Number(link.paidAmount) || 0);
                        const remainingAmt = Math.max(0, invoiceTotal - paidAmt);
                        
                        return (
                          <div key={link.id || idx} className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                            {/* Decorative top primary indicator line */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-white rounded-lg border border-primary/20 text-primary shadow-sm shrink-0">
                                  <Building2 size={16} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-gray-800">{link.name}</h4>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                    {link.category && <span className="bg-white px-2 py-0.5 rounded border border-gray-100">{link.category}</span>}
                                    {link.phone && <span dir="ltr" className="font-sans">{link.phone}</span>}
                                  </div>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => removeSupplierLink(link.id)} 
                                className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 self-end sm:self-center px-2.5 py-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>حذف الارتباط</span>
                              </button>
                            </div>

                            <div className="bg-white/90 rounded-xl p-3 border border-primary/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-gray-400">تكلفة التوريد للقطعة</span>
                                <span className="font-bold text-gray-800 text-sm"><span className="font-sans">{totalUnitCost.toLocaleString('en-US')}</span> ج.م</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-gray-400">الكمية الموردة</span>
                                <span className="font-bold text-gray-800 text-sm"><span className="font-sans">{totalQty.toLocaleString('en-US')}</span> قطعة</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-gray-400">إجمالي الفاتورة</span>
                                <span className="font-extrabold text-primary text-sm"><span className="font-sans">{invoiceTotal.toLocaleString('en-US')}</span> ج.م</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-gray-400">حالة وتفاصيل السداد</span>
                                <span className="flex items-center gap-1.5 mt-0.5">
                                  {remainingAmt === 0 ? (
                                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full text-[10px]">
                                      <Check size={10} />
                                      مدفوع بالكامل
                                    </span>
                                  ) : (
                                    <span className="inline-flex flex-col text-[10px]">
                                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium self-start mb-0.5">
                                        آجل (متبقي دين)
                                      </span>
                                      <span className="text-red-500 font-bold">متبقي: <span className="font-sans">{remainingAmt.toLocaleString('en-US')}</span> ج.م</span>
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Adding / Linking Workflow */}
                {!addingSupplier ? (
                  <button 
                    type="button"
                    onClick={() => { 
                      setAddingSupplier(true); 
                      setSelectedSupplierToAdd(null); 
                      setSupplierSearch(''); 
                      setShowQuickSupplierForm(false); 
                      setAddSupCostPrice(''); 
                      setAddSupIsPaid(false); 
                      setAddSupPaidAmount(''); 
                    }}
                    className="flex items-center gap-2 text-sm text-primary font-bold hover:text-primary-hover transition-colors p-3 w-full justify-center border-2 border-dashed border-primary/30 rounded-xl hover:bg-primary-light/30 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>إضافة ارتباط بمورد جديد</span>
                  </button>
                ) : !selectedSupplierToAdd ? (
                  /* search flow */
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-xs font-bold text-gray-700">البحث واختيار المورد</h3>
                      <button 
                        type="button" 
                        onClick={() => setAddingSupplier(false)} 
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>

                    {!showQuickSupplierForm ? (
                      <div className="space-y-4">
                        <div className="relative" ref={supSearchRef}>
                          <FloatingInput
                            label="ابحث عن مورد بالاسم أو الهاتف"
                            value={supplierSearch}
                            onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierResults(true); }}
                            onFocus={() => setShowSupplierResults(true)}
                            icon={<Search size={16} />}
                            placeholder="اكتب للبحث..."
                          />

                          {showSupplierResults && supplierSearch.trim() && (
                            <div className="absolute z-20 top-full mt-1.5 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-50">
                              {filteredSuppliers.length > 0 ? (
                                filteredSuppliers
                                  .filter((s: any) => !supplierLinks.find(l => l.id === s.id))
                                  .map((s: any) => (
                                    <button 
                                      key={s.id} 
                                      type="button"
                                      onClick={() => handleSupplierSelect(s)}
                                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-light/30 text-right transition-colors"
                                    >
                                      <div className="p-1.5 bg-gray-50 border border-gray-100 rounded-lg text-gray-400">
                                        <Building2 size={15} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{s.name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                          {s.category || 'عام'} • {s.phone || 'بدون هاتف'}
                                        </p>
                                      </div>
                                      <Check size={16} className="text-primary opacity-0 hover:opacity-100" />
                                    </button>
                                  ))
                              ) : (
                                <div className="p-4 text-center">
                                  <p className="text-xs text-gray-400 mb-2">لا يوجد موردين يطابقون بحثك.</p>
                                  <button 
                                    type="button"
                                    onClick={() => setShowQuickSupplierForm(true)}
                                    className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:text-primary-hover px-3 py-1.5 bg-primary-light/50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    إضافة كمورد جديد الآن
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">إذا لم يكن المورد مسجلاً بالنظام، يمكنك إضافته سريعاً</span>
                          <button 
                            type="button" 
                            onClick={() => setShowQuickSupplierForm(true)}
                            className="text-primary font-bold hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>إضافة مورد جديد</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Quick Add Supplier form inside grey box */
                      <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2 mb-2">
                          <Building2 size={16} className="text-primary shrink-0" />
                          <h3 className="text-xs font-bold text-gray-800">إضافة مورد جديد للمنظومة</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-3">
                            <FloatingInput
                              label="اسم المورد"
                              value={quickSupName}
                              onChange={(e) => {
                                setQuickSupName(e.target.value);
                                if (quickSupErrors.name) {
                                  setQuickSupErrors(prev => ({ ...prev, name: undefined }));
                                }
                              }}
                              icon={<User size={16} />}
                              required
                              error={quickSupErrors.name}
                              placeholder="مثال: شركة النصر التجارية"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <FloatingInput
                              label="رقم الهاتف"
                              value={quickSupPhone}
                              onChange={(e) => {
                                setQuickSupPhone(e.target.value);
                                if (quickSupErrors.phone) {
                                  setQuickSupErrors(prev => ({ ...prev, phone: undefined }));
                                }
                              }}
                              icon={<PhoneIcon size={16} />}
                              error={quickSupErrors.phone}
                              placeholder="مثال: 010xxxxxxxx"
                            />
                          </div>
                          <div>
                            <FloatingSelect
                              label="تصنيف المنتجات"
                              value={quickSupCategory}
                              onChange={(e) => setQuickSupCategory(e.target.value)}
                              icon={<Folder size={16} />}
                            >
                              <option value="">اختر التصنيف</option>
                              {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </FloatingSelect>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setShowQuickSupplierForm(false)}
                            className="px-3.5 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={handleQuickSaveSupplier}
                            disabled={quickSupSaving}
                            className="px-5 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {quickSupSaving ? 'جاري الحفظ...' : 'حفظ واختيار المورد'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Supplier detailed confirmation form (selectedSupplierToAdd is active) */
                  <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-white rounded-lg border border-primary/20 text-primary shadow-sm shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <span className="text-[10px] text-primary font-bold block">مورد محدد للربط</span>
                          <h4 className="text-sm font-bold text-gray-800">{selectedSupplierToAdd.name}</h4>
                        </div>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => { setSelectedSupplierToAdd(null); setSupplierSearch(''); }}
                        className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 px-2.5 py-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <X size={13} />
                        <span>تغيير المورد</span>
                      </button>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-primary/10 space-y-4">
                      {/* Financial info summary header */}
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap justify-between items-center gap-4">
                        <div className="text-xs">
                          <span className="text-gray-400 block mb-0.5">الكمية الموردة من المنتج</span>
                          <span className="font-extrabold text-gray-700 text-sm">
                            <span className="font-sans">
                              {(() => {
                                const qty = hasVariants 
                                  ? (Object.values(variantsData) as any[]).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
                                  : (Number(baseQuantity) || 0);
                                return qty;
                              })()}
                            </span>{' '}
                            قطعة
                          </span>
                        </div>
                        
                        <div className="text-left">
                          <span className="text-gray-400 block text-xs mb-0.5">إجمالي تكلفة الفاتورة</span>
                          <span className="font-extrabold text-primary text-base">
                            <span className="font-sans">
                              {(() => {
                                const unitCost = Number(addSupCostPrice || costPrice || 0);
                                const qty = hasVariants 
                                  ? (Object.values(variantsData) as any[]).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
                                  : (Number(baseQuantity) || 0);
                                return (unitCost * qty).toLocaleString('en-US');
                              })()}
                            </span>{' '}
                            ج.م
                          </span>
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FloatingInput
                            label="تكلفة توريد القطعة الواحدة"
                            value={addSupCostPrice}
                            onChange={(e) => {
                              setAddSupCostPrice(e.target.value);
                              // Auto calculate/update paid amount if full payment was selected
                              if (addSupIsPaid) {
                                const qty = hasVariants 
                                  ? (Object.values(variantsData) as any[]).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
                                  : (Number(baseQuantity) || 0);
                                const unitC = Number(e.target.value || costPrice || 0);
                                setAddSupPaidAmount(String(unitC * qty));
                              }
                            }}
                            type="number"
                            icon={<DollarSign size={16} />}
                            endAdornment={<span>ج.م</span>}
                            placeholder={costPrice || "0.00"}
                          />
                          <p className="text-[10px] text-gray-400 mt-1 px-1">سعر شراء المنتج من هذا المورد لتسجيل فاتورة التوريد بدقة.</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 block px-1">حالة سداد الفاتورة للمورد</label>
                          {/* Modern Segmented Tab Switcher */}
                          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                            <button
                              type="button"
                              onClick={() => {
                                setAddSupIsPaid(false);
                                setAddSupPaidAmount('');
                              }}
                              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                                !addSupIsPaid
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                              }`}
                            >
                              آجل (غير مدفوع / جزئي)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddSupIsPaid(true);
                                const qty = hasVariants 
                                  ? (Object.values(variantsData) as any[]).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
                                  : (Number(baseQuantity) || 0);
                                const unitC = Number(addSupCostPrice || costPrice || 0);
                                setAddSupPaidAmount(String(unitC * qty));
                              }}
                              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                                addSupIsPaid
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                              }`}
                            >
                              مدفوع بالكامل
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Unpaid / Partial Debt section */}
                      <AnimatePresence initial={false}>
                        {!addSupIsPaid && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-4 items-center">
                              <div className="flex-1 min-w-[200px]">
                                <FloatingInput
                                  label="المبلغ المدفوع حالياً"
                                  value={addSupPaidAmount}
                                  onChange={(e) => setAddSupPaidAmount(e.target.value)}
                                  type="number"
                                  icon={<Wallet size={16} />}
                                  endAdornment={<span>ج.م</span>}
                                  placeholder="0"
                                />
                              </div>
                              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex-1 min-w-[200px] text-xs">
                                <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-0.5">
                                  <AlertTriangle size={13} />
                                  <span>دين مسجل حساب المورد:</span>
                                </div>
                                <p className="font-extrabold text-sm text-red-600 mt-0.5">
                                  <span className="font-sans">
                                    {(() => {
                                      const unitCost = Number(addSupCostPrice || costPrice || 0);
                                      const qty = hasVariants 
                                        ? (Object.values(variantsData) as any[]).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
                                        : (Number(baseQuantity) || 0);
                                      const totalBill = unitCost * qty;
                                      const paid = Number(addSupPaidAmount) || 0;
                                      return Math.max(0, totalBill - paid).toLocaleString('en-US');
                                    })()}
                                  </span>{' '}
                                  ج.م
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedSupplierToAdd(null); setSupplierSearch(''); }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        رجوع للبحث
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSupplier}
                        className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <Check size={14} />
                        <span>تأكيد الربط وتسجيل الفاتورة</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

