import React, { useState } from 'react';
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

import { useCart } from '../context/CartContext';
import { useDatabase } from '../context/DatabaseContext';
import { COLORS, formatCurrency, PAYMENT_METHODS, generateReceiptNumber } from '../utils/Utils';
import { printReceipt, exportReceiptPDF } from '../utils/PrintUtils';

const PaymentScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const cart = useCart();
  const database = useDatabase();

  const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  const remainingAmount = cart.total - totalPaid;
  const changeAmount = totalPaid > cart.total ? totalPaid - cart.total : 0;

  const handleAddPayment = () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    if (amount > remainingAmount && remainingAmount > 0) {
      Alert.alert(
        'Overpayment',
        `Amount exceeds remaining balance of ${formatCurrency(remainingAmount)}. Continue?`,
        [
          { text: 'Cancel' },
          {
            text: 'Continue',
            onPress: () => addPayment(amount),
          },
        ]
      );
    } else {
      addPayment(amount);
    }
  };

  const addPayment = (amount) => {
    const methodName = PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name || selectedMethod;
    
    setPayments([
      ...payments,
      {
        method: selectedMethod,
        methodName,
        amount: amount.toFixed(2),
      },
    ]);

    setPaymentAmount('');
    setSelectedMethod(null);
  };

  const removePayment = (index) => {
    const newPayments = payments.filter((_, i) => i !== index);
    setPayments(newPayments);
  };

  const handleQuickAmount = (amount) => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method first');
      return;
    }

    // Directly add the payment without needing to press "Add" button
    const paymentAmount = amount;
    
    if (paymentAmount > remainingAmount && remainingAmount > 0) {
      Alert.alert(
        'Overpayment',
        `Amount exceeds remaining balance of ${formatCurrency(remainingAmount)}. Continue?`,
        [
          { text: 'Cancel' },
          {
            text: 'Continue',
            onPress: () => addPayment(paymentAmount),
          },
        ]
      );
    } else {
      addPayment(paymentAmount);
    }
  };

  const handleExactCash = () => {
    // Auto-select cash if not selected and directly add payment
    if (selectedMethod !== 'cash') {
      setSelectedMethod('cash');
    }
    
    // Directly add exact cash payment
    addPayment(remainingAmount);
  };

  const processTransaction = async () => {
    if (remainingAmount > 0.01) {
      Alert.alert('Incomplete Payment', 'Please complete the payment before processing');
      return;
    }

    setProcessing(true);

    try {
      const receiptNumber = generateReceiptNumber();
      const transactionData = {
        items: cart.items.map(item => ({
          itemId: item.id,
          itemName: item.name,
          quantity: item.quantity,
          price: item.price,
          tax: 0, // Tax calculated at transaction level
        })),
        payments: payments.map(payment => ({
          method: payment.method,
          amount: payment.amount,
        })),
        subtotal: cart.subtotal.toFixed(2),
        tax: cart.tax.toFixed(2),
        total: cart.total.toFixed(2),
        receiptNumber,
      };

      const transactionId = await database.createTransaction(transactionData);

      // Prepare receipt data
      const receipt = {
        transactionId,
        receiptNumber,
        date: new Date(),
        items: cart.items,
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
        payments,
        change: changeAmount,
      };

      setReceiptData(receipt);
      setShowReceipt(true);

      Toast.show({
        type: 'success',
        text1: 'Transaction Complete',
        text2: `Receipt #${receiptNumber}`,
      });

    } catch (error) {
      console.error('Transaction error:', error);
      Alert.alert('Transaction Failed', 'Failed to process transaction. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!receiptData) return;
    
    try {
      const result = await printReceipt(receiptData);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Receipt Printed',
          text2: 'Receipt has been sent to printer or shared',
        });
      } else {
        Alert.alert('Print Failed', result.error || 'Failed to print receipt');
      }
    } catch (error) {
      Alert.alert('Print Error', 'Failed to print receipt. Please try again.');
    }
  };

  const handleExportReceipt = async () => {
    if (!receiptData) return;
    
    try {
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

  const finishTransaction = () => {
    cart.clearCart();
    setShowReceipt(false);
    navigation.navigate('POSMain');
  };

  const renderPaymentMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodButton,
        selectedMethod === method.id && styles.selectedPaymentMethod,
      ]}
      onPress={() => setSelectedMethod(method.id)}
    >
      <Ionicons name={method.icon} size={24} color={
        selectedMethod === method.id ? 'white' : COLORS.primary
      } />
      <Text style={[
        styles.paymentMethodText,
        selectedMethod === method.id && styles.selectedPaymentMethodText,
      ]}>
        {method.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPayment = (payment, index) => (
    <View key={index} style={styles.paymentItem}>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentMethod}>{payment.methodName}</Text>
        <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
      </View>
      <TouchableOpacity
        style={styles.removePaymentButton}
        onPress={() => removePayment(index)}
      >
        <Ionicons name="close" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  const renderReceipt = () => (
    <Modal
      visible={showReceipt}
      animationType="slide"
      onRequestClose={finishTransaction}
    >
      <View style={styles.receiptContainer}>
        <ScrollView style={styles.receiptScroll}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>RECEIPT</Text>
            <Text style={styles.receiptNumber}>#{receiptData?.receiptNumber}</Text>
            <Text style={styles.receiptDate}>
              {receiptData?.date.toLocaleString()}
            </Text>
          </View>

          <View style={styles.receiptItems}>
            <Text style={styles.receiptSectionTitle}>Items</Text>
            {receiptData?.items.map((item, index) => (
              <View key={index} style={styles.receiptItem}>
                <View style={styles.receiptItemInfo}>
                  <Text style={styles.receiptItemName}>{item.name}</Text>
                  <Text style={styles.receiptItemDetails}>
                    {item.quantity} x {formatCurrency(item.price)}
                  </Text>
                </View>
                <Text style={styles.receiptItemTotal}>
                  {formatCurrency(item.quantity * parseFloat(item.price))}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.receiptTotals}>
            <View style={styles.receiptTotalRow}>
              <Text style={styles.receiptTotalLabel}>Subtotal</Text>
              <Text style={styles.receiptTotalValue}>
                {formatCurrency(receiptData?.subtotal)}
              </Text>
            </View>
            <View style={styles.receiptTotalRow}>
              <Text style={styles.receiptTotalLabel}>Tax</Text>
              <Text style={styles.receiptTotalValue}>
                {formatCurrency(receiptData?.tax)}
              </Text>
            </View>
            <View style={[styles.receiptTotalRow, styles.receiptGrandTotal]}>
              <Text style={styles.receiptGrandTotalLabel}>Total</Text>
              <Text style={styles.receiptGrandTotalValue}>
                {formatCurrency(receiptData?.total)}
              </Text>
            </View>
          </View>

          <View style={styles.receiptPayments}>
            <Text style={styles.receiptSectionTitle}>Payments</Text>
            {receiptData?.payments.map((payment, index) => (
              <View key={index} style={styles.receiptPaymentRow}>
                <Text style={styles.receiptPaymentMethod}>{payment.methodName}</Text>
                <Text style={styles.receiptPaymentAmount}>
                  {formatCurrency(payment.amount)}
                </Text>
              </View>
            ))}
            {receiptData?.change > 0 && (
              <View style={[styles.receiptPaymentRow, styles.receiptChange]}>
                <Text style={styles.receiptChangeLabel}>Change</Text>
                <Text style={styles.receiptChangeAmount}>
                  {formatCurrency(receiptData.change)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.receiptActions}>
          <View style={styles.receiptButtonRow}>
            <TouchableOpacity 
              style={[styles.receiptButton, styles.printButton]} 
              onPress={() => handlePrintReceipt()}
            >
              <Ionicons name="print-outline" size={20} color="white" />
              <Text style={styles.receiptButtonText}>Print</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.receiptButton, styles.exportButton]} 
              onPress={() => handleExportReceipt()}
            >
              <Ionicons name="download-outline" size={20} color="white" />
              <Text style={styles.receiptButtonText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.receiptButton} onPress={finishTransaction}>
            <Text style={styles.receiptButtonText}>New Transaction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (!cart.hasItems()) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No items in cart</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Return to POS</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Transaction Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({cart.itemCount})</Text>
              <Text style={styles.summaryValue}>{cart.getTotalItemsCount()} qty</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(cart.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>{formatCurrency(cart.tax)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(cart.total)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <Text style={styles.paymentMethodLabel}>Choose how customer is paying:</Text>
          <View style={styles.paymentMethods}>
            {PAYMENT_METHODS.map(renderPaymentMethod)}
          </View>
        </View>

        {/* Payment Amount */}
        {selectedMethod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Amount</Text>
            
            {/* Quick Amount Buttons */}
            <Text style={styles.quickAmountLabel}>Tap amount to add payment:</Text>
            <View style={styles.quickAmounts}>
              {[5, 10, 20, 50, 100, remainingAmount].map((amount) => (
                amount > 0 && (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => handleQuickAmount(amount)}
                  >
                    <Text style={styles.quickAmountText}>
                      {formatCurrency(amount)}
                    </Text>
                  </TouchableOpacity>
                )
              ))}
              <TouchableOpacity
                style={[styles.quickAmountButton, styles.exactCashButton]}
                onPress={() => handleExactCash()}
              >
                <Text style={[styles.quickAmountText, styles.exactCashText]}>
                  Exact Cash
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Manual Amount Entry */}
            <Text style={styles.manualAmountLabel}>Or enter custom amount:</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="0.00"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.addPaymentButton}
                onPress={handleAddPayment}
              >
                <Text style={styles.addPaymentButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Applied Payments */}
        {payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Applied Payments</Text>
            {payments.map(renderPayment)}
            
            <View style={styles.paymentSummary}>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Total Paid</Text>
                <Text style={styles.paymentSummaryValue}>{formatCurrency(totalPaid)}</Text>
              </View>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>Remaining</Text>
                <Text style={styles.paymentSummaryValue}>{formatCurrency(remainingAmount)}</Text>
              </View>
              {changeAmount > 0 && (
                <View style={[styles.paymentSummaryRow, styles.changeRow]}>
                  <Text style={styles.changeLabel}>Change</Text>
                  <Text style={styles.changeValue}>{formatCurrency(changeAmount)}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Process Payment Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.processButton,
            (remainingAmount > 0.01 || processing) && styles.processButtonDisabled,
          ]}
          onPress={processTransaction}
          disabled={remainingAmount > 0.01 || processing}
        >
          <Text style={styles.processButtonText}>
            {processing ? 'Processing...' : 'Complete Transaction'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderReceipt()}
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
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  summaryValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentMethodButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethod: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentMethodText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  selectedPaymentMethodText: {
    color: 'white',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'right',
  },
  addPaymentButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  addPaymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickAmountLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickAmountButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  exactCashButton: {
    backgroundColor: COLORS.success,
    minWidth: 100,
  },
  exactCashText: {
    color: 'white',
  },
  manualAmountLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  paymentAmount: {
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 2,
  },
  removePaymentButton: {
    padding: 8,
  },
  paymentSummary: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentSummaryLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  paymentSummaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  changeRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 8,
    marginTop: 8,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  changeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  processButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 8,
  },
  processButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  processButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Receipt styles
  receiptContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  receiptScroll: {
    flex: 1,
    padding: 20,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  receiptNumber: {
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 4,
  },
  receiptDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  receiptItems: {
    marginBottom: 24,
  },
  receiptSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  receiptItemInfo: {
    flex: 1,
  },
  receiptItemName: {
    fontSize: 16,
    color: COLORS.text,
  },
  receiptItemDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  receiptItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  receiptTotals: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptTotalLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  receiptTotalValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  receiptGrandTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 8,
    marginTop: 8,
  },
  receiptGrandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  receiptGrandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  receiptPayments: {
    marginBottom: 24,
  },
  receiptPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptPaymentMethod: {
    fontSize: 16,
    color: COLORS.text,
  },
  receiptPaymentAmount: {
    fontSize: 16,
    color: COLORS.text,
  },
  receiptChange: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 8,
    marginTop: 8,
  },
  receiptChangeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  receiptChangeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  receiptActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  receiptButtonRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  receiptButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  printButton: {
    backgroundColor: COLORS.success,
    flex: 1,
  },
  exportButton: {
    backgroundColor: COLORS.accent,
    flex: 1,
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 8,
  },
});

export default PaymentScreen;