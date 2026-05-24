import { supabase } from './supabase';

// ==========================================
// 1. MAPPERS (TS camelCase <-> DB snake_case)
// ==========================================

export const mappers = {
  product: {
    toDB: (p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category || 'عام',
      price: String(p.price || '0 ج.م'),
      cost_price: Number(p.costPrice) || 0,
      discount_price: p.discountPrice || '',
      barcode: p.barcode || '',
      stock: Number(p.stock) || 0,
      low_stock_alert: Number(p.lowStockAlert) || 10,
      status: p.status || 'متوفر',
      has_variants: !!p.hasVariants,
      attributes: p.attributes || [],
      variants: p.variants || [],
      image_url: p.image || p.imageUrl || '',
      sub_photos: p.subPhotos || [],
      supplier_links: p.supplierLinks || []
    }),
    fromDB: (p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      costPrice: p.cost_price,
      discountPrice: p.discount_price,
      barcode: p.barcode,
      stock: p.stock,
      lowStockAlert: p.low_stock_alert,
      status: p.status,
      hasVariants: p.has_variants,
      attributes: p.attributes,
      variants: p.variants,
      image: p.image_url,
      imageUrl: p.image_url,
      subPhotos: p.sub_photos || [],
      supplierLinks: p.supplier_links,
      createdAt: p.created_at
    })
  },

  customer: {
    toDB: (c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      phone2: c.phone2 || '',
      governorate: c.governorate || '',
      district: c.district || '',
      address: c.address || '',
      landmark: c.landmark || '',
      last_order_date: c.lastOrderDate || '',
      orders_count: Number(c.ordersCount) || 0,
      total_spent: Number(c.totalSpent) || 0,
      cancelled_orders: Number(c.cancelledOrders) || 0,
      badge: c.badge || 'new',
      status: c.status || 'جديد',
      notes: c.notes || ''
    }),
    fromDB: (c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      phone2: c.phone2,
      governorate: c.governorate,
      district: c.district,
      address: c.address,
      landmark: c.landmark,
      lastOrderDate: c.last_order_date,
      ordersCount: c.orders_count,
      totalSpent: c.total_spent,
      cancelledOrders: c.cancelled_orders,
      badge: c.badge,
      status: c.status,
      notes: c.notes,
      createdAt: c.created_at
    })
  },

  order: {
    toDB: (o: any) => ({
      id: o.id,
      customer: o.customer,
      phone: o.phone,
      phone2: o.phone2 || '',
      governorate: o.governorate || '',
      district: o.district || '',
      address: o.address || '',
      landmark: o.landmark || '',
      date: o.date,
      total: String(o.total),
      discount_type: o.discountType || '',
      discount_value: Number(o.discountValue) || 0,
      discount_amount: Number(o.discountAmount) || 0,
      after_discount: Number(o.afterDiscount) || Number(o.total) || 0,
      prepaid: Number(o.prepaid) || 0,
      remaining: Number(o.remaining) || 0,
      status: o.status || 'جديد',
      payment: o.payment || 'غير مدفوع',
      payment_method: o.paymentMethod || '',
      notes: o.notes || '',
      items: o.items || [],
      timeline: o.timeline || [],
      related_orders: o.relatedOrders || [],
      cancel_reason: o.cancelReason || null
    }),
    fromDB: (o: any) => ({
      id: o.id,
      customer: o.customer,
      phone: o.phone,
      phone2: o.phone2,
      governorate: o.governorate,
      district: o.district,
      address: o.address,
      landmark: o.landmark,
      date: o.date,
      total: o.total,
      discountType: o.discount_type,
      discountValue: o.discount_value,
      discountAmount: o.discount_amount,
      afterDiscount: o.after_discount,
      prepaid: o.prepaid,
      remaining: o.remaining,
      status: o.status,
      payment: o.payment,
      paymentMethod: o.payment_method,
      notes: o.notes,
      items: o.items,
      timeline: o.timeline,
      relatedOrders: o.related_orders,
      cancelReason: o.cancel_reason || undefined,
      createdAt: o.created_at
    })
  },

  supplier: {
    toDB: (s: any) => ({
      id: s.id,
      name: s.name,
      phone: s.phone || '',
      company: s.company || '',
      supplied: Number(s.supplied) || 0,
      paid: Number(s.paid) || 0,
      dues: Number(s.dues) || 0,
      financial_status: s.financialStatus || 'مستقر',
      financial_amount: Number(s.financialAmount) || 0,
      total_invoices: Number(s.totalInvoices) || 0,
      invoices: s.invoices || []
    }),
    fromDB: (s: any) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      company: s.company,
      supplied: s.supplied,
      paid: s.paid,
      dues: s.dues,
      financialStatus: s.financial_status,
      financialAmount: s.financial_amount,
      totalInvoices: s.total_invoices,
      invoices: s.invoices,
      createdAt: s.created_at
    })
  },

  expense: {
    toDB: (e: any) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      amount: Number(e.amount) || 0,
      date: e.date,
      notes: e.notes || ''
    }),
    fromDB: (e: any) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      amount: e.amount,
      date: e.date,
      notes: e.notes,
      createdAt: e.created_at
    })
  },

  shippingCompany: {
    toDB: (c: any) => ({
      id: c.id,
      name: c.name,
      governorates: c.governorates || [],
      created_at: c.createdAt || new Date().toLocaleDateString('ar-EG-u-nu-latn')
    }),
    fromDB: (c: any) => ({
      id: c.id,
      name: c.name,
      governorates: c.governorates,
      createdAt: c.created_at
    })
  },

  wastageLog: {
    toDB: (w: any) => ({
      id: w.id,
      product_id: w.productId || '',
      product_name: w.productName || '',
      variant_name: w.variantName || null,
      sku: w.sku || '',
      quantity: Number(w.quantity) || 0,
      unit_cost: Number(w.unitCost) || 0,
      total_loss: Number(w.totalLoss) || 0,
      reason: w.reason || '',
      notes: w.notes || '',
      created_at: w.createdAt || new Date().toISOString(),
    }),
    fromDB: (w: any) => ({
      id: w.id,
      productId: w.product_id,
      productName: w.product_name,
      variantName: w.variant_name || undefined,
      sku: w.sku,
      quantity: w.quantity,
      unitCost: w.unit_cost,
      totalLoss: w.total_loss,
      reason: w.reason,
      notes: w.notes || '',
      createdAt: w.created_at
    })
  },

  systemUser: {
    toDB: (u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      password: u.password,
      role: u.role,
      permissions: u.permissions || []
    }),
    fromDB: (u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      password: u.password,
      role: u.role,
      permissions: u.permissions,
      createdAt: u.created_at
    })
  }
};

