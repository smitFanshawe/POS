import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useDatabase } from '../context/DatabaseContext';
import BarcodeScanner from '../components/BarcodeScanner';
import { COLORS, generateSKU, isValidBarcode } from '../utils/Utils';

const AddItemScreen = ({ navigation, route }) => {
  const { editItem, barcode: scannedBarcode } = route.params || {};
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: '',
    stock: '',
    minStock: '5',
    taxRate: '8.5',
    categoryName: '',
    isRevenue: true,
  });
  
  const [categories, setCategories] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const database = useDatabase();

  useEffect(() => {
    if (database.isReady) {
      loadCategories();
    }
  }, [database.isReady]);

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        sku: editItem.sku,
        barcode: editItem.barcode || '',
        price: editItem.price.toString(),
        stock: editItem.stock.toString(),
        minStock: editItem.minStock?.toString() || '5',
        taxRate: editItem.taxRate?.toString() || '8.5',
        categoryName: editItem.categoryName || '',
        isRevenue: editItem.isRevenue !== false,
      });
    } else if (scannedBarcode) {
      setFormData(prev => ({
        ...prev,
        barcode: scannedBarcode,
      }));
    }
  }, [editItem, scannedBarcode]);

  const loadCategories = async () => {
    try {
      const categoriesData = await database.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load categories',
      });
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const generateSkuFromName = () => {
    if (formData.name.trim()) {
      const sku = generateSKU(formData.name);
      updateFormData('sku', sku);
    }
  };

  const handleBarcodeScanned = (barcode) => {
    setShowScanner(false);
    updateFormData('barcode', barcode);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be a valid positive number';
    }

    if (!formData.stock.trim()) {
      newErrors.stock = 'Stock quantity is required';
    } else if (isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0) {
      newErrors.stock = 'Stock must be a valid non-negative number';
    }

    if (formData.barcode && !isValidBarcode(formData.barcode)) {
      newErrors.barcode = 'Invalid barcode format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const itemData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim() || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock) || 5,
        taxRate: parseFloat(formData.taxRate) || 8.5,
        categoryName: formData.categoryName || null,
        isRevenue: formData.isRevenue,
      };

      if (editItem) {
        await database.updateItem(editItem.id, itemData);
        Toast.show({
          type: 'success',
          text1: 'Item Updated',
          text2: `${itemData.name} has been updated successfully`,
        });
      } else {
        await database.addItem(itemData);
        Toast.show({
          type: 'success',
          text1: 'Item Added',
          text2: `${itemData.name} has been added to inventory`,
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert(
        'Save Failed',
        error.message || 'Failed to save item. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (label, field, options = {}) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          errors[field] && styles.inputError,
        ]}
        value={formData[field]}
        onChangeText={(value) => updateFormData(field, value)}
        {...options}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderCategoryPicker = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <TouchableOpacity
          style={[
            styles.categoryButton,
            !formData.categoryName && styles.selectedCategoryButton,
          ]}
          onPress={() => updateFormData('categoryName', '')}
        >
          <Text style={[
            styles.categoryButtonText,
            !formData.categoryName && styles.selectedCategoryButtonText,
          ]}>
            No Category
          </Text>
        </TouchableOpacity>
        
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              formData.categoryName === category.name && styles.selectedCategoryButton,
            ]}
            onPress={() => updateFormData('categoryName', category.name)}
          >
            <Text style={[
              styles.categoryButtonText,
              formData.categoryName === category.name && styles.selectedCategoryButtonText,
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderRevenueToggle = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Revenue Item</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            formData.isRevenue && styles.activeToggleButton,
          ]}
          onPress={() => updateFormData('isRevenue', true)}
        >
          <Text style={[
            styles.toggleButtonText,
            formData.isRevenue && styles.activeToggleButtonText,
          ]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            !formData.isRevenue && styles.activeToggleButton,
          ]}
          onPress={() => updateFormData('isRevenue', false)}
        >
          <Text style={[
            styles.toggleButtonText,
            !formData.isRevenue && styles.activeToggleButtonText,
          ]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.helperText}>
        Revenue items are included in sales reports
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            {renderInput('Item Name *', 'name', {
              placeholder: 'Enter item name',
            })}

            <View style={styles.inputGroup}>
              <View style={styles.skuContainer}>
                <View style={styles.skuInput}>
                  {renderInput('SKU *', 'sku', {
                    placeholder: 'Enter SKU',
                  })}
                </View>
                <TouchableOpacity
                  style={styles.generateSkuButton}
                  onPress={generateSkuFromName}
                >
                  <Text style={styles.generateSkuButtonText}>Generate</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Barcode</Text>
              <View style={styles.barcodeContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.barcodeInput,
                    errors.barcode && styles.inputError,
                  ]}
                  value={formData.barcode}
                  onChangeText={(value) => updateFormData('barcode', value)}
                  placeholder="Enter or scan barcode"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => setShowScanner(true)}
                >
                  <Ionicons name="camera" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              {errors.barcode && (
                <Text style={styles.errorText}>{errors.barcode}</Text>
              )}
            </View>

            {renderCategoryPicker()}
          </View>

          {/* Pricing & Stock */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing & Stock</Text>
            
            {renderInput('Price *', 'price', {
              placeholder: '0.00',
              keyboardType: 'decimal-pad',
            })}

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                {renderInput('Stock Quantity *', 'stock', {
                  placeholder: '0',
                  keyboardType: 'numeric',
                })}
              </View>
              <View style={styles.halfWidth}>
                {renderInput('Min Stock Level', 'minStock', {
                  placeholder: '5',
                  keyboardType: 'numeric',
                })}
              </View>
            </View>

            {renderInput('Tax Rate (%)', 'taxRate', {
              placeholder: '8.5',
              keyboardType: 'decimal-pad',
            })}

            {renderRevenueToggle()}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : (editItem ? 'Update Item' : 'Add Item')}
          </Text>
        </TouchableOpacity>
      </View>

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
  form: {
    padding: 16,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  skuContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  skuInput: {
    flex: 1,
  },
  generateSkuButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  generateSkuButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeInput: {
    flex: 1,
  },
  scanButton: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedCategoryButton: {
    backgroundColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  activeToggleButtonText: {
    color: 'white',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AddItemScreen;