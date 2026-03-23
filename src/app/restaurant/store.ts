"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  Timestamp,
  Firestore
} from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';

export type OrderStatus = 'pendente' | 'preparacao' | 'pronto' | 'entregue';
export type OrderType = 'mesa' | 'takeaway';

export interface OrderItem {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  note?: string;
  byWeight?: boolean;
}

export interface Order {
  id: string;
  type: OrderType;
  tableId?: string;
  takeawayName?: string;
  takeawayTime?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod?: 'dinheiro' | 'multibanco';
  createdAt: number;
  updatedAt: number;
}

export interface Reservation {
  id: string;
  customerName: string;
  date: string;
  time: string;
  guests: number;
  tableId: string;
  status: 'confirmada' | 'chegou' | 'cancelada';
  createdAt: number;
}

const ORDERS_COLLECTION = 'restaurant_orders';
const RESERVATIONS_COLLECTION = 'restaurant_reservations';

export const useOrders = () => {
  const firestore = useFirestore();

  // Memoized queries for real-time sync
  const ordersQuery = useMemoFirebase(
    () => query(collection(firestore, ORDERS_COLLECTION), orderBy('createdAt', 'desc')),
    [firestore]
  );

  const reservationsQuery = useMemoFirebase(
    () => query(collection(firestore, RESERVATIONS_COLLECTION), orderBy('createdAt', 'desc')),
    [firestore]
  );

  const { data: ordersData, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);
  const { data: reservationsData, isLoading: isResLoading } = useCollection<Reservation>(reservationsQuery);

  const orders = ordersData || [];
  const reservations = reservationsData || [];

  const saveOrder = async (order: Order) => {
    try {
      const docRef = doc(firestore, ORDERS_COLLECTION, order.id);
      await setDoc(docRef, {
        ...order,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving order:", error);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const docRef = doc(firestore, ORDERS_COLLECTION, id);
      await updateDoc(docRef, {
        status,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const saveReservation = async (res: Reservation) => {
    try {
      const docRef = doc(firestore, RESERVATIONS_COLLECTION, res.id);
      await setDoc(docRef, res, { merge: true });
    } catch (error) {
      console.error("Error saving reservation:", error);
    }
  };

  const updateReservationStatus = async (id: string, status: Reservation['status']) => {
    try {
      const docRef = doc(firestore, RESERVATIONS_COLLECTION, id);
      await updateDoc(docRef, { status });
    } catch (error) {
      console.error("Error updating reservation status:", error);
    }
  };

  return { 
    orders, 
    updateOrderStatus, 
    saveOrder, 
    reservations, 
    saveReservation, 
    updateReservationStatus,
    isLoading: isOrdersLoading || isResLoading
  };
};

// Legacy support for direct calls (might need refactoring if used heavily outside components)
export const getOrders = async (firestore: Firestore): Promise<Order[]> => {
  // This is a placeholder since we want real-time sync, 
  // but if needed for one-off fetches:
  return []; 
};