// ==========================================
// 2. DYNAMIC CRUD API SERVICES
// ==========================================

export const db = {
  products: {
    list: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mappers.product.fromDB);
    },
    upsert: async (product: any) => {
      const { data, error } = await supabase.from('products').upsert(mappers.product.toDB(product)).select();
      if (error) throw error;
      return mappers.product.fromDB(data[0]);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    }
  },

  customers: {
    list: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mappers.customer.fromDB);
    },
    upsert: async (customer: any) => {
      const { data, error } = await supabase.from('customers').upsert(mappers.customer.toDB(customer)).select();
      if (error) throw error;
      return mappers.customer.fromDB(data[0]);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    }
  },

  orders: {
    list: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mappers.order.fromDB);
    },
    upsert: async (order: any) => {
      const { data, error } = await supabase.from('orders').upsert(mappers.order.toDB(order)).select();
      if (error) throw error;
      return mappers.order.fromDB(data[0]);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    }
  },

  suppliers: {
    list: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mappers.supplier.fromDB);
    },
    upsert: async (supplier: any) => {
      const { data, error } = await supabase.from('suppliers').upsert(mappers.supplier.toDB(supplier)).select();
      if (error) throw error;
      return mappers.supplier.fromDB(data[0]);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    }
  },

  expenses: {
    list: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(mappers.expense.fromDB);
    },
    upsert: async (expense: any) => {
      const { data, error } = await supabase.from('expenses').upsert(mappers.expense.toDB(expense)).select();
      if (error) throw error;
      return mappers.expense.fromDB(data[0]);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    }
  },

  shippingCompanies: {
    list: async () => {
      const { data, error } = await supabase.from('shipping_companies').select('*');
      if (error) throw error;
      return (data || []).map(mappers.shippingCompany.fromDB);
    },
    upsert: async (company: any) => {
      const { data, error } = await supabase.from('shipping_companies').upsert(mappers.shippingCompany.toDB(company)).select();
      if (error) throw error;
      return mappers.shippingCompany.fromDB(data[0]);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('shipping_companies').delete().eq('id', id);
      if (error) throw error;
    }
  },

  categories: {
    list: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    upsert: async (category: any) => {
      const payload = {
        id: category.id || category.name.toLowerCase().replace(/\s+/g, '-'),
        name: category.name
      };
      const { data, error } = await supabase.from('categories').upsert(payload).select();
      if (error) throw error;
      return data[0];
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    }
  },

  wastageLogs: {
    list: async () => {
      const { data, error } = await supabase.from('wastage_logs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mappers.wastageLog.fromDB);
    },
    upsert: async (log: any) => {
      const { data, error } = await supabase.from('wastage_logs').upsert(mappers.wastageLog.toDB(log)).select();
      if (error) throw error;
      return mappers.wastageLog.fromDB(data[0]);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('wastage_logs').delete().eq('id', id);
      if (error) throw error;
    }
  },

  systemUsers: {
    list: async () => {
      const { data, error } = await supabase.from('system_users').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mappers.systemUser.fromDB);
    },
    upsert: async (user: any) => {
      const { data, error } = await supabase.from('system_users').upsert(mappers.systemUser.toDB(user)).select();
      if (error) throw error;
      return mappers.systemUser.fromDB(data[0]);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('system_users').delete().eq('id', id);
      if (error) throw error;
    }
  }
};

