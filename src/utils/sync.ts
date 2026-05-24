import { db } from './supabaseSync';

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  details: string[];
}

export const SYNC_KEYS = [
  'my_products',
  'my_orders',
  'my_customers',
  'my_suppliers',
  'my_expenses',
  'my_shipping_companies',
  'my_categories',
  'my_wastage',
  'my_system_users'
];

export const keyToDbMap: Record<string, { service: any; idKey: string }> = {
  my_products: { service: db.products, idKey: 'id' },
  my_orders: { service: db.orders, idKey: 'id' },
  my_customers: { service: db.customers, idKey: 'id' },
  my_suppliers: { service: db.suppliers, idKey: 'id' },
  my_expenses: { service: db.expenses, idKey: 'id' },
  my_shipping_companies: { service: db.shippingCompanies, idKey: 'id' },
  my_categories: { service: db.categories, idKey: 'id' },
  my_wastage: { service: db.wastageLogs, idKey: 'id' },
  my_system_users: { service: db.systemUsers, idKey: 'id' }
};

let isSyncingFromCloud = false;
let activeSyncCount = 0;

export const triggerSyncStatusChange = (status: 'synced' | 'syncing' | 'error') => {
  const event = new CustomEvent('supabase-sync-status', { detail: status });
  window.dispatchEvent(event);
};

export const triggerDataRefreshed = () => {
  const event = new CustomEvent('local-data-refreshed');
  window.dispatchEvent(event);
};

async function syncChangesToCloud(key: string, oldList: any[], newList: any[]) {
  const mapping = keyToDbMap[key];
  if (!mapping) return;
  
  const { service, idKey } = mapping;
  
  const oldMap = new Map(oldList.map(item => [item[idKey], item]));
  const newMap = new Map(newList.map(item => [item[idKey], item]));
  
  const upserts: any[] = [];
  const deletes: string[] = [];
  
  for (const newItem of newList) {
    const oldItem = oldMap.get(newItem[idKey]);
    if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
      upserts.push(newItem);
    }
  }
  
  for (const oldItem of oldList) {
    if (!newMap.has(oldItem[idKey])) {
      deletes.push(oldItem[idKey]);
    }
  }
  
  if (upserts.length === 0 && deletes.length === 0) return;
  
  activeSyncCount++;
  triggerSyncStatusChange('syncing');
  
  try {
    for (const id of deletes) {
      console.log(`[Auto-Sync] Deleting ${id} from ${key}...`);
      await service.delete(id);
    }
    
    for (const item of upserts) {
      console.log(`[Auto-Sync] Upserting ${item[idKey]} to ${key}...`);
      await service.upsert(item);
    }
    
    activeSyncCount = Math.max(0, activeSyncCount - 1);
    if (activeSyncCount === 0) {
      triggerSyncStatusChange('synced');
    }
  } catch (error) {
    console.error(`[Auto-Sync] Error syncing ${key}:`, error);
    activeSyncCount = Math.max(0, activeSyncCount - 1);
    triggerSyncStatusChange('error');
  }
}

export const setupGlobalStorageSyncInterceptor = () => {
  if (typeof window === 'undefined') return;
  if ((window as any).__storageInterceptorInstalled) return;
  (window as any).__storageInterceptorInstalled = true;

  console.log('[Auto-Sync] Installing global localStorage sync interceptor...');

  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    if (SYNC_KEYS.includes(key) && !isSyncingFromCloud) {
      let oldData: any[] = [];
      try {
        const rawOld = localStorage.getItem(key);
        oldData = rawOld ? JSON.parse(rawOld) : [];
      } catch (e) {
        oldData = [];
      }
      
      originalSetItem.call(this, key, value);
      
      let newData: any[] = [];
      try {
        newData = value ? JSON.parse(value) : [];
      } catch (e) {
        newData = [];
      }
      
      syncChangesToCloud(key, oldData, newData).catch(err => {
        console.error(`Error in background sync for ${key}:`, err);
      });
    } else {
      originalSetItem.call(this, key, value);
    }
  };

  const originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function(key) {
    if (SYNC_KEYS.includes(key) && !isSyncingFromCloud) {
      let oldData: any[] = [];
      try {
        const rawOld = localStorage.getItem(key);
        oldData = rawOld ? JSON.parse(rawOld) : [];
      } catch (e) {
        oldData = [];
      }
      
      originalRemoveItem.call(this, key);
      
      syncChangesToCloud(key, oldData, []).catch(err => {
        console.error(`Error in background delete sync for ${key}:`, err);
      });
    } else {
      originalRemoveItem.call(this, key);
    }
  };
};

