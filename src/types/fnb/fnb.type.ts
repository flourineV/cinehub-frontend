export interface FnbItemRequest {
  name: string;
  description?: string;
  unitPrice: number;
  imageUrl: string;
}

export interface FnbItemResponse {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  unitPrice: number;
  imageUrl: string;
}

export interface FnbCalculationItem {
  id: string;
  quantity: number;
}

export interface FnbCalculationResponse {
  totalPrice: number;
  breakdown: { [key: string]: number };
}

// FnB Order interfaces
export interface FnbOrderRequest {
  userId: string;
  theaterId: string;
  theaterName: string;
  theaterAddress: string;
  paymentMethod: string;
  items: FnbOrderItemRequest[];
  language?: string;
}

export interface FnbOrderItemRequest {
  fnbItemId: string;
  quantity: number;
}

export interface FnbOrderResponse {
  id: string;
  userId: string;
  theaterId: string;
  theaterName?: string;
  theaterAddress?: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  expiresAt: string; // PENDING orders expire after 5 minutes
  items: FnbOrderItemResponse[];
}

export interface FnbOrderItemResponse {
  fnbItemId: string;
  itemName?: string;
  itemNameEn?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