// ==========================================
// 2.5. SUPABASE STORAGE IMAGE UPLOADER
// ==========================================

export const uploadProductImage = async (file: File): Promise<string> => {
  const bucketName = 'product-images';
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    if (error.message.includes('Bucket not found') || error.message.includes('does not exist')) {
      console.log('Bucket not found, trying to create "product-images" bucket...');
      try {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 5242880, // 5MB limit
        });
        if (createError) throw createError;

        // Try upload again
        const { data: retryData, error: retryError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);
        if (retryError) throw retryError;
        
        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        return publicUrlData.publicUrl;
      } catch (err) {
        console.error('Failed to auto-create storage bucket', err);
        throw error;
      }
    }
    throw error;
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return publicUrlData.publicUrl;
};

// ==========================================
// 3. ONE-CLICK LOCALSTORAGE MIGRATOR TOOL
// ==========================================

export interface MigrationStats {
  products: number;
  orders: number;
  customers: number;
  suppliers: number;
  expenses: number;
  shipping: number;
  categories: number;
  wastage: number;
  users: number;
}

export const migrateLocalStorageToSupabase = async (): Promise<MigrationStats> => {
  const stats: MigrationStats = {
    products: 0, orders: 0, customers: 0, suppliers: 0,
    expenses: 0, shipping: 0, categories: 0, wastage: 0, users: 0
  };

  const getLocal = (key: string) => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  };

  // 1. Categories
  const categories = getLocal('my_categories');
  for (const item of categories) {
    await db.categories.upsert(item);
    stats.categories++;
  }

  // 2. Products
  const products = getLocal('my_products');
  for (const item of products) {
    await db.products.upsert(item);
    stats.products++;
  }

  // 3. Customers
  const customers = getLocal('my_customers');
  for (const item of customers) {
    await db.customers.upsert(item);
    stats.customers++;
  }

  // 4. Orders
  const orders = getLocal('my_orders');
  for (const item of orders) {
    await db.orders.upsert(item);
    stats.orders++;
  }

  // 5. Suppliers
  const suppliers = getLocal('my_suppliers');
  for (const item of suppliers) {
    await db.suppliers.upsert(item);
    stats.suppliers++;
  }

  // 6. Expenses
  const expenses = getLocal('my_expenses');
  for (const item of expenses) {
    await db.expenses.upsert(item);
    stats.expenses++;
  }

  // 7. Shipping Companies
  const shipping = getLocal('my_shipping_companies');
  for (const item of shipping) {
    await db.shippingCompanies.upsert(item);
    stats.shipping++;
  }

  // 8. Wastage Logs
  const wastage = getLocal('my_wastage');
  for (const item of wastage) {
    await db.wastageLogs.upsert(item);
    stats.wastage++;
  }

  // 9. System Users
  const users = getLocal('my_system_users');
  for (const item of users) {
    await db.systemUsers.upsert(item);
    stats.users++;
  }

  return stats;
};