export const pullAndMergeFromCloud = async () => {
  if (isSyncingFromCloud) return;
  isSyncingFromCloud = true;
  triggerSyncStatusChange('syncing');
  console.log('[Auto-Sync] Starting startup cloud data pull and merge...');
  
  try {
    for (const key of SYNC_KEYS) {
      const mapping = keyToDbMap[key];
      if (!mapping) continue;
      
      const { service, idKey } = mapping;
      console.log(`[Auto-Sync] Fetching latest records for ${key}...`);
      
      const remoteData = await service.list();
      
      let localData: any[] = [];
      try {
        localData = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {
        localData = [];
      }
      
      const remoteMap = new Map(remoteData.map((item: any) => [item[idKey], item]));
      const mergedList = [...remoteData];
      
      for (const localItem of localData) {
        if (!remoteMap.has(localItem[idKey])) {
          mergedList.push(localItem);
        }
      }
      
      localStorage.setItem(key, JSON.stringify(mergedList));
    }
    
    console.log('[Auto-Sync] Startup sync completed successfully!');
    isSyncingFromCloud = false;
    triggerSyncStatusChange('synced');
    triggerDataRefreshed();
  } catch (error) {
    console.error('[Auto-Sync] Error during startup sync:', error);
    isSyncingFromCloud = false;
    triggerSyncStatusChange('error');
    triggerDataRefreshed();
  }
};

export const getFromStorage = (key: string): any[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

export const saveToStorage = (key: string, data: any[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const calcBadge = (customer: any): string => {
  if (['vip', 'suspicious', 'banned'].includes(customer.badge)) return customer.badge;
  if (customer.cancelledOrders > 0) return 'troubled';
  if (customer.ordersCount >= 10) return 'excellent';
  if (customer.ordersCount >= 3) return 'trusted';
  return 'new';
};

export const syncOrderToSystem = (order: any): SyncResult => {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [], details: [] };

  // 1. Sync customer
  const customers = getFromStorage('my_customers');
  const existingCustomer = customers.find(
    (c: any) => c.phone === order.phone || c.name === order.customer
  );

  if (existingCustomer) {
    existingCustomer.ordersCount = (existingCustomer.ordersCount || 0) + 1;
    existingCustomer.totalSpent = (existingCustomer.totalSpent || 0) + (order.afterDiscount || order.total || 0);
    existingCustomer.lastOrderDate = order.date;
    if (order.governorate) existingCustomer.governorate = order.governorate;
    if (order.district) existingCustomer.district = order.district;
    if (order.address) existingCustomer.address = order.address;
    if (order.phone2) existingCustomer.phone2 = order.phone2;
    if (order.landmark) existingCustomer.landmark = order.landmark;
    existingCustomer.badge = calcBadge(existingCustomer);
    result.updated++;
    result.details.push(`تم تحديث العميل: ${existingCustomer.name}`);
  } else {
    const newCustomer = {
      id: `CUS-${String(customers.length + 1).padStart(3, '0')}`,
      name: order.customer,
      phone: order.phone || '',
      phone2: order.phone2 || '',
      governorate: order.governorate || '',
      district: order.district || '',
      address: order.address || '',
      landmark: order.landmark || '',
      lastOrderDate: order.date,
      ordersCount: 1,
      totalSpent: order.afterDiscount || order.total || 0,
      cancelledOrders: 0,
      badge: 'new',
      status: 'جديد',
      createdAt: order.date,
      notes: '',
    };
    customers.unshift(newCustomer);
    result.created++;
    result.details.push(`تم إنشاء عميل جديد: ${newCustomer.name}`);
  }
  saveToStorage('my_customers', customers);

  // 2. Reduce product stock
  if (order.items && order.items.length > 0) {
    const products = getFromStorage('my_products');
    order.items.forEach((item: any) => {
      const product = products.find(
        (p: any) => p.id === item.productId || p.baseSku === item.sku || p.id === item.sku
      );
      if (product) {
        const prevStock = product.stock || 0;
        product.stock = Math.max(0, prevStock - (item.quantity || 0));
        product.status = product.stock > 0 ? 'متوفر' : 'نفد';

        // If has variants, reduce variant stock too
        if (product.hasVariants && product.variants && item.variantName) {
          const variant = product.variants.find((v: any) => v.name === item.variantName);
          if (variant) {
            variant.quantity = Math.max(0, (variant.quantity || 0) - (item.quantity || 0));
          }
        }
        result.updated++;
        result.details.push(`تم نقص مخزون ${product.name}: ${prevStock} → ${product.stock}`);
      } else {
        result.errors.push(`المنتج غير موجود: ${item.productName || item.sku}`);
      }
    });
    saveToStorage('my_products', products);
  }

  // 3. Match shipping company and governorate
  if (order.shippingCompany && order.governorate) {
    const companies = getFromStorage('my_shipping_companies');
    const company = companies.find((c: any) => c.name === order.shippingCompany);
    if (company) {
      const gov = company.governorates?.find((g: any) => g.name === order.governorate);
      if (gov) {
        order.shippingCost = gov.customerPrice;
        result.details.push(`سعر الشحن (${company.name} - ${order.governorate}): ${gov.customerPrice} ج.م`);
      } else {
        result.errors.push(`المحافظة ${order.governorate} غير موجودة في شركة الشحن ${company.name}`);
      }
    } else {
      result.errors.push(`شركة الشحن ${order.shippingCompany} غير موجودة`);
    }
  }

  return result;
};

/**
 * Adjust product stock when order status changes.
 * @param order  The order whose items need stock adjustment
 * @param operation 'add' = return stock (cancel), 'remove' = deduct stock (restore from cancel)
 */
export const adjustStockForOrderStatus = (order: any, operation: 'add' | 'remove'): void => {
  if (!order.items || !order.items.length) return;
  const products = getFromStorage('my_products');
  order.items.forEach((item: any) => {
    const product = products.find(
      (p: any) => p.id === item.productId || p.baseSku === item.sku || p.id === item.sku
    );
    if (product) {
      const qty = item.quantity || 0;
      if (operation === 'add') {
        product.stock = (product.stock || 0) + qty;
      } else {
        product.stock = Math.max(0, (product.stock || 0) - qty);
      }
      if (product.hasVariants && product.variants && item.variantName) {
        const variant = product.variants.find((v: any) => v.name === item.variantName);
        if (variant) {
          if (operation === 'add') {
            variant.quantity = (variant.quantity || 0) + qty;
          } else {
            variant.quantity = Math.max(0, (variant.quantity || 0) - qty);
          }
        }
      }
      product.status = product.stock > 0 ? 'متوفر' : 'نفد';
    }
  });
  saveToStorage('my_products', products);
};

export const adjustStockForTransition = (order: any, prevStatus: string, newStatus: string): void => {
  if (prevStatus === newStatus) return;
  if (!order.items || !order.items.length) return;

  const isGroupA = (status: string) => ['قيد المعالجة', 'جاري التوصيل', 'مكتمل', 'استبدال'].includes(status);
  const isGroupB = (status: string) => ['ملغي', 'ملغي بعد الشحن', 'مرتجع كلي'].includes(status);
  const isGroupC = (status: string) => status === 'مرتجع جزئي';

  const products = getFromStorage('my_products');

  const updateProductStock = (item: any, quantityChange: number) => {
    const product = products.find(
      (p: any) => p.id === item.productId || p.baseSku === item.sku || p.id === item.sku
    );
    if (product) {
      if (product.hasVariants && product.variants && item.variantName) {
        const variant = product.variants.find((v: any) => v.name === item.variantName);
        if (variant) {
          variant.quantity = Math.max(0, (variant.quantity || 0) + quantityChange);
        }
        product.stock = product.variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0);
      } else {
        product.stock = Math.max(0, (product.stock || 0) + quantityChange);
      }
      product.status = product.stock > 0 ? 'متوفر' : 'نفد';
    }
  };

  if (isGroupA(prevStatus) && isGroupB(newStatus)) {
    order.items.forEach((item: any) => {
      updateProductStock(item, item.quantity);
    });
  } 
  else if (isGroupB(prevStatus) && isGroupA(newStatus)) {
    order.items.forEach((item: any) => {
      updateProductStock(item, -item.quantity);
    });
  } 
  else if (isGroupC(prevStatus) && isGroupB(newStatus)) {
    order.items.forEach((item: any) => {
      const returnedItem = order.financialImpact?.returnedItems?.find(
        (ri: any) => ri.productId === item.productId && ri.variantName === item.variantName
      );
      const returnedQty = returnedItem ? returnedItem.quantity : 0;
      const remainingQty = item.quantity - returnedQty;
      if (remainingQty > 0) {
        updateProductStock(item, remainingQty);
      }
    });
  } 
  else if (isGroupC(prevStatus) && isGroupA(newStatus)) {
    order.items.forEach((item: any) => {
      const returnedItem = order.financialImpact?.returnedItems?.find(
        (ri: any) => ri.productId === item.productId && ri.variantName === item.variantName
      );
      if (returnedItem && returnedItem.isHealthy) {
        updateProductStock(item, -returnedItem.quantity);
      }
    });
  }

  saveToStorage('my_products', products);
};

export const recalculateCustomerStats = (phone: string, name: string): void => {
  if (!phone && !name) return;

  const orders = getFromStorage('my_orders');
  
  const customerOrders = orders.filter((o: any) => {
    const phoneMatch = phone && o.phone === phone;
    const nameMatch = name && o.customer === name;
    return phoneMatch || nameMatch;
  });

  const customers = getFromStorage('my_customers');
  const customerIdx = customers.findIndex((c: any) => {
    const phoneMatch = phone && c.phone === phone;
    const nameMatch = name && c.name === name;
    return phoneMatch || nameMatch;
  });

  const latestOrder = customerOrders.sort((a: any, b: any) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  })[0];

  const activeOrders = customerOrders.filter((o: any) => {
    const status = o.status;
    return ['قيد المعالجة', 'جاري التوصيل', 'مكتمل', 'استبدال', 'مرتجع جزئي'].includes(status);
  });

  const cancelledOrders = customerOrders.filter((o: any) => {
    const status = o.status;
    return ['ملغي', 'ملغي بعد الشحن', 'مرتجع كلي'].includes(status);
  });

  const ordersCount = activeOrders.length;
  const cancelledOrdersCount = cancelledOrders.length;

  const totalSpent = activeOrders.reduce((sum: number, o: any) => {
    let val = Number(o.afterDiscount || 0) + Number(o.shippingCost || 0);
    if (o.status === 'مرتجع جزئي' && o.financialImpact?.customerRefund) {
      val -= Number(o.financialImpact.customerRefund) || 0;
    }
    return sum + Math.max(0, val);
  }, 0);

  const lastOrderDate = latestOrder ? latestOrder.date : '';

  if (customerIdx > -1) {
    const c = customers[customerIdx];
    c.ordersCount = ordersCount;
    c.cancelledOrders = cancelledOrdersCount;
    c.totalSpent = totalSpent;
    c.lastOrderDate = lastOrderDate;
    if (latestOrder) {
      if (latestOrder.governorate) c.governorate = latestOrder.governorate;
      if (latestOrder.district) c.district = latestOrder.district;
      if (latestOrder.address) c.address = latestOrder.address;
      if (latestOrder.phone2) c.phone2 = latestOrder.phone2;
      if (latestOrder.landmark) c.landmark = latestOrder.landmark;
    }
    c.badge = calcBadge(c);
  } else if (latestOrder) {
    const newCustomer = {
      id: `CUS-${String(customers.length + 1).padStart(3, '0')}`,
      name: name || latestOrder.customer,
      phone: phone || latestOrder.phone || '',
      phone2: latestOrder.phone2 || '',
      governorate: latestOrder.governorate || '',
      district: latestOrder.district || '',
      address: latestOrder.address || '',
      landmark: latestOrder.landmark || '',
      lastOrderDate: lastOrderDate,
      ordersCount: ordersCount,
      totalSpent: totalSpent,
      cancelledOrders: cancelledOrdersCount,
      badge: 'new',
      status: 'جديد',
      createdAt: latestOrder.date,
      notes: '',
    };
    newCustomer.badge = calcBadge(newCustomer);
    customers.unshift(newCustomer);
  }
  
  saveToStorage('my_customers', customers);
};

export const adjustCustomerForOrderStatus = (order: any, prevStatus: string, newStatus: string): void => {
  recalculateCustomerStats(order.phone, order.customer);
};

export const syncProductToSystem = (product: any): SyncResult => {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [], details: [] };

  // 1. Save/update product
  const products = getFromStorage('my_products');
  const existing = products.find(
    (p: any) => p.id === product.id || p.baseSku === product.baseSku
  );

  if (existing) {
    Object.assign(existing, product);
    result.updated++;
    result.details.push(`تم تحديث المنتج: ${product.name}`);
  } else {
    products.unshift(product);
    result.created++;
    result.details.push(`تم إنشاء منتج جديد: ${product.name}`);
  }
  saveToStorage('my_products', products);

  // 2. Sync supplier links
  if (product.supplierLinks && product.supplierLinks.length > 0) {
    const suppliers = getFromStorage('my_suppliers');
    product.supplierLinks.forEach((link: any) => {
      const sup = suppliers.find((s: any) => s.id === link.supplierId || s.name === link.supplierName);
      if (sup) {
        const cost = Number(link.costPrice) || 0;
        const qty = product.stock || 0;
        const totalCost = cost * qty;
        const paid = link.isPaid ? (Number(link.paidAmount) || totalCost) : (Number(link.paidAmount) || 0);
        const remaining = Math.max(0, totalCost - paid);

        if (!sup.invoices) sup.invoices = [];
        sup.invoices.push({
          id: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: new Date().toLocaleDateString('ar-EG-u-nu-latn'),
          items: [{
            productName: product.name,
            sku: product.baseSku || product.id,
            quantity: qty,
            price: cost,
            total: totalCost,
          }],
          total: totalCost,
          paid,
          notes: 'من استيراد منتج',
        });
        sup.supplied = (sup.supplied || 0) + qty;
        sup.paid = (sup.paid || 0) + paid;
        if (remaining > 0) {
          sup.dues = (sup.dues || 0) + remaining;
          sup.financialStatus = 'مدين';
          sup.financialAmount = (sup.financialAmount || 0) + remaining;
        }
        sup.totalInvoices = (sup.totalInvoices || 0) + 1;
        result.details.push(`تم تحديث المورد ${sup.name}: فاتورة جديدة (${totalCost} ج.م)`);
      } else {
        result.errors.push(`المورد ${link.supplierName} غير موجود`);
      }
    });
    saveToStorage('my_suppliers', suppliers);
  }

  // 3. Sync category
  if (product.category && product.category !== 'عام') {
    const categories = getFromStorage('my_categories');
    const catId = product.category.toLowerCase().replace(/\s+/g, '-');
    if (!categories.find((c: any) => c.id === catId)) {
      categories.push({ id: catId, name: product.category, createdAt: new Date().toISOString() });
      saveToStorage('my_categories', categories);
      result.details.push(`تم إضافة تصنيف جديد: ${product.category}`);
    }
  }

  return result;
};

