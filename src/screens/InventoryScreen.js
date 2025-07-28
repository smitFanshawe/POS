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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useDatabase } from '../context/DatabaseContext';
import { COLORS, formatCurrency, isLowStock, debounce } from '../utils/Utils';
import { exportInventoryReportPDF } from '../utils/PrintUtils';

const InventoryScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);

  const database = useDatabase();

  useEffect(() => {
    if (database.isReady) {
      loadData();
    }
  }, [database.isReady]);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, selectedCategory, stockFilter]);

  const loadData = async () => {
    try {
      const [itemsData, categoriesData] = await Promise.all([
        database.getItems(),
        database.getCategories(),
      ]);
      
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load inventory data',
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleExportInventory = async () => {
    if (items.length === 0) {
      Alert.alert('No Data', 'No inventory data available to export');
      return;
    }
    
    try {
      const result = await exportInventoryReportPDF(items, categories);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Inventory Exported',
          text2: `Saved as ${result.fileName}`,
        });
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export inventory');
      }
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export inventory. Please try again.');
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        (item.barcode && item.barcode.includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => 
        item.categoryName === selectedCategory
      );
    }

    // Stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter(item => isLowStock(item));
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(item => item.stock === 0);
    }

    setFilteredItems(filtered);
  };

  const handleEditItem = (item) => {
    navigation.navigate('AddItem', { editItem: item });
  };

  const handleRestockItem = (item) => {
    Alert.prompt(
      'Restock Item',
      `Enter quantity to add to ${item.name}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Stock',
          onPress: (quantity) => {
            const qty = parseInt(quantity);
            if (qty > 0) {
              restockItem(item.id, qty);
            } else {
              Alert.alert('Invalid Quantity', 'Please enter a valid positive number');
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleBulkRestock = () => {
    const lowStockItems = items.filter(isLowStock);
    if (lowStockItems.length === 0) {
      Alert.alert('No Low Stock Items', 'All items are adequately stocked');
      return;
    }

    Alert.alert(
      'Bulk Restock',
      `Restock ${lowStockItems.length} low stock items to their minimum levels?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restock All',
          onPress: async () => {
            try {
              for (const item of lowStockItems) {
                const restockQty = Math.max(0, item.minStock - item.stock + 10);
                if (restockQty > 0) {
                  const updatedItem = {
                    ...item,
                    stock: item.stock + restockQty,
                  };
                  await database.updateItem(item.id, updatedItem);
                }
              }
              await loadData();
              Toast.show({
                type: 'success',
                text1: 'Bulk Restock Complete',
                text2: `Restocked ${lowStockItems.length} items`,
              });
            } catch (error) {
              console.error('Error bulk restocking:', error);
              Alert.alert('Error', 'Failed to complete bulk restock');
            }
          },
        },
      ]
    );
  };

  const restockItem = async (itemId, quantity) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const updatedItem = {
          ...item,
          stock: item.stock + quantity,
        };
        
        await database.updateItem(itemId, updatedItem);
        await loadData();
        
        Toast.show({
          type: 'success',
          text1: 'Stock Updated',
          text2: `Added ${quantity} units to ${item.name}`,
        });
      }
    } catch (error) {
      console.error('Error restocking item:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update stock',
      });
    }
  };

  const getInventoryStats = () => {
    const totalItems = items.length;
    const lowStockItems = items.filter(isLowStock).length;
    const outOfStockItems = items.filter(item => item.stock === 0).length;
    const totalValue = items.reduce((sum, item) => 
      sum + (parseFloat(item.price) * item.stock), 0
    );

    return { totalItems, lowStockItems, outOfStockItems, totalValue };
  };

  const renderStatsCard = (title, value, color = COLORS.primary) => (
    <View style={styles.statsCard}>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
      <Text style={styles.statsLabel}>{title}</Text>
    </View>
  );

  const renderCategoryFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          selectedCategory === 'all' && styles.activeFilterButton,
        ]}
        onPress={() => setSelectedCategory('all')}
      >
        <Text style={[
          styles.filterButtonText,
          selectedCategory === 'all' && styles.activeFilterButtonText,
        ]}>
          All Categories
        </Text>
      </TouchableOpacity>
      
      {categories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.filterButton,
            selectedCategory === category.name && styles.activeFilterButton,
          ]}
          onPress={() => setSelectedCategory(category.name)}
        >
          <Text style={[
            styles.filterButtonText,
            selectedCategory === category.name && styles.activeFilterButtonText,
          ]}>
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderStockFilter = () => (
    <View style={styles.stockFilters}>
      {[
        { id: 'all', label: 'All Items' },
        { id: 'low', label: 'Low Stock' },
        { id: 'out', label: 'Out of Stock' },
      ].map(filter => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.stockFilterButton,
            stockFilter === filter.id && styles.activeStockFilterButton,
          ]}
          onPress={() => setStockFilter(filter.id)}
        >
          <Text style={[
            styles.stockFilterText,
            stockFilter === filter.id && styles.activeStockFilterText,
          ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderInventoryItem = (item) => {
    const lowStock = isLowStock(item);
    const outOfStock = item.stock === 0;

    return (
      <View key={item.id} style={styles.inventoryItem}>
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            {(lowStock || outOfStock) && (
              <View style={[
                styles.stockBadge,
                outOfStock ? styles.outOfStockBadge : styles.lowStockBadge,
              ]}>
                <Text style={styles.stockBadgeText}>
                  {outOfStock ? 'OUT' : 'LOW'}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.itemSku}>SKU: {item.sku}</Text>
          {item.barcode && (
            <Text style={styles.itemBarcode}>Barcode: {item.barcode}</Text>
          )}
          <Text style={styles.itemCategory}>
            {item.categoryName || 'No Category'}
          </Text>
          
          <View style={styles.itemDetails}>
            <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
            <Text style={[
              styles.itemStock,
              outOfStock && styles.outOfStockText,
              lowStock && !outOfStock && styles.lowStockText,
            ]}>
              Stock: {item.stock}
            </Text>
          </View>
        </View>
        
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditItem(item)}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRestockItem(item)}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.success} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const stats = getInventoryStats();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => handleBulkRestock()}
          >
            <Ionicons name="refresh-outline" size={20} color={COLORS.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => handleExportInventory()}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddItem')}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          {renderStatsCard('Total Items', stats.totalItems)}
          {renderStatsCard('Low Stock', stats.lowStockItems, COLORS.warning)}
          {renderStatsCard('Out of Stock', stats.outOfStockItems, COLORS.error)}
        </View>
        <View style={styles.statsRow}>
          {renderStatsCard('Total Value', formatCurrency(stats.totalValue), COLORS.success)}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderCategoryFilter()}
        {renderStockFilter()}
      </View>

      {/* Inventory List */}
      <ScrollView
        style={styles.inventoryList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== 'all' || stockFilter !== 'all'
                ? 'No items match your filters'
                : 'No items in inventory'}
            </Text>
          </View>
        ) : (
          filteredItems.map(renderInventoryItem)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  filtersContainer: {
    backgroundColor: COLORS.surface,
    paddingBottom: 16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  activeFilterButtonText: {
    color: 'white',
  },
  stockFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  stockFilterButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  activeStockFilterButton: {
    backgroundColor: COLORS.primary,
  },
  stockFilterText: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
  activeStockFilterText: {
    color: 'white',
  },
  inventoryList: {
    flex: 1,
    padding: 16,
  },
  inventoryItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  lowStockBadge: {
    backgroundColor: COLORS.warning,
  },
  outOfStockBadge: {
    backgroundColor: COLORS.error,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  itemSku: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  itemBarcode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  itemStock: {
    fontSize: 14,
    color: COLORS.text,
  },
  lowStockText: {
    color: COLORS.warning,
  },
  outOfStockText: {
    color: COLORS.error,
  },
  itemActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default InventoryScreen;