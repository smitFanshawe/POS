import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { formatCurrency, formatDate } from './Utils';

// Generate HTML for receipt
export const generateReceiptHTML = (receiptData) => {
  const { 
    receiptNumber, 
    date, 
    items, 
    subtotal, 
    tax, 
    total, 
    payments, 
    change 
  } = receiptData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt ${receiptNumber}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          margin: 0;
          padding: 20px;
          max-width: 300px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .store-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .receipt-info {
          margin-bottom: 15px;
          font-size: 11px;
        }
        .items {
          border-bottom: 1px solid #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .item-name {
          flex: 1;
          margin-right: 10px;
        }
        .item-qty-price {
          text-align: right;
          min-width: 80px;
        }
        .totals {
          margin-bottom: 15px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .grand-total {
          font-weight: bold;
          font-size: 14px;
          border-top: 1px solid #000;
          padding-top: 5px;
        }
        .payments {
          margin-bottom: 15px;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .change {
          font-weight: bold;
          border-top: 1px solid #000;
          padding-top: 5px;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          margin-top: 20px;
          border-top: 1px solid #000;
          padding-top: 10px;
        }
        @media print {
          body { margin: 0; padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="store-name">ConveniPOS</div>
        <div>Point of Sale System</div>
      </div>
      
      <div class="receipt-info">
        <div>Receipt #: ${receiptNumber}</div>
        <div>Date: ${formatDate(date)}</div>
      </div>
      
      <div class="items">
        ${items.map(item => `
          <div class="item">
            <div class="item-name">${item.name}</div>
            <div class="item-qty-price">${item.quantity}x ${formatCurrency(item.price)}</div>
          </div>
          <div class="item">
            <div></div>
            <div class="item-qty-price">${formatCurrency(item.quantity * parseFloat(item.price))}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="total-row">
          <span>Tax:</span>
          <span>${formatCurrency(tax)}</span>
        </div>
        <div class="total-row grand-total">
          <span>Total:</span>
          <span>${formatCurrency(total)}</span>
        </div>
      </div>
      
      <div class="payments">
        <div style="font-weight: bold; margin-bottom: 5px;">Payment:</div>
        ${payments.map(payment => `
          <div class="payment-row">
            <span>${payment.methodName}:</span>
            <span>${formatCurrency(payment.amount)}</span>
          </div>
        `).join('')}
        ${change > 0 ? `
          <div class="payment-row change">
            <span>Change:</span>
            <span>${formatCurrency(change)}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="footer">
        <div>Thank you for your business!</div>
        <div>Powered by ConveniPOS</div>
      </div>
    </body>
    </html>
  `;
};

// Generate HTML for sales report
export const generateSalesReportHTML = (reportData, period) => {
  const { 
    total_sales, 
    transaction_count, 
    avg_transaction, 
    total_tax,
    payment_methods,
    top_items 
  } = reportData;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sales Report - ${period}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #2196F3;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #2196F3;
          margin-bottom: 5px;
        }
        .report-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .report-period {
          font-size: 14px;
          color: #666;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #2196F3;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .metric-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .metric-value {
          font-size: 20px;
          font-weight: bold;
          color: #2196F3;
          margin-bottom: 5px;
        }
        .metric-label {
          font-size: 12px;
          color: #666;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .table th,
        .table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 30px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .metrics-grid { grid-template-columns: 1fr 1fr 1fr 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">ConveniPOS</div>
        <div class="report-title">Sales Report</div>
        <div class="report-period">${period.charAt(0).toUpperCase() + period.slice(1)} Report</div>
        <div class="report-period">Generated: ${formatDate(new Date())}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Sales Overview</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${formatCurrency(total_sales)}</div>
            <div class="metric-label">Total Sales</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${transaction_count}</div>
            <div class="metric-label">Transactions</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${formatCurrency(avg_transaction)}</div>
            <div class="metric-label">Avg Transaction</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${formatCurrency(total_tax)}</div>
            <div class="metric-label">Total Tax</div>
          </div>
        </div>
      </div>
      
      ${payment_methods && payment_methods.length > 0 ? `
        <div class="section">
          <div class="section-title">Payment Methods</div>
          <table class="table">
            <thead>
              <tr>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              ${payment_methods.map(payment => `
                <tr>
                  <td>${payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}</td>
                  <td>${formatCurrency(payment.total_amount)}</td>
                  <td>${payment.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      ${top_items && top_items.length > 0 ? `
        <div class="section">
          <div class="section-title">Top Selling Items</div>
          <table class="table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${top_items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.total_quantity}</td>
                  <td>${formatCurrency(item.total_revenue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <div class="footer">
        <div>This report was generated by ConveniPOS</div>
        <div>For support, contact: support@convenipos.com</div>
      </div>
    </body>
    </html>
  `;
};

// Print receipt
export const printReceipt = async (receiptData) => {
  try {
    const html = generateReceiptHTML(receiptData);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Print or Share Receipt',
        UTI: 'com.adobe.pdf',
      });
    } else {
      // Fallback: try to print directly
      await Print.printAsync({
        html,
      });
    }
    
    return { success: true, uri };
  } catch (error) {
    console.error('Print receipt error:', error);
    return { success: false, error: error.message };
  }
};

// Export receipt as PDF
export const exportReceiptPDF = async (receiptData) => {
  try {
    const html = generateReceiptHTML(receiptData);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Create a more descriptive filename
    const fileName = `Receipt_${receiptData.receiptNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Move file to documents directory
    await FileSystem.moveAsync({
      from: uri,
      to: fileUri,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Receipt PDF',
        UTI: 'com.adobe.pdf',
      });
    }
    
    return { success: true, uri: fileUri, fileName };
  } catch (error) {
    console.error('Export receipt PDF error:', error);
    return { success: false, error: error.message };
  }
};

// Print sales report
export const printSalesReport = async (reportData, period) => {
  try {
    const html = generateSalesReportHTML(reportData, period);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Print or Share Sales Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      // Fallback: try to print directly
      await Print.printAsync({
        html,
      });
    }
    
    return { success: true, uri };
  } catch (error) {
    console.error('Print sales report error:', error);
    return { success: false, error: error.message };
  }
};

// Export sales report as PDF
export const exportSalesReportPDF = async (reportData, period) => {
  try {
    const html = generateSalesReportHTML(reportData, period);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Create a more descriptive filename
    const fileName = `SalesReport_${period}_${new Date().toISOString().split('T')[0]}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Move file to documents directory
    await FileSystem.moveAsync({
      from: uri,
      to: fileUri,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Sales Report PDF',
        UTI: 'com.adobe.pdf',
      });
    }
    
    return { success: true, uri: fileUri, fileName };
  } catch (error) {
    console.error('Export sales report PDF error:', error);
    return { success: false, error: error.message };
  }
};

// Generate inventory report HTML
export const generateInventoryReportHTML = (items, categories) => {
  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const lowStockItems = items.filter(item => item.stock <= item.minStock);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Inventory Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #2196F3;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #2196F3;
          margin-bottom: 5px;
        }
        .report-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #2196F3;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .metric-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .metric-value {
          font-size: 20px;
          font-weight: bold;
          color: #2196F3;
          margin-bottom: 5px;
        }
        .metric-label {
          font-size: 12px;
          color: #666;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 11px;
        }
        .table th,
        .table td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: left;
        }
        .table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .low-stock {
          background-color: #fff3cd;
        }
        .out-of-stock {
          background-color: #f8d7da;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 30px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        @media print {
          body { margin: 0; padding: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">ConveniPOS</div>
        <div class="report-title">Inventory Report</div>
        <div>Generated: ${formatDate(new Date())}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Inventory Overview</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${totalItems}</div>
            <div class="metric-label">Total Items</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${lowStockItems.length}</div>
            <div class="metric-label">Low Stock Items</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${formatCurrency(totalValue)}</div>
            <div class="metric-label">Total Value</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">All Items</div>
        <table class="table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Min Stock</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => {
              const isLowStock = item.stock <= item.minStock;
              const isOutOfStock = item.stock === 0;
              const rowClass = isOutOfStock ? 'out-of-stock' : (isLowStock ? 'low-stock' : '');
              const status = isOutOfStock ? 'Out of Stock' : (isLowStock ? 'Low Stock' : 'In Stock');
              
              return `
                <tr class="${rowClass}">
                  <td>${item.name}</td>
                  <td>${item.sku}</td>
                  <td>${item.categoryName || 'No Category'}</td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${item.stock}</td>
                  <td>${item.minStock}</td>
                  <td>${formatCurrency(item.price * item.stock)}</td>
                  <td>${status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      ${lowStockItems.length > 0 ? `
        <div class="section">
          <div class="section-title">Low Stock Alert</div>
          <table class="table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Current Stock</th>
                <th>Min Stock</th>
                <th>Reorder Needed</th>
              </tr>
            </thead>
            <tbody>
              ${lowStockItems.map(item => `
                <tr class="${item.stock === 0 ? 'out-of-stock' : 'low-stock'}">
                  <td>${item.name}</td>
                  <td>${item.stock}</td>
                  <td>${item.minStock}</td>
                  <td>${Math.max(0, item.minStock - item.stock + 10)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <div class="footer">
        <div>This report was generated by ConveniPOS</div>
        <div>For support, contact: support@convenipos.com</div>
      </div>
    </body>
    </html>
  `;
};

// Export inventory report as PDF
export const exportInventoryReportPDF = async (items, categories) => {
  try {
    const html = generateInventoryReportHTML(items, categories);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Create a more descriptive filename
    const fileName = `InventoryReport_${new Date().toISOString().split('T')[0]}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Move file to documents directory
    await FileSystem.moveAsync({
      from: uri,
      to: fileUri,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Inventory Report PDF',
        UTI: 'com.adobe.pdf',
      });
    }
    
    return { success: true, uri: fileUri, fileName };
  } catch (error) {
    console.error('Export inventory report PDF error:', error);
    return { success: false, error: error.message };
  }
};