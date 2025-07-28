import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useCart } from '../context/CartContext';
import { useDatabase } from '../context/DatabaseContext';
import BarcodeScanner from '../components/BarcodeScanner';
import { COLORS, formatCurrency, debounce } from '../utils/Utils';

const POSScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [quickAddItems, setQuickAddItems] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todaysSales, setTodaysSales] = useState(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState('amount');

  const cart = useCart();
  const database = useDatabase();

  useEffect(() => {
    if (database.isReady) {
      loadInitialData();
    }
  }, [database.isReady]);

  const loadInitialData = async () => {
    try {
      // Load quick add items (first 6 items)
      const items = await database.getItems();
      setQuickAddItems(items.slice(0, 6));

      // Load today's sales report
      const salesReport = await database.getSalesReport('today');
      setTodaysSales(salesReport);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load data',
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // Debounced search function
  const debouncedSearch = debounce(async (query) => {
    if (query.trim().length > 0) {
      try {
        const results = await database.searchItems(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  }, 300);

  const handleSearch = (text) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleAddToCart = (item) => {
    if (item.stock <= 0) {
      Alert.alert('Out of Stock', `${item.name} is currently out of stock.`);
      return;
    }

    const currentQuantity = cart.getItemQuantity(item.id);
    if (currentQuantity >= item.stock) {
      Alert.alert(
        'Insufficient Stock',
        `Only ${item.stock} units of ${item.name} are available.`
      );
      return;
    }

    cart.addItem(item);
    Toast.show({
      type: 'success',
      text1: 'Added to Cart',
      text2: `${item.name} added successfully`,
    });
  };

  const handleBarcodeScanned = async (barcode) => {
    setShowScanner(false);
    
    try {
      const item = await database.getItemByBarcode(barcode);
      if (item) {
        handleAddToCart(item);
      } else {
        Alert.alert(
          'Item Not Found',
          `No item found with barcode: ${barcode}`,
          [
            {
              text: 'Add New Item',
              onPress: () => navigation.navigate('Inventory', {
                screen: 'AddItem',
                params: { barcode }
              }),
            },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to lookup barcode',
      });
    }
  };

  const handleProcessPayment = () => {
    const validation = cart.validateCart();
    if (!validation.isValid) {
      Alert.alert('Cart Error', validation.errors.join('\n'));
      return;
    }

    navigation.navigate('Payment');
  };

  const handleApplyDiscount = () => {
    const amount = parseFloat(discountAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid Discount', 'Please enter a valid discount amount');
      return;
    }

    if (discountType === 'percentage' && amount > 100) {
      Alert.alert('Invalid Discount', 'Percentage discount cannot exceed 100%');
      return;
    }

    cart.setDiscount(amount, discountType);
    setShowDiscountModal(false);
    setDiscountAmount('');
    
    Toast.show({
      type: 'success',
      text1: 'Discount Applied',
      text2: `${discountType === 'percentage' ? amount + '%' : formatCurrency(amount)} discount applied`,
    });
  };

  const handleRemoveDiscount = () => {
    cart.setDiscount(0, 'amount');
    Toast.show({
      type: 'info',
      text1: 'Discount Removed',
      text2: 'Discount has been removed from cart',
    });
  };

  const renderCartItem = (item) => (
    <View key={item.id} style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemSku}>SKU: {item.sku}</Text>
        <Text style={styles.cartItemPrice}>{formatCurrency(item.price)}</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => cart.updateQuantity(item.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => cart.updateQuantity(item.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => cart.removeItem(item.id)}
        >
          <Ionicons name="trash" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.searchResultItem}
      onPress={() => handleAddToCart(item)}
    >
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultSku}>SKU: {item.sku}</Text>
        <Text style={styles.searchResultCategory}>
          {item.category_name || 'No Category'}
        </Text>
      </View>
      <View style={styles.searchResultPrice}>
        <Text style={styles.searchResultPriceText}>{formatCurrency(item.price)}</Text>
        <Text style={styles.searchResultStock}>Stock: {item.stock}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderQuickAddItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.quickAddItem}
      onPress={() => handleAddToCart(item)}
    >
      <Text style={styles.quickAddName}>{item.name}</Text>
      <Text style={styles.quickAddPrice}>{formatCurrency(item.price)}</Text>
      <Text style={styles.quickAddStock}>Stock: {item.stock}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Sales Summary */}
        {todaysSales && (
          <View style={styles.salesSummary}>
            <Text style={styles.sectionTitle}>Today's Sales</Text>
            <View style={styles.salesRow}>
              <View style={styles.salesCard}>
                <Text style={styles.salesValue}>
                  {formatCurrency(todaysSales.total_sales)}
                </Text>
                <Text style={styles.salesLabel}>Total Sales</Text>
              </View>
              <View style={styles.salesCard}>
                <Text style={styles.salesValue}>{todaysSales.transaction_count}</Text>
                <Text style={styles.salesLabel}>Transactions</Text>
              </View>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items by name or SKU..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowScanner(true)}
            >
              <Ionicons name="camera" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {searchResults.map(renderSearchResult)}
          </View>
        )}

        {/* Current Transaction */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Transaction</Text>
            {cart.hasItems() && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={cart.clearCart}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {cart.hasItems() ? (
            <View style={styles.cartContainer}>
              {cart.items.map(renderCartItem)}
              
              {/* Cart Total */}
              <View style={styles.cartTotal}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{formatCurrency(cart.subtotal)}</Text>
                </View>
                {cart.discount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.discountLabel}>
                      Discount ({cart.discountType === 'percentage' ? cart.discount + '%' : formatCurrency(cart.discount)})
                    </Text>
                    <Text style={styles.discountValue}>
                      -{formatCurrency(cart.discountType === 'percentage' ? (cart.subtotal * cart.discount) / 100 : cart.discount)}
                    </Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <Text style={styles.totalValue}>{formatCurrency(cart.tax)}</Text>
                </View>
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(cart.total)}</Text>
                </View>
                
                <View style={styles.cartActions}>
                  <TouchableOpacity
                    style={styles.discountButton}
                    onPress={() => setShowDiscountModal(true)}
                  >
                    <Ionicons name="pricetag-outline" size={16} color={COLORS.accent} />
                    <Text style={styles.discountButtonText}>
                      {cart.discount > 0 ? 'Edit Discount' : 'Add Discount'}
                    </Text>
                  </TouchableOpacity>
                  {cart.discount > 0 && (
                    <TouchableOpacity
                      style={styles.removeDiscountButton}
                      onPress={handleRemoveDiscount}
                    >
                      <Ionicons name="close" size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <TouchableOpacity
                  style={styles.paymentButton}
                  onPress={handleProcessPayment}
                >
                  <Text style={styles.paymentButtonText}>Process Payment</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyCartText}>No items in cart</Text>
            </View>
          )}
        </View>

        {/* Quick Add Items */}
        {quickAddItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Add</Text>
            <View style={styles.quickAddGrid}>
              {quickAddItems.map(renderQuickAddItem)}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <BarcodeScanner
          isVisible={showScanner}
          onBarcodeScanned={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      </Modal>

      {/* Discount Modal */}
      <Modal
        visible={showDiscountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDiscountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.discountModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Discount</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDiscountModal(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.discountTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.discountTypeButton,
                  discountType === 'amount' && styles.activeDiscountType
                ]}
                onPress={() => setDiscountType('amount')}
              >
                <Text style={[
                  styles.discountTypeText,
                  discountType === 'amount' && styles.activeDiscountTypeText
                ]}>
                  Fixed Amount
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.discountTypeButton,
                  discountType === 'percentage' && styles.activeDiscountType
                ]}
                onPress={() => setDiscountType('percentage')}
              >
                <Text style={[
                  styles.discountTypeText,
                  discountType === 'percentage' && styles.activeDiscountTypeText
                ]}>
                  Percentage
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.discountInputContainer}>
              <Text style={styles.discountInputLabel}>
                {discountType === 'amount' ? 'Discount Amount' : 'Discount Percentage'}
              </Text>
              <TextInput
                style={styles.discountInput}
                value={discountAmount}
                onChangeText={setDiscountAmount}
                placeholder={discountType === 'amount' ? '0.00' : '0'}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDiscountModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={handleApplyDiscount}
              >
                <Text style={styles.modalApplyText}>Apply Discount</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  salesSummary: {
    backgroundColor: COLORS.surface,
    padding: 16,
    marginBottom: 8,
  },
  salesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  salesCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  salesValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  salesLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  scanButton: {
    padding: 8,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.error,
    borderRadius: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  searchResultSku: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchResultCategory: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  searchResultPrice: {
    alignItems: 'flex-end',
  },
  searchResultPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  searchResultStock: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cartContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cartItemSku: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cartItemPrice: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginHorizontal: 8,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cartTotal: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.background,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyCartText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAddItem: {
    width: '48%',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  quickAddName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  quickAddPrice: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  quickAddStock: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Discount styles
  discountLabel: {
    fontSize: 14,
    color: COLORS.accent,
  },
  discountValue: {
    fontSize: 14,
    color: COLORS.accent,
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  discountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  discountButtonText: {
    fontSize: 14,
    color: COLORS.accent,
    marginLeft: 6,
  },
  removeDiscountButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  discountModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  discountTypeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeDiscountType: {
    backgroundColor: COLORS.primary,
  },
  discountTypeText: {
    fontSize: 14,
    color: COLORS.text,
  },
  activeDiscountTypeText: {
    color: 'white',
  },
  discountInputContainer: {
    marginBottom: 20,
  },
  discountInputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  discountInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: COLORS.text,
  },
  modalApplyButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalApplyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default POSScreen;