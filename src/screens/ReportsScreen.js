import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

import { useDatabase } from '../context/DatabaseContext';
import { COLORS, formatCurrency, formatDate } from '../utils/Utils';
import { printSalesReport, exportSalesReportPDF, printReceipt, exportReceiptPDF } from '../utils/PrintUtils';

const { width: screenWidth } = Dimensions.get('window');

const ReportsScreen = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [salesReport, setSalesReport] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [showCharts, setShowCharts] = useState(false);
  const [showChartsDropdown, setShowChartsDropdown] = useState(false);

  const database = useDatabase();

  useEffect(() => {
    if (database.isReady) {
      loadReportData();
    }
  }, [database.isReady, selectedPeriod]);

  const loadReportData = async (startDate = null, endDate = null) => {
    try {
      setLoading(true);
      
      let reportData, transactionsData, chartDataResult;
      
      if (startDate && endDate) {
        // Custom date range
        [reportData, transactionsData, chartDataResult] = await Promise.all([
          database.getSalesReportByDateRange(startDate, endDate),
          database.getTransactionsByDateRange(startDate, endDate),
          database.getChartData(startDate, endDate),
        ]);
      } else {
        // Standard periods
        [reportData, transactionsData, chartDataResult] = await Promise.all([
          database.getSalesReport(selectedPeriod),
          selectedPeriod === 'today' 
            ? database.getTodaysTransactions()
            : database.getTransactions(50),
          database.getChartData(selectedPeriod),
        ]);
      }

      setSalesReport(reportData);
      setTransactions(transactionsData);
      setChartData(chartDataResult);
    } catch (error) {
      console.error('Error loading report data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load report data',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const handlePrintReport = async () => {
    if (!salesReport) {
      Alert.alert('No Data', 'No report data available to print');
      return;
    }
    
    try {
      const result = await printSalesReport(salesReport, selectedPeriod);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Report Printed',
          text2: 'Sales report has been sent to printer or shared',
        });
      } else {
        Alert.alert('Print Failed', result.error || 'Failed to print report');
      }
    } catch (error) {
      Alert.alert('Print Error', 'Failed to print report. Please try again.');
    }
  };

  const handleExportReport = async () => {
    if (!salesReport) {
      Alert.alert('No Data', 'No report data available to export');
      return;
    }
    
    try {
      const result = await exportSalesReportPDF(salesReport, selectedPeriod);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Report Exported',
          text2: `Saved as ${result.fileName}`,
        });
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export report');
      }
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export report. Please try again.');
    }
  };

  const handleCustomDateRange = () => {
    setShowDatePicker(true);
  };

  const applyCustomDateRange = async () => {
    if (!customStartDate || !customEndDate) {
      Alert.alert('Error', 'Please enter both start and end dates (YYYY-MM-DD format)');
      return;
    }

    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      Alert.alert('Error', 'Please enter valid dates in YYYY-MM-DD format');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }

    setSelectedPeriod('custom');
    setShowDatePicker(false);
    await loadReportData(startDate, endDate);
    
    Toast.show({
      type: 'success',
      text1: 'Custom Report Generated',
      text2: `${formatDate(startDate)} to ${formatDate(endDate)}`,
    });
  };

  const handleTransactionDetail = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetail(true);
  };

  const handleReprintReceipt = async (transaction) => {
    try {
      const receiptData = {
        receiptNumber: transaction.receipt_number || transaction.id,
        date: transaction.createdAt ? transaction.createdAt.toDate() : new Date(),
        items: transaction.items || [],
        subtotal: transaction.subtotal || 0,
        tax: transaction.tax || 0,
        total: transaction.total || 0,
        payments: transaction.payments || [],
        change: transaction.change || 0,
      };

      const result = await printReceipt(receiptData);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Receipt Reprinted',
          text2: 'Receipt has been sent to printer or shared',
        });
      } else {
        Alert.alert('Print Failed', result.error || 'Failed to reprint receipt');
      }
    } catch (error) {
      Alert.alert('Print Error', 'Failed to reprint receipt. Please try again.');
    }
  };

  const handleExportReceiptPDF = async (transaction) => {
    try {
      const receiptData = {
        receiptNumber: transaction.receipt_number || transaction.id,
        date: transaction.createdAt ? transaction.createdAt.toDate() : new Date(),
        items: transaction.items || [],
        subtotal: transaction.subtotal || 0,
        tax: transaction.tax || 0,
        total: transaction.total || 0,
        payments: transaction.payments || [],
        change: transaction.change || 0,
      };

      const result = await exportReceiptPDF(receiptData);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Receipt Exported',
          text2: `Saved as ${result.fileName}`,
        });
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export receipt');
      }
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export receipt. Please try again.');
    }
  };

  const handleEmailReport = async () => {
    if (!salesReport) {
      Alert.alert('No Data', 'No report data available to email');
      return;
    }
    
    Alert.alert(
      'Email Report',
      'Email reporting feature will be available in a future update. For now, you can export the report and share it manually.',
      [{ text: 'OK' }]
    );
  };

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: '3months', label: '3M' },
    { id: '6months', label: '6M' },
    { id: 'year', label: '1Y' },
    { id: 'custom', label: 'Custom' },
  ];

  const renderPeriodSelector = () => (
    <View style={styles.periodSelectorContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodSelector}>
        {periods.map(period => (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodButton,
              selectedPeriod === period.id && styles.activePeriodButton,
            ]}
            onPress={() => {
              if (period.id === 'custom') {
                handleCustomDateRange();
              } else {
                setSelectedPeriod(period.id);
              }
            }}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period.id && styles.activePeriodButtonText,
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Charts Dropdown */}
      <View style={styles.chartsDropdownContainer}>
        <TouchableOpacity
          style={styles.chartsDropdownButton}
          onPress={() => setShowChartsDropdown(!showChartsDropdown)}
        >
          <Ionicons name="bar-chart-outline" size={16} color={COLORS.primary} />
          <Text style={styles.chartsDropdownText}>Charts</Text>
          <Ionicons 
            name={showChartsDropdown ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
        
        {showChartsDropdown && (
          <View style={styles.chartsDropdownMenu}>
            <TouchableOpacity
              style={styles.chartsDropdownItem}
              onPress={() => {
                setShowCharts(!showCharts);
                setShowChartsDropdown(false);
              }}
            >
              <Ionicons 
                name={showCharts ? "eye-off-outline" : "eye-outline"} 
                size={16} 
                color={COLORS.text} 
              />
              <Text style={styles.chartsDropdownItemText}>
                {showCharts ? 'Hide Charts' : 'Show Charts'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderSalesChart = () => {
    if (!showCharts) return null;

    if (!chartData?.salesTrend?.length) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales Trend</Text>
          <View style={styles.noDataContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.noDataText}>No sales data available for this period</Text>
            <Text style={styles.noDataSubtext}>Make some sales to see the trend chart</Text>
          </View>
        </View>
      );
    }

    const data = {
      labels: chartData.salesTrend.map(item => item.label),
      datasets: [{
        data: chartData.salesTrend.map(item => item.value),
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 3,
      }],
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sales Trend</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={data}
            width={Math.max(screenWidth - 64, chartData.salesTrend.length * 60)}
            height={220}
            chartConfig={{
              backgroundColor: COLORS.surface,
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: COLORS.primary,
              },
            }}
            bezier
            style={styles.chart}
          />
        </ScrollView>
      </View>
    );
  };

  const renderPaymentMethodsChart = () => {
    if (!showCharts) return null;
    
    if (!salesReport?.payment_methods?.length) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods Distribution</Text>
          <View style={styles.noDataContainer}>
            <Ionicons name="pie-chart-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.noDataText}>No payment data available</Text>
            <Text style={styles.noDataSubtext}>Process transactions to see payment distribution</Text>
          </View>
        </View>
      );
    }

    const data = salesReport.payment_methods.map((payment, index) => ({
      name: payment.method.charAt(0).toUpperCase() + payment.method.slice(1),
      amount: payment.total_amount,
      color: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.error, COLORS.accent][index % 5],
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    }));

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods Distribution</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <PieChart
            data={data}
            width={screenWidth - 64}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 10]}
            absolute
          />
        </ScrollView>
      </View>
    );
  };

  const renderTopItemsChart = () => {
    if (!showCharts) return null;
    
    if (!salesReport?.top_items?.length) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Items (Quantity Sold)</Text>
          <View style={styles.noDataContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.noDataText}>No top items data available</Text>
            <Text style={styles.noDataSubtext}>Sell items to see top performers</Text>
          </View>
        </View>
      );
    }

    const data = {
      labels: salesReport.top_items.slice(0, 5).map(item => 
        item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name
      ),
      datasets: [{
        data: salesReport.top_items.slice(0, 5).map(item => item.total_quantity),
      }],
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Items (Quantity Sold)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={data}
            width={Math.max(screenWidth - 64, data.labels.length * 80)}
            height={220}
            chartConfig={{
              backgroundColor: COLORS.surface,
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
            }}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </ScrollView>
      </View>
    );
  };

  const renderMetricCard = (title, value, icon, color = COLORS.primary) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );

  const renderSalesOverview = () => {
    if (!salesReport) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sales Overview</Text>
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Sales',
            formatCurrency(salesReport.total_sales),
            'cash-outline',
            COLORS.success
          )}
          {renderMetricCard(
            'Transactions',
            salesReport.transaction_count.toString(),
            'receipt-outline',
            COLORS.primary
          )}
          {renderMetricCard(
            'Avg Transaction',
            formatCurrency(salesReport.avg_transaction),
            'trending-up-outline',
            COLORS.accent
          )}
          {renderMetricCard(
            'Total Tax',
            formatCurrency(salesReport.total_tax),
            'calculator-outline',
            COLORS.warning
          )}
        </View>
      </View>
    );
  };

  const renderPaymentMethods = () => {
    if (!salesReport?.payment_methods?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.paymentMethods}>
          {salesReport.payment_methods.map((payment, index) => (
            <View key={index} style={styles.paymentMethodItem}>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>
                  {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}
                </Text>
                <Text style={styles.paymentMethodCount}>
                  {payment.count} transaction{payment.count !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.paymentMethodAmount}>
                <Text style={styles.paymentMethodValue}>
                  {formatCurrency(payment.total_amount)}
                </Text>
                <View style={styles.paymentMethodBar}>
                  <View 
                    style={[
                      styles.paymentMethodBarFill,
                      { 
                        width: `${(payment.total_amount / parseFloat(salesReport.total_sales)) * 100}%`,
                        backgroundColor: COLORS.primary,
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTopItems = () => {
    if (!salesReport?.top_items?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Selling Items</Text>
        <View style={styles.topItems}>
          {salesReport.top_items.map((item, index) => (
            <View key={index} style={styles.topItem}>
              <View style={styles.topItemRank}>
                <Text style={styles.topItemRankText}>{index + 1}</Text>
              </View>
              <View style={styles.topItemInfo}>
                <Text style={styles.topItemName}>{item.name}</Text>
                <Text style={styles.topItemQuantity}>
                  {item.total_quantity} units sold
                </Text>
              </View>
              <View style={styles.topItemRevenue}>
                <Text style={styles.topItemRevenueText}>
                  {formatCurrency(item.total_revenue)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRecentTransactions = () => {
    if (!transactions.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions ({transactions.length})</Text>
        <View style={styles.transactions}>
          {transactions.slice(0, 20).map((transaction, index) => (
            <TouchableOpacity
              key={transaction.id}
              style={styles.transactionItem}
              onPress={() => handleTransactionDetail(transaction)}
            >
              <View style={styles.transactionInfo}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionId}>
                    #{transaction.receipt_number || transaction.id}
                  </Text>
                  <View style={styles.transactionActions}>
                    <TouchableOpacity
                      style={styles.transactionActionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleReprintReceipt(transaction);
                      }}
                    >
                      <Ionicons name="print-outline" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.transactionActionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleExportReceiptPDF(transaction);
                      }}
                    >
                      <Ionicons name="download-outline" size={16} color={COLORS.success} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.transactionDate}>
                  {transaction.createdAt ? formatDate(transaction.createdAt.toDate()) : 'Unknown date'}
                </Text>
                <Text style={styles.transactionItems}>
                  {transaction.items_summary || `${transaction.items?.length || 0} items`}
                </Text>
                <Text style={styles.transactionPayments}>
                  {transaction.payments_summary || 'Payment info unavailable'}
                </Text>
              </View>
              <View style={styles.transactionAmount}>
                <Text style={styles.transactionTotal}>
                  {formatCurrency(transaction.total)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderTransactionDetailModal = () => {
    if (!selectedTransaction) return null;

    return (
      <Modal
        visible={showTransactionDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTransactionDetail(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTransactionDetail(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Transaction #{selectedTransaction.receipt_number || selectedTransaction.id}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => handleReprintReceipt(selectedTransaction)}
              >
                <Ionicons name="print-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => handleExportReceiptPDF(selectedTransaction)}
              >
                <Ionicons name="download-outline" size={20} color={COLORS.success} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.transactionDetail}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Transaction Info</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Receipt Number:</Text>
                  <Text style={styles.detailValue}>#{selectedTransaction.receipt_number || selectedTransaction.id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time:</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.createdAt ? formatDate(selectedTransaction.createdAt.toDate()) : 'Unknown'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cashier:</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.cashier || 'Unknown'}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Items ({selectedTransaction.items?.length || 0})</Text>
                {selectedTransaction.items?.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDetails}>
                        {item.quantity} × {formatCurrency(item.price)}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatCurrency(item.quantity * parseFloat(item.price))}
                    </Text>
                  </View>
                )) || (
                  <Text style={styles.noItemsText}>No item details available</Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Payment Summary</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Subtotal:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedTransaction.subtotal || 0)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tax:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedTransaction.tax || 0)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Discount:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedTransaction.discount || 0)}</Text>
                </View>
                <View style={[styles.detailRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(selectedTransaction.total)}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Payment Methods</Text>
                {selectedTransaction.payments?.map((payment, index) => (
                  <View key={index} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {payment.method?.charAt(0).toUpperCase() + payment.method?.slice(1) || 'Unknown'}:
                    </Text>
                    <Text style={styles.detailValue}>{formatCurrency(payment.amount)}</Text>
                  </View>
                )) || (
                  <Text style={styles.noItemsText}>No payment details available</Text>
                )}
                {selectedTransaction.change > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Change Given:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedTransaction.change)}</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDatePicker(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Custom Date Range</Text>
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={applyCustomDateRange}
          >
            <Text style={styles.modalSaveText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={styles.datePickerForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.dateInput}
                value={customStartDate}
                onChangeText={setCustomStartDate}
                placeholder="2024-01-01"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.dateInput}
                value={customEndDate}
                onChangeText={setCustomEndDate}
                placeholder="2024-12-31"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.quickDateButtons}>
              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                  setCustomStartDate(lastMonth.toISOString().split('T')[0]);
                  setCustomEndDate(today.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.quickDateButtonText}>Last 30 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const today = new Date();
                  const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
                  setCustomStartDate(lastYear.toISOString().split('T')[0]);
                  setCustomEndDate(today.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.quickDateButtonText}>Last Year</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales Reports</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowCharts(!showCharts)}
          >
            <Ionicons name="bar-chart-outline" size={20} color={showCharts ? COLORS.success : COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => handleCustomDateRange()}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => handleEmailReport()}
          >
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => handlePrintReport()}
          >
            <Ionicons name="print-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => handleExportReport()}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {renderPeriodSelector()}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onTouchStart={() => setShowChartsDropdown(false)}
      >
        {renderSalesOverview()}
        {renderSalesChart()}
        {renderPaymentMethodsChart()}
        {renderTopItemsChart()}
        {renderPaymentMethods()}
        {renderTopItems()}
        {renderRecentTransactions()}
      </ScrollView>

      {/* Dropdown overlay */}
      {showChartsDropdown && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowChartsDropdown(false)}
        />
      )}

      {renderTransactionDetailModal()}
      {renderDatePickerModal()}
    </SafeAreaView>
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
  periodSelectorContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 1,
  },
  periodSelector: {
    flex: 1,
    marginRight: 12,
  },
  periodButton: {
    backgroundColor: COLORS.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 6,
    minWidth: 50,
  },
  activePeriodButton: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  activePeriodButtonText: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  paymentMethods: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  paymentMethodCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  paymentMethodAmount: {
    alignItems: 'flex-end',
    flex: 1,
  },
  paymentMethodValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentMethodBar: {
    width: 100,
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
  },
  paymentMethodBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  topItems: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  topItemRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topItemRankText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topItemInfo: {
    flex: 1,
  },
  topItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  topItemQuantity: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  topItemRevenue: {
    alignItems: 'flex-end',
  },
  topItemRevenueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  transactions: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionItems: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  transactionPayments: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  // Charts dropdown styles
  chartsDropdownContainer: {
    position: 'relative',
    zIndex: 1001,
  },
  chartsDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  chartsDropdownText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  chartsDropdownMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 1002,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  chartsDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chartsDropdownItemText: {
    fontSize: 12,
    color: COLORS.text,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  // Transaction detail styles
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  transactionActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  // Transaction detail styles
  transactionDetail: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  noItemsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  // Date picker styles
  datePickerForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  quickDateButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  quickDateButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  quickDateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ReportsScreen;