import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/Utils';

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    // Business Settings
    businessName: 'ConveniPOS',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    
    // Tax Settings
    taxRate: 8.5,
    taxInclusive: false,
    
    // Receipt Settings
    receiptFooter: 'Thank you for your business!',
    printReceipts: true,
    emailReceipts: false,
    
    // POS Settings
    quickCashAmounts: [5, 10, 20, 50, 100],
    roundCashPayments: false,
    lowStockThreshold: 10,
    
    // Display Settings
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    
    // Security Settings
    requirePinForVoids: false,
    requirePinForDiscounts: false,
    autoLogoutMinutes: 30,
    
    // Backup Settings
    autoBackup: true,
    backupFrequency: 'daily',
  });

  const { user } = useAuth();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      Toast.show({
        type: 'success',
        text1: 'Settings Saved',
        text2: 'Your settings have been updated',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultSettings = {
              businessName: 'ConveniPOS',
              businessAddress: '',
              businessPhone: '',
              businessEmail: '',
              taxRate: 8.5,
              taxInclusive: false,
              receiptFooter: 'Thank you for your business!',
              printReceipts: true,
              emailReceipts: false,
              quickCashAmounts: [5, 10, 20, 50, 100],
              roundCashPayments: false,
              lowStockThreshold: 10,
              currency: 'USD',
              dateFormat: 'MM/DD/YYYY',
              timeFormat: '12h',
              requirePinForVoids: false,
              requirePinForDiscounts: false,
              autoLogoutMinutes: 30,
              autoBackup: true,
              backupFrequency: 'daily',
            };
            saveSettings(defaultSettings);
          },
        },
      ]
    );
  };

  const exportSettings = async () => {
    try {
      const settingsJson = JSON.stringify(settings, null, 2);
      const fileName = `ConveniPOS_Settings_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, settingsJson);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Settings',
        });
      }
      
      Toast.show({
        type: 'success',
        text1: 'Settings Exported',
        text2: `Saved as ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting settings:', error);
      Alert.alert('Export Error', 'Failed to export settings');
    }
  };

  const importSettings = () => {
    Alert.alert(
      'Import Settings',
      'This feature allows you to import settings from a backup file. Contact support for assistance with importing settings.',
      [{ text: 'OK' }]
    );
  };

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderTextSetting = (label, key, placeholder, options = {}) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={settings[key]?.toString() || ''}
        onChangeText={(value) => updateSetting(key, value)}
        placeholder={placeholder}
        {...options}
      />
    </View>
  );

  const renderSwitchSetting = (label, key, description) => (
    <View style={styles.settingItem}>
      <View style={styles.switchSettingContent}>
        <View style={styles.switchSettingText}>
          <Text style={styles.settingLabel}>{label}</Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
        <Switch
          value={settings[key]}
          onValueChange={(value) => updateSetting(key, value)}
          trackColor={{ false: COLORS.background, true: COLORS.primary }}
          thumbColor={settings[key] ? 'white' : COLORS.textSecondary}
        />
      </View>
    </View>
  );

  const renderPickerSetting = (label, key, options) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pickerOption,
              settings[key] === option.value && styles.selectedPickerOption
            ]}
            onPress={() => updateSetting(key, option.value)}
          >
            <Text style={[
              styles.pickerOptionText,
              settings[key] === option.value && styles.selectedPickerOptionText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'CAD', label: 'CAD ($)' },
  ];

  const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  ];

  const timeFormatOptions = [
    { value: '12h', label: '12 Hour' },
    { value: '24h', label: '24 Hour' },
  ];

  const backupFrequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={exportSettings}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={importSettings}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetToDefaults}
          >
            <Ionicons name="refresh-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {renderSection('Business Information', [
          renderTextSetting('Business Name', 'businessName', 'Enter business name'),
          renderTextSetting('Address', 'businessAddress', 'Enter business address', { multiline: true }),
          renderTextSetting('Phone', 'businessPhone', 'Enter phone number', { keyboardType: 'phone-pad' }),
          renderTextSetting('Email', 'businessEmail', 'Enter email address', { keyboardType: 'email-address' }),
        ])}

        {renderSection('Tax Settings', [
          renderTextSetting('Tax Rate (%)', 'taxRate', '8.5', { keyboardType: 'decimal-pad' }),
          renderSwitchSetting('Tax Inclusive Pricing', 'taxInclusive', 'Prices include tax'),
        ])}

        {renderSection('Receipt Settings', [
          renderTextSetting('Receipt Footer', 'receiptFooter', 'Thank you message'),
          renderSwitchSetting('Print Receipts', 'printReceipts', 'Automatically print receipts'),
          renderSwitchSetting('Email Receipts', 'emailReceipts', 'Send receipts via email'),
        ])}

        {renderSection('POS Settings', [
          renderSwitchSetting('Round Cash Payments', 'roundCashPayments', 'Round to nearest $0.05'),
          renderTextSetting('Low Stock Threshold', 'lowStockThreshold', '10', { keyboardType: 'numeric' }),
        ])}

        {renderSection('Display Settings', [
          renderPickerSetting('Currency', 'currency', currencyOptions),
          renderPickerSetting('Date Format', 'dateFormat', dateFormatOptions),
          renderPickerSetting('Time Format', 'timeFormat', timeFormatOptions),
        ])}

        {renderSection('Security Settings', [
          renderSwitchSetting('Require PIN for Voids', 'requirePinForVoids', 'Extra security for voiding items'),
          renderSwitchSetting('Require PIN for Discounts', 'requirePinForDiscounts', 'Extra security for discounts'),
          renderTextSetting('Auto Logout (minutes)', 'autoLogoutMinutes', '30', { keyboardType: 'numeric' }),
        ])}

        {renderSection('Backup Settings', [
          renderSwitchSetting('Auto Backup', 'autoBackup', 'Automatically backup data'),
          renderPickerSetting('Backup Frequency', 'backupFrequency', backupFrequencyOptions),
        ])}

        {renderSection('About', [
          <View key="about" style={styles.aboutSection}>
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>User</Text>
              <Text style={styles.aboutValue}>{user?.displayName || user?.email}</Text>
            </View>
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>Role</Text>
              <Text style={styles.aboutValue}>{user?.role || 'cashier'}</Text>
            </View>
          </View>
        ])}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  sectionContent: {
    paddingVertical: 8,
  },
  settingItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  switchSettingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchSettingText: {
    flex: 1,
    marginRight: 16,
  },
  pickerOption: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedPickerOption: {
    backgroundColor: COLORS.primary,
  },
  pickerOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectedPickerOptionText: {
    color: 'white',
  },
  aboutSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  aboutValue: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default SettingsScreen;