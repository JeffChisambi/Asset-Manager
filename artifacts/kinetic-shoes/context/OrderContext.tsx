import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  selectedSize: number;
  imageUrl?: string;
  imageSource?: any;
  shopName: string;
}

export interface ActiveOrder {
  orderId: string;
  items: OrderItem[];
  paymentId: string;
  paymentName: string;
  deliveryType: "Pickup" | "Delivery";
  address: string;
  driverName: string;
  driverInitials: string;
  driverRating: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  placedAt: number; // unix ms — stage is derived from elapsed time
}

export interface HistoricalOrder extends ActiveOrder {
  completedAt: number;
  finalStage: number; // 9 = delivered, anything else = cancelled
}

// Stage advances every STAGE_DURATION_MS milliseconds
const STAGE_DURATION_MS = 30_000; // 30 seconds per stage (demo speed)
const TOTAL_STAGES      = 10;

export function calcStage(placedAt: number): number {
  const elapsed = Date.now() - placedAt;
  return Math.min(TOTAL_STAGES - 1, Math.floor(elapsed / STAGE_DURATION_MS));
}

export function calcEta(placedAt: number): number {
  const minutesElapsed = (Date.now() - placedAt) / 60_000;
  return Math.max(0, 18 - Math.floor(minutesElapsed));
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface OrderContextType {
  activeOrder:   ActiveOrder | null;
  orderHistory:  HistoricalOrder[];
  placeOrder:    (order: Omit<ActiveOrder, "placedAt">) => void;
  completeOrder: () => void;
  dismissOrder:  () => void;
}

const OrderContext = createContext<OrderContextType | null>(null);
const STORAGE_KEY = "doorstep_orders_v2";

interface PersistedData {
  active:  ActiveOrder | null;
  history: HistoricalOrder[];
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [activeOrder,  setActiveOrder]  = useState<ActiveOrder | null>(null);
  const [orderHistory, setOrderHistory] = useState<HistoricalOrder[]>([]);
  const initRef = useRef(false);

  // Load from storage once on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const data: PersistedData = JSON.parse(raw);
        // If the persisted active order is already fully delivered, move it to history
        if (data.active) {
          const stage = calcStage(data.active.placedAt);
          if (stage >= TOTAL_STAGES - 1) {
            const completed: HistoricalOrder = {
              ...data.active,
              completedAt: data.active.placedAt + (TOTAL_STAGES - 1) * STAGE_DURATION_MS,
              finalStage: TOTAL_STAGES - 1,
            };
            setActiveOrder(null);
            setOrderHistory([completed, ...(data.history ?? [])]);
          } else {
            setActiveOrder(data.active);
            setOrderHistory(data.history ?? []);
          }
        } else {
          setOrderHistory(data.history ?? []);
        }
      })
      .catch(() => {});
  }, []);

  // Persist whenever state changes
  const persist = useCallback(
    (active: ActiveOrder | null, history: HistoricalOrder[]) => {
      const data: PersistedData = { active, history };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    },
    []
  );

  const placeOrder = useCallback(
    (order: Omit<ActiveOrder, "placedAt">) => {
      const full: ActiveOrder = { ...order, placedAt: Date.now() };
      setActiveOrder(full);
      persist(full, orderHistory);
    },
    [orderHistory, persist]
  );

  const completeOrder = useCallback(() => {
    if (!activeOrder) return;
    const completed: HistoricalOrder = {
      ...activeOrder,
      completedAt: Date.now(),
      finalStage: TOTAL_STAGES - 1,
    };
    const newHistory = [completed, ...orderHistory];
    setActiveOrder(null);
    setOrderHistory(newHistory);
    persist(null, newHistory);
  }, [activeOrder, orderHistory, persist]);

  const dismissOrder = useCallback(() => {
    if (!activeOrder) return;
    const stage = calcStage(activeOrder.placedAt);
    const cancelled: HistoricalOrder = {
      ...activeOrder,
      completedAt: Date.now(),
      finalStage: stage,
    };
    const newHistory = [cancelled, ...orderHistory];
    setActiveOrder(null);
    setOrderHistory(newHistory);
    persist(null, newHistory);
  }, [activeOrder, orderHistory, persist]);

  return (
    <OrderContext.Provider
      value={{ activeOrder, orderHistory, placeOrder, completeOrder, dismissOrder }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be inside OrderProvider");
  return ctx;
}
