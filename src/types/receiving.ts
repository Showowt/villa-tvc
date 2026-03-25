// =====================================================
// ISSUE #49: Purchase Order Receiving Types
// =====================================================

/** Item recibido en una entrega */
export interface ReceivedItem {
  ingredient_id: string;
  ingredient_name: string;
  ordered_qty: number;
  received_qty: number;
  unit: string;
  unit_cost: number;
  notes?: string;
}

/** Foto de entrega */
export interface DeliveryPhoto {
  url: string;
  path: string;
  uploaded_at: string;
  uploaded_by?: string;
}

/** Item con discrepancia */
export interface DiscrepancyItem {
  ingredient_id: string;
  ingredient_name: string;
  ordered_qty: number;
  received_qty: number;
  shortage_qty: number;
  shortage_pct: number;
  estimated_loss: number;
}

/** Rendimiento de proveedor */
export interface SupplierPerformance {
  id: string;
  supplier_name: string;
  total_orders: number;
  orders_with_discrepancies: number;
  total_items_ordered: number;
  total_items_short: number;
  avg_discrepancy_pct: number;
  reliability_score: number;
  last_order_date: string | null;
  last_discrepancy_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Alerta de discrepancia de entrega */
export interface DeliveryDiscrepancyAlert {
  id: string;
  purchase_order_id: string | null;
  supplier_name: string | null;
  discrepancy_pct: number | null;
  total_ordered: number | null;
  total_received: number | null;
  shortage_value: number | null;
  items_affected: DiscrepancyItem[];
  alert_status: "pending" | "acknowledged" | "resolved";
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Item de orden de compra para recepcion */
export interface POItemForReceiving {
  ingredient_id: string;
  name: string;
  name_es: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
}

/** Orden de compra pendiente de recepcion */
export interface PendingPurchaseOrder {
  id: string;
  order_number?: string;
  order_date?: string;
  delivery_date: string | null;
  status: string;
  items: POItemForReceiving[];
  total_cost: number;
  transport_cost: number;
  supplier_notes: string | null;
  created_at: string | null;
}

/** Payload para recibir una orden */
export interface ReceivePOPayload {
  purchase_order_id: string;
  received_items: ReceivedItem[];
  received_by: string;
  discrepancy_notes?: string;
  delivery_photos?: DeliveryPhoto[];
}

/** Respuesta de la API de recepcion */
export interface ReceivePOResponse {
  success: boolean;
  has_discrepancies: boolean;
  discrepancy_pct: number;
  message: string;
  alert_created?: boolean;
  items_with_shortage?: DiscrepancyItem[];
}