export const syncSupplierToSystem = (supplier: any): SyncResult => {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [], details: [] };

  const suppliers = getFromStorage('my_suppliers');
  const existing = suppliers.find((s: any) => s.id === supplier.id);

  if (existing) {
    Object.assign(existing, supplier);
    result.updated++;
    result.details.push(`تم تحديث المورد: ${supplier.name}`);
  } else {
    suppliers.push(supplier);
    result.created++;
    result.details.push(`تم إنشاء مورد جديد: ${supplier.name}`);
  }

  // Process invoices and update products
  if (supplier.invoices && supplier.invoices.length > 0) {
    const products = getFromStorage('my_products');
    supplier.invoices.forEach((inv: any) => {
      if (inv.items) {
        inv.items.forEach((item: any) => {
          const product = products.find(
            (p: any) => p.baseSku === item.sku || p.id === item.sku
          );
          if (product) {
            product.stock = (product.stock || 0) + (item.quantity || 0);
            if (item.price > 0) product.costPrice = item.price;
            product.status = product.stock > 0 ? 'متوفر' : 'نفد';
            result.details.push(`تم تحديث مخزون ${product.name}: +${item.quantity}`);
          } else {
            const newProduct = {
              id: `PRD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              baseSku: item.sku || `SKU-${Date.now()}`,
              name: item.productName,
              category: 'عام',
              price: `${item.price || 0} ج.م`,
              costPrice: item.price || '',
              discountPrice: '',
              barcode: '',
              stock: item.quantity || 0,
              lowStockAlert: 10,
              status: 'متوفر',
              hasVariants: false,
              attributes: [],
              variants: [],
              createdAt: new Date().toISOString(),
              supplierLinks: [],
            };
            products.unshift(newProduct);
            result.created++;
            result.details.push(`تم إنشاء منتج جديد: ${item.productName}`);
          }
        });
      }
    });
    saveToStorage('my_products', products);
  }

  saveToStorage('my_suppliers', suppliers);
  return result;
};

export const syncShippingToSystem = (company: any): SyncResult => {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [], details: [] };

  const companies = getFromStorage('my_shipping_companies');
  const existing = companies.find((c: any) => c.id === company.id || c.name === company.name);

  if (existing) {
    existing.name = company.name;
    existing.governorates = company.governorates || [];
    result.updated++;
    result.details.push(`تم تحديث شركة الشحن: ${company.name}`);
  } else {
    companies.push({
      id: company.id || `CMP-${String(companies.length + 1).padStart(3, '0')}`,
      name: company.name,
      governorates: company.governorates || [],
      createdAt: company.createdAt || new Date().toLocaleDateString('ar-EG-u-nu-latn'),
    });
    result.created++;
    result.details.push(`تم إنشاء شركة شحن جديدة: ${company.name}`);
  }

  saveToStorage('my_shipping_companies', companies);
  return result;
};

export const syncCustomerToSystem = (customer: any): SyncResult => {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [], details: [] };

  const customers = getFromStorage('my_customers');
  const existing = customers.find(
    (c: any) => c.id === customer.id || c.phone === customer.phone
  );

  if (existing) {
    Object.assign(existing, customer);
    result.updated++;
    result.details.push(`تم تحديث العميل: ${customer.name}`);
  } else {
    customers.push(customer);
    result.created++;
    result.details.push(`تم إنشاء عميل جديد: ${customer.name}`);
  }

  saveToStorage('my_customers', customers);
  return result;
};

export const syncCustomerFromOrders = (customer: any): SyncResult => {
  const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: [], details: [] };

  recalculateCustomerStats(customer.phone, customer.name);

  const customers = getFromStorage('my_customers');
  const updatedCustomer = customers.find((c: any) => c.phone === customer.phone || c.name === customer.name);
  if (updatedCustomer) {
    Object.assign(customer, updatedCustomer);
    result.updated++;
  }

  result.details.push(`تمت مزامنة العميل ${customer.name} من الطلبات`);
  return result;
};
