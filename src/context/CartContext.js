import React, { createContext, useContext, useReducer } from 'react';
import { calculateTax, calculateTotal } from '../utils/Utils';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Cart reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => item.id === action.payload.id
      );

      let newItems;
      if (existingItemIndex >= 0) {
        // Item already exists, increase quantity
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // New item, add to cart
        newItems = [...state.items, { ...action.payload, quantity: 1 }];
      }

      const subtotal = calculateSubtotal(newItems);
      const tax = calculateTax(subtotal);
      const total = subtotal + tax;

      return {
        ...state,
        items: newItems,
        subtotal,
        tax,
        total,
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload);
      const subtotal = calculateSubtotal(newItems);
      const tax = calculateTax(subtotal);
      const total = subtotal + tax;

      return {
        ...state,
        items: newItems,
        subtotal,
        tax,
        total,
      };
    }

    case 'UPDATE_QUANTITY': {
      const { itemId, quantity } = action.payload;
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: itemId });
      }

      const newItems = state.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );

      const subtotal = calculateSubtotal(newItems);
      const tax = calculateTax(subtotal);
      const total = subtotal + tax;

      return {
        ...state,
        items: newItems,
        subtotal,
        tax,
        total,
      };
    }

    case 'CLEAR_CART':
      return {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
      };

    case 'SET_DISCOUNT': {
      const { discount, discountType } = action.payload;
      const subtotal = calculateSubtotal(state.items);
      
      let discountAmount = 0;
      if (discountType === 'percentage') {
        discountAmount = (subtotal * discount) / 100;
      } else {
        discountAmount = discount;
      }
      
      const discountedSubtotal = Math.max(0, subtotal - discountAmount);
      const tax = calculateTax(discountedSubtotal);
      const total = discountedSubtotal + tax;

      return {
        ...state,
        discount,
        discountType,
        subtotal: discountedSubtotal,
        tax,
        total,
      };
    }

    default:
      return state;
  }
};

// Helper function to calculate subtotal
const calculateSubtotal = (items) => {
  return items.reduce((total, item) => {
    return total + (parseFloat(item.price) * item.quantity);
  }, 0);
};

// Initial state
const initialState = {
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  discount: 0,
  discountType: 'amount', // 'amount' or 'percentage'
  itemCount: 0,
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Calculate item count
  const itemCount = state.items.reduce((count, item) => count + item.quantity, 0);

  // Actions
  const addItem = (item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (itemId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  };

  const updateQuantity = (itemId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const setDiscount = (discount, discountType = 'amount') => {
    dispatch({ type: 'SET_DISCOUNT', payload: { discount, discountType } });
  };

  // Check if item is in cart
  const isInCart = (itemId) => {
    return state.items.some(item => item.id === itemId);
  };

  // Get item quantity in cart
  const getItemQuantity = (itemId) => {
    const item = state.items.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  // Get cart summary for receipt
  const getCartSummary = () => {
    return {
      items: state.items.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: parseFloat(item.price),
        quantity: item.quantity,
        total: parseFloat(item.price) * item.quantity,
      })),
      subtotal: state.subtotal,
      tax: state.tax,
      total: state.total,
      discount: state.discount,
      itemCount,
    };
  };

  // Check if cart has items
  const hasItems = () => {
    return state.items.length > 0;
  };

  // Get total items count
  const getTotalItemsCount = () => {
    return itemCount;
  };

  // Validate cart for checkout
  const validateCart = () => {
    const errors = [];
    
    if (state.items.length === 0) {
      errors.push('Cart is empty');
    }

    // Check stock availability
    state.items.forEach(cartItem => {
      if (cartItem.quantity > cartItem.stock) {
        errors.push(`Insufficient stock for ${cartItem.name}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const value = {
    // State
    items: state.items,
    subtotal: state.subtotal,
    tax: state.tax,
    total: state.total,
    discount: state.discount,
    discountType: state.discountType,
    itemCount,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setDiscount,
    
    // Helpers
    isInCart,
    getItemQuantity,
    getCartSummary,
    hasItems,
    getTotalItemsCount,
    validateCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};