import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_CATEGORIES } from '../utils/Utils';
import { useAuth } from './AuthContext';

const DatabaseContext = createContext();

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initializeFirestore();
    } else {
      // Reset data when user logs out
      setCategories([]);
      setItems([]);
      setIsReady(false);
    }
  }, [user]);

  const initializeFirestore = async () => {
    try {
      await initializeDefaultData();
      setupRealtimeListeners();
      setIsReady(true);
    } catch (error) {
      console.error('Firestore initialization error:', error);
    }
  };

  const initializeDefaultData = async () => {
    try {
      // Check if categories exist for this user
      const categoriesRef = collection(db, 'categories');
      const userCategoriesQuery = query(categoriesRef, where('userId', '==', user.uid));
      const categoriesSnapshot = await getDocs(userCategoriesQuery);

      if (categoriesSnapshot.empty) {
        // Create default categories for new user
        const batch = writeBatch(db);
        
        DEFAULT_CATEGORIES.forEach(category => {
          const categoryRef = doc(collection(db, 'categories'));
          batch.set(categoryRef, {
            ...category,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });

        await batch.commit();

        // Create sample items
        await createSampleItems();
      }
    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  };

  const createSampleItems = async () => {
    const sampleItems = [
      {
        name: 'Coca-Cola 330ml',
        sku: 'CC330ML',
        barcode: '1234567890123',
        price: 1.50,
        stock: 45,
        minStock: 10,
        taxRate: 8.5,
        categoryName: 'Beverages',
        isRevenue: true,
      },
      {
        name: 'Pepsi 330ml',
        sku: 'PP330ML',
        barcode: '1234567890124',
        price: 1.50,
        stock: 38,
        minStock: 10,
        categoryName: 'Beverages',
        isRevenue: true,
      },
      {
        name: "Lay's Chips 50g",
        sku: 'LAY50G',
        barcode: '1234567890125',
        price: 2.25,
        stock: 25,
        minStock: 15,
        categoryName: 'Snacks',
        isRevenue: true,
      },
      {
        name: 'Tissue Box',
        sku: 'TIS200',
        barcode: '1234567890126',
        price: 3.99,
        stock: 8,
        minStock: 5,
        categoryName: 'Household',
        isRevenue: false,
      },
    ];

    const batch = writeBatch(db);
    
    sampleItems.forEach(item => {
      const itemRef = doc(collection(db, 'items'));
      batch.set(itemRef, {
        ...item,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
  };

  const setupRealtimeListeners = () => {
    // Listen to categories changes (no orderBy to avoid index requirement)
    const categoriesRef = collection(db, 'categories');
    const categoriesQuery = query(
      categoriesRef, 
      where('userId', '==', user.uid)
    );
    
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by name in JavaScript
      categoriesData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCategories(categoriesData);
    });

    // Listen to items changes (no orderBy to avoid index requirement)
    const itemsRef = collection(db, 'items');
    const itemsQuery = query(
      itemsRef, 
      where('userId', '==', user.uid)
    );
    
    const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by name in JavaScript
      itemsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setItems(itemsData);
    });

    // Return cleanup function
    return () => {
      unsubscribeCategories();
      unsubscribeItems();
    };
  };

  // Categories operations
  const getCategories = async () => {
    return categories;
  };

  const createCategory = async (categoryData) => {
    try {
      const docRef = await addDoc(collection(db, 'categories'), {
        ...categoryData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...categoryData };
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  // Items operations
  const getItems = async () => {
    return items;
  };

  const getItemById = async (id) => {
    try {
      const docRef = doc(db, 'items', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching item:', error);
      return null;
    }
  };

  const getItemBySku = async (sku) => {
    try {
      const itemsRef = collection(db, 'items');
      const q = query(
        itemsRef, 
        where('userId', '==', user.uid),
        where('sku', '==', sku),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching item by SKU:', error);
      return null;
    }
  };

  const getItemByBarcode = async (barcode) => {
    try {
      const itemsRef = collection(db, 'items');
      const q = query(
        itemsRef, 
        where('userId', '==', user.uid),
        where('barcode', '==', barcode),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching item by barcode:', error);
      return null;
    }
  };

  const searchItems = async (searchQuery) => {
    try {
      // Firebase doesn't support full-text search, so we'll filter on the client side
      const searchTerm = searchQuery.toLowerCase();
      return items.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.sku.toLowerCase().includes(searchTerm) ||
        (item.barcode && item.barcode.includes(searchTerm))
      );
    } catch (error) {
      console.error('Error searching items:', error);
      return [];
    }
  };

  const getLowStockItems = async () => {
    try {
      return items.filter(item => item.stock <= item.minStock);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      return [];
    }
  };

  const addItem = async (itemData) => {
    try {
      const docRef = await addDoc(collection(db, 'items'), {
        ...itemData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  };

  const updateItem = async (id, itemData) => {
    try {
      const itemRef = doc(db, 'items', id);
      await updateDoc(itemRef, {
        ...itemData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      return false;
    }
  };

  const updateItemStock = async (id, quantitySold) => {
    try {
      const itemRef = doc(db, 'items', id);
      await updateDoc(itemRef, {
        stock: increment(-quantitySold),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating item stock:', error);
      return false;
    }
  };

  const deleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'items', id));
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      return false;
    }
  };

  // Transaction operations
  const createTransaction = async (transactionData) => {
    try {
      const batch = writeBatch(db);

      // Create transaction document
      const transactionRef = doc(collection(db, 'transactions'));
      batch.set(transactionRef, {
        userId: user.uid,
        subtotal: parseFloat(transactionData.subtotal),
        tax: parseFloat(transactionData.tax),
        total: parseFloat(transactionData.total),
        receiptNumber: transactionData.receiptNumber,
        createdAt: serverTimestamp(),
        status: 'completed'
      });

      // Create transaction items
      for (const item of transactionData.items) {
        const transactionItemRef = doc(collection(db, 'transactionItems'));
        batch.set(transactionItemRef, {
          transactionId: transactionRef.id,
          userId: user.uid,
          itemId: item.itemId,
          itemName: item.itemName || '',
          quantity: item.quantity,
          price: parseFloat(item.price),
          tax: parseFloat(item.tax || 0),
          createdAt: serverTimestamp()
        });

        // Update item stock
        const itemRef = doc(db, 'items', item.itemId);
        batch.update(itemRef, {
          stock: increment(-item.quantity),
          updatedAt: serverTimestamp()
        });
      }

      // Create payments
      for (const payment of transactionData.payments) {
        const paymentRef = doc(collection(db, 'payments'));
        batch.set(paymentRef, {
          transactionId: transactionRef.id,
          userId: user.uid,
          method: payment.method,
          amount: parseFloat(payment.amount),
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      return transactionRef.id;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  };

  const getTransactions = async (limitCount = 50) => {
    try {
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', user.uid),
        limit(limitCount * 2) // Get more to allow for sorting
      );
      
      const querySnapshot = await getDocs(q);
      let transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by date descending in JavaScript
      transactions.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate() - a.createdAt.toDate();
      });
      
      // Limit to requested count
      transactions = transactions.slice(0, limitCount);
      
      // Process each transaction to get items and payments
      const processedTransactions = [];
      for (const transaction of transactions) {
        const transactionData = { ...transaction };
        
        // Get transaction items
        const itemsRef = collection(db, 'transactionItems');
        const itemsQuery = query(itemsRef, where('transactionId', '==', transaction.id));
        const itemsSnapshot = await getDocs(itemsQuery);
        transactionData.items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
        
        // Get payments
        const paymentsRef = collection(db, 'payments');
        const paymentsQuery = query(paymentsRef, where('transactionId', '==', transaction.id));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        transactionData.payments = paymentsSnapshot.docs.map(paymentDoc => paymentDoc.data());
        
        processedTransactions.push(transactionData);
      }
      
      return processedTransactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  };

  const getTodaysTransactions = async () => {
    try {
      // Get all transactions for the user (no complex query to avoid index requirement)
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', user.uid),
        limit(200) // Limit for performance
      );
      
      const querySnapshot = await getDocs(q);
      let allTransactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter for today's transactions in JavaScript
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();
      
      allTransactions = allTransactions.filter(transaction => {
        if (!transaction.createdAt) return false;
        const transactionDate = transaction.createdAt.toDate();
        return transactionDate.getTime() >= todayTimestamp;
      });
      
      // Sort by date descending
      allTransactions.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate() - a.createdAt.toDate();
      });
      
      // Process each transaction to get items and payments
      const transactions = [];
      for (const transaction of allTransactions) {
        const transactionData = { ...transaction };
        
        // Get transaction items
        const itemsRef = collection(db, 'transactionItems');
        const itemsQuery = query(itemsRef, where('transactionId', '==', transaction.id));
        const itemsSnapshot = await getDocs(itemsQuery);
        transactionData.items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
        
        // Get payments
        const paymentsRef = collection(db, 'payments');
        const paymentsQuery = query(paymentsRef, where('transactionId', '==', transaction.id));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        transactionData.payments = paymentsSnapshot.docs.map(paymentDoc => paymentDoc.data());
        
        transactions.push(transactionData);
      }
      
      return transactions;
    } catch (error) {
      console.error('Error fetching today\'s transactions:', error);
      return [];
    }
  };

  // Reports operations
  const getSalesReport = async (period = 'today') => {
    try {
      let startDate = new Date();
      
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '3months':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '6months':
          startDate.setDate(startDate.getDate() - 180);
          break;
        case 'year':
          startDate.setDate(startDate.getDate() - 365);
          break;
        default:
          startDate.setHours(0, 0, 0, 0);
      }
      
      // Get all transactions for the user (no complex query to avoid index requirement)
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', user.uid),
        limit(500) // Limit for performance
      );
      
      const querySnapshot = await getDocs(q);
      let transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter by date range in JavaScript
      const startTimestamp = startDate.getTime();
      transactions = transactions.filter(transaction => {
        if (!transaction.createdAt) return false;
        const transactionDate = transaction.createdAt.toDate();
        return transactionDate.getTime() >= startTimestamp;
      });
      
      // Fetch items and payments for each transaction
      const completeTransactions = [];
      for (const transaction of transactions) {
        const transactionData = { ...transaction };
        
        // Get transaction items
        const itemsRef = collection(db, 'transactionItems');
        const itemsQuery = query(itemsRef, where('transactionId', '==', transaction.id));
        const itemsSnapshot = await getDocs(itemsQuery);
        transactionData.items = itemsSnapshot.docs.map(itemDoc => ({
          ...itemDoc.data(),
          name: itemDoc.data().itemName // Map itemName to name for consistency
        }));
        
        // Get payments
        const paymentsRef = collection(db, 'payments');
        const paymentsQuery = query(paymentsRef, where('transactionId', '==', transaction.id));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        transactionData.payments = paymentsSnapshot.docs.map(paymentDoc => paymentDoc.data());
        
        completeTransactions.push(transactionData);
      }
      
      return calculateReportData(completeTransactions);
    } catch (error) {
      console.error('Error generating sales report:', error);
      return getEmptyReportData();
    }
  };

  // Sales report by custom date range (fallback method)
  const getSalesReportByDateRange = async (startDate, endDate) => {
    try {
      // Get all transactions for the user first
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(1000) // Get more transactions for historical reports
      );
      
      const querySnapshot = await getDocs(q);
      let transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter by date range in JavaScript
      transactions = transactions.filter(transaction => {
        if (!transaction.createdAt) return false;
        const transactionDate = transaction.createdAt.toDate();
        return transactionDate >= startDate && transactionDate <= endDate;
      });
      
      // Fetch items and payments for each transaction
      const completeTransactions = [];
      for (const transaction of transactions) {
        const transactionData = { ...transaction };
        
        // Get transaction items
        const itemsRef = collection(db, 'transactionItems');
        const itemsQuery = query(itemsRef, where('transactionId', '==', transaction.id));
        const itemsSnapshot = await getDocs(itemsQuery);
        transactionData.items = itemsSnapshot.docs.map(itemDoc => ({
          ...itemDoc.data(),
          name: itemDoc.data().itemName // Map itemName to name for consistency
        }));
        
        // Get payments
        const paymentsRef = collection(db, 'payments');
        const paymentsQuery = query(paymentsRef, where('transactionId', '==', transaction.id));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        transactionData.payments = paymentsSnapshot.docs.map(paymentDoc => paymentDoc.data());
        
        completeTransactions.push(transactionData);
      }
      
      return calculateReportData(completeTransactions);
    } catch (error) {
      console.error('Error generating custom date range report:', error);
      return getEmptyReportData();
    }
  };

  // Get transactions by date range (fallback method)
  const getTransactionsByDateRange = async (startDate, endDate) => {
    try {
      // Get all recent transactions for the user
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(500) // Get more transactions for filtering
      );
      
      const querySnapshot = await getDocs(q);
      let transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter by date range in JavaScript
      transactions = transactions.filter(transaction => {
        if (!transaction.createdAt) return false;
        const transactionDate = transaction.createdAt.toDate();
        return transactionDate >= startDate && transactionDate <= endDate;
      });
      
      // Sort by date descending and limit to 100
      transactions.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate() - a.createdAt.toDate();
      });
      
      return transactions.slice(0, 100);
    } catch (error) {
      console.error('Error getting transactions by date range:', error);
      return [];
    }
  };

  // Get chart data for visualization (fallback method without complex indexes)
  const getChartData = async (period = 'today', startDate = null, endDate = null) => {
    try {
      // First, get all transactions for the user (without date filtering to avoid index requirement)
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(500) // Limit to recent transactions for performance
      );
      
      const querySnapshot = await getDocs(q);
      let transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter transactions by date range in JavaScript (client-side filtering)
      let queryStartDate, queryEndDate;
      
      if (startDate && endDate) {
        queryStartDate = startDate;
        queryEndDate = endDate;
      } else {
        queryStartDate = new Date();
        queryEndDate = new Date();
        
        switch (period) {
          case 'today':
            queryStartDate.setHours(0, 0, 0, 0);
            queryEndDate.setHours(23, 59, 59, 999);
            break;
          case 'week':
            queryStartDate.setDate(queryStartDate.getDate() - 7);
            break;
          case 'month':
            queryStartDate.setDate(queryStartDate.getDate() - 30);
            break;
          case '3months':
            queryStartDate.setDate(queryStartDate.getDate() - 90);
            break;
          case '6months':
            queryStartDate.setDate(queryStartDate.getDate() - 180);
            break;
          case 'year':
            queryStartDate.setDate(queryStartDate.getDate() - 365);
            break;
        }
      }
      
      // Filter transactions by date range
      transactions = transactions.filter(transaction => {
        if (!transaction.createdAt) return false;
        const transactionDate = transaction.createdAt.toDate();
        return transactionDate >= queryStartDate && transactionDate <= queryEndDate;
      });
      
      // Sort by date ascending for chart display
      transactions.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.toDate() - b.createdAt.toDate();
      });
      
      // Generate sales trend data
      const salesTrend = generateSalesTrendData(transactions, period);
      
      return {
        salesTrend,
      };
    } catch (error) {
      console.error('Error getting chart data:', error);
      // Return empty data instead of throwing error
      return { salesTrend: [] };
    }
  };

  // Helper function to calculate report data
  const calculateReportData = (transactions) => {
    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
    const transactionCount = transactions.length;
    const avgTransaction = transactionCount > 0 ? totalSales / transactionCount : 0;
    const totalTax = transactions.reduce((sum, t) => sum + (t.tax || 0), 0);
    
    // Payment methods breakdown
    const paymentTotals = {};
    const paymentCounts = {};
    
    transactions.forEach(transaction => {
      if (transaction.payments) {
        transaction.payments.forEach(payment => {
          const method = payment.method || 'unknown';
          paymentTotals[method] = (paymentTotals[method] || 0) + payment.amount;
          paymentCounts[method] = (paymentCounts[method] || 0) + 1;
        });
      }
    });
    
    const paymentMethods = Object.entries(paymentTotals).map(([method, amount]) => ({
      method,
      total_amount: amount,
      count: paymentCounts[method] || 0
    }));
    
    // Top selling items
    const itemTotals = {};
    transactions.forEach(transaction => {
      if (transaction.items) {
        transaction.items.forEach(item => {
          const key = item.name;
          if (!itemTotals[key]) {
            itemTotals[key] = {
              name: item.name,
              total_quantity: 0,
              total_revenue: 0
            };
          }
          itemTotals[key].total_quantity += item.quantity;
          itemTotals[key].total_revenue += item.quantity * parseFloat(item.price);
        });
      }
    });
    
    const topItems = Object.values(itemTotals)
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 10);
    
    return {
      total_sales: totalSales,
      transaction_count: transactionCount,
      avg_transaction: avgTransaction,
      total_tax: totalTax,
      payment_methods: paymentMethods,
      top_items: topItems
    };
  };

  // Helper function to get empty report data
  const getEmptyReportData = () => ({
    total_sales: 0,
    transaction_count: 0,
    avg_transaction: 0,
    total_tax: 0,
    payment_methods: [],
    top_items: []
  });

  // Helper function to generate sales trend data for charts
  const generateSalesTrendData = (transactions, period) => {
    if (!transactions.length) return [];
    
    const trendData = [];
    const dataPoints = {};
    
    transactions.forEach(transaction => {
      if (!transaction.createdAt) return;
      
      const date = transaction.createdAt.toDate();
      let key;
      
      switch (period) {
        case 'today':
          key = `${date.getHours()}:00`;
          break;
        case 'week':
          key = date.toLocaleDateString('en-US', { weekday: 'short' });
          break;
        case 'month':
        case '3months':
        case '6months':
          key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case 'year':
          key = date.toLocaleDateString('en-US', { month: 'short' });
          break;
        default:
          key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      dataPoints[key] = (dataPoints[key] || 0) + transaction.total;
    });
    
    // Convert to array and sort
    Object.entries(dataPoints).forEach(([label, value]) => {
      trendData.push({ label, value });
    });
    
    // Limit data points for better visualization
    const maxPoints = period === 'today' ? 24 : period === 'week' ? 7 : 15;
    return trendData.slice(-maxPoints);
  };

  // Customer management
  const getCustomers = async () => {
    try {
      const customersRef = collection(db, 'customers');
      const q = query(
        customersRef,
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      let customers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by creation date descending in JavaScript
      customers.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate() - a.createdAt.toDate();
      });
      
      return customers;
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  };

  const addCustomer = async (customerData) => {
    try {
      const customersRef = collection(db, 'customers');
      const docRef = await addDoc(customersRef, {
        ...customerData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (customerId, customerData) => {
    try {
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, {
        ...customerData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (customerId) => {
    try {
      const customerRef = doc(db, 'customers', customerId);
      await deleteDoc(customerRef);
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  // Employee management
  const getEmployees = async () => {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(
        employeesRef,
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      let employees = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by creation date descending in JavaScript
      employees.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate() - a.createdAt.toDate();
      });
      
      return employees;
    } catch (error) {
      console.error('Error getting employees:', error);
      return [];
    }
  };

  const addEmployee = async (employeeData) => {
    try {
      const employeesRef = collection(db, 'employees');
      const docRef = await addDoc(employeesRef, {
        ...employeeData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  };

  const updateEmployee = async (employeeId, employeeData) => {
    try {
      const employeeRef = doc(db, 'employees', employeeId);
      await updateDoc(employeeRef, {
        ...employeeData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  };

  const value = {
    isReady,
    getCategories,
    createCategory,
    getItems,
    getItemById,
    getItemBySku,
    getItemByBarcode,
    searchItems,
    getLowStockItems,
    addItem,
    updateItem,
    updateItemStock,
    deleteItem,
    createTransaction,
    getTransactions,
    getTodaysTransactions,
    getSalesReport,
    getSalesReportByDateRange,
    getTransactionsByDateRange,
    getChartData,
    getCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getEmployees,
    addEmployee,
    updateEmployee,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};