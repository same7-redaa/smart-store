export type OrderStatus =
  | 'جديد'
  | 'مؤكد'
  | 'قيد التجهيز'
  | 'تم الشحن'
  | 'تم التوصيل'
  | 'ملغي'
  | 'مستبدل جزئي'
  | 'مستبدل كلي'
  | 'مرتجع جزئي'
  | 'مرتجع كلي'

export type ItemStatus = 'عادي' | 'مستبدل' | 'مرتجع'

export type ReturnType = 'كاش' | 'محفظة' | 'مسترد للبنك'

export type ReplacementReason = 'عيب مصنعية' | 'مقاس خطأ' | 'العميل غير راضي' | 'خطأ في الطلب' | 'أخرى'

export type ReturnReason = 'تلف' | 'خطأ في الطلب' | 'العميل غير راضي' | 'مقاس خطأ' | 'أخرى'

export interface TimelineEvent {
  timestamp: string
  action: string
  detail?: string
  user?: string
}

export interface OrderItem {
  productId: string
  variantName: string
  productName: string
  sku: string
  quantity: number
  price: number
  total: number
  status: ItemStatus
  replacementOrderId?: string
  returnDate?: string
  returnType?: ReturnType
  reason?: string
}

export interface Order {
  id: string
  customer: string
  phone: string
  phone2: string
  governorate: string
  district: string
  address: string
  landmark: string
  date: string
  total: string
  discountType: string
  discountValue: number
  discountAmount: number
  afterDiscount: number
  prepaid: number
  remaining: number
  status: OrderStatus
  payment: string
  paymentMethod: string
  notes: string
  items: OrderItem[]
  timeline: TimelineEvent[]
  relatedOrders: string[]
  cancelReason?: string
}

export type ViewTab = 'details' | 'replacement' | 'return'
