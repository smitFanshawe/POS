// Utility functions for the POS system

// Brand Colors
export const COLORS = {
  primary: '#2196F3',
  secondary: '#4CAF50',
  accent: '#FF9800',
  error: '#F44336',
  warning: '#FF5722',
  success: '#4CAF50',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
};

// Tax Configuration
export const TAX_RATE = 0.085; // 8.5% tax rate
export const TAX_PERCENTAGE = TAX_RATE * 100;

// Payment Methods
export const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', icon: 'cash-outline' },
  { id: 'visa', name: 'Visa', icon: 'card-outline' },
  { id: 'mastercard', name: 'Mastercard', icon: 'card-outline' },
  { id: 'amex', name: 'American Express', icon: 'card-outline' },
  { id: 'debit', name: 'Debit Card', icon: 'card-outline' },
];

// Default Categories
export const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Beverages', description: 'Soft drinks, juices, water' },
  { id: 2, name: 'Snacks', description: 'Chips, candy, nuts' },
  { id: 3, name: 'Household', description: 'Cleaning supplies, toiletries' },
  { id: 4, name: 'Tobacco', description: 'Cigarettes, cigars' },
  { id: 5, name: 'Food', description: 'Ready-to-eat meals, sandwiches' },
];

// Currency formatting
export const formatCurrency = (amount) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numAmount || 0);
};

// Date formatting
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Calculate tax
export const calculateTax = (subtotal) => {
  return subtotal * TAX_RATE;
};

// Calculate total with tax
export const calculateTotal = (subtotal) => {
  return subtotal + calculateTax(subtotal);
};

// Generate SKU
export const generateSKU = (name) => {
  const words = name.toUpperCase().split(' ');
  const initials = words.map(word => word.charAt(0)).join('');
  const timestamp = Date.now().toString().slice(-4);
  return `${initials}${timestamp}`;
};

// Validate barcode
export const isValidBarcode = (barcode) => {
  return barcode && barcode.length >= 8 && /^\d+$/.test(barcode);
};

// Format phone number
export const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Generate receipt number
export const generateReceiptNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.getTime().toString().slice(-4);
  return `RCP${dateStr}${timeStr}`;
};

// Low stock threshold
export const LOW_STOCK_THRESHOLD = 10;

// Check if item is low stock
export const isLowStock = (item) => {
  return item.stock <= (item.minStock || LOW_STOCK_THRESHOLD);
};

// Sort items by name
export const sortItemsByName = (items) => {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
};

// Filter items by category
export const filterItemsByCategory = (items, categoryId) => {
  if (!categoryId || categoryId === 'all') return items;
  return items.filter(item => item.categoryId === parseInt(categoryId));
};

// Search items
export const searchItems = (items, query) => {
  if (!query) return items;
  const searchTerm = query.toLowerCase();
  return items.filter(item => 
    item.name.toLowerCase().includes(searchTerm) ||
    item.sku.toLowerCase().includes(searchTerm) ||
    (item.barcode && item.barcode.includes(searchTerm))
  );
};