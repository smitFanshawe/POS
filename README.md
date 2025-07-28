# 🏪 ConveniPOS - Complete React Native POS System

A professional, cloud-powered Point of Sale system built with React Native, Expo, and Firebase.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Scan QR code with Expo Go app or press 'i' for iOS simulator
```

## ✨ Features

### 💰 **Complete POS System**
- ✅ Real-time cart with automatic tax calculation
- ✅ Quick cash payment buttons ($5, $10, $20, $50, $100)
- ✅ Exact cash payment option
- ✅ Multiple payment methods (Cash, Visa, MasterCard, AMEX, Debit)
- ✅ Split payments (cash + card)
- ✅ Discount system (percentage & fixed amount)
- ✅ Receipt generation with print/PDF export

### 📦 **Inventory Management**
- ✅ Add/edit items with barcode scanning
- ✅ Stock tracking and low stock alerts
- ✅ Category organization
- ✅ Search and filter capabilities
- ✅ Inventory reports with PDF export

### 📊 **Sales Analytics**
- ✅ Daily, weekly, monthly sales reports
- ✅ Payment method breakdown
- ✅ Top selling items analysis
- ✅ Transaction history
- ✅ Report printing and PDF export

### 🔐 **User Management**
- ✅ Firebase authentication (login/signup)
- ✅ User profiles and settings
- ✅ Multi-user support with data isolation
- ✅ Password reset functionality

### ☁️ **Cloud Integration**
- ✅ Firebase Firestore database
- ✅ Real-time data synchronization
- ✅ Offline support
- ✅ Multi-device access

### 📱 **Mobile Optimized**
- ✅ Touch-friendly interface
- ✅ Responsive design for phones and tablets
- ✅ Camera barcode scanning
- ✅ Bottom tab navigation

## 📁 Project Structure

```
ConveniPOS/
├── App.js                     # Main app with navigation
├── app.json                   # Expo configuration
├── package.json               # Dependencies
├── babel.config.js            # Babel configuration
├── metro.config.js            # Metro bundler config
├── assets/                    # App icons and images
└── src/
    ├── components/
    │   └── BarcodeScanner.js  # Camera barcode scanning
    ├── context/
    │   ├── AuthContext.js     # Authentication state
    │   ├── CartContext.js     # Shopping cart state
    │   └── DatabaseContext.js # Firebase database operations
    ├── screens/
    │   ├── LoginScreen.js     # User authentication
    │   ├── SignupScreen.js    # User registration
    │   ├── ProfileScreen.js   # User profile management
    │   ├── POSScreen.js       # Main point of sale
    │   ├── PaymentScreen.js   # Payment processing
    │   ├── InventoryScreen.js # Inventory management
    │   ├── AddItemScreen.js   # Add/edit items
    │   └── ReportsScreen.js   # Sales analytics
    ├── utils/
    │   ├── Utils.js           # Utility functions
    │   └── PrintUtils.js      # Print/PDF export functions
    └── config/
        └── firebase.js        # Firebase configuration
```

## 🔧 Setup Instructions

### 1. Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Update `src/config/firebase.js` with your config
5. Create required indexes (see `FIREBASE_INDEXES_SETUP.md`)

### 2. Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### 3. Production Build
```bash
# Build for production
expo build:android  # For Android
expo build:ios      # For iOS
```

## 📚 Documentation

- `FIREBASE_SETUP_GUIDE.md` - Complete Firebase setup instructions
- `FIREBASE_DATA_STRUCTURE.md` - Database schema and collections
- `FIREBASE_INDEXES_SETUP.md` - Required database indexes
- `COMPLETE_FEATURES_LIST.md` - Detailed feature list
- `PROJECT_SETUP_GUIDE.md` - Original project setup guide

## 🎯 Usage

### For Cashiers
1. **Login** with your account
2. **Add items** by searching, scanning barcodes, or quick-add buttons
3. **Apply discounts** if needed
4. **Process payment** using cash, cards, or split payments
5. **Print receipt** or export as PDF

### For Managers
1. **Manage inventory** - Add/edit items, track stock
2. **View reports** - Sales analytics, payment breakdowns
3. **Export data** - Print or save reports as PDF
4. **Monitor performance** - Real-time sales dashboard

## 🛠️ Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Navigation**: React Navigation
- **State Management**: React Context
- **Styling**: React Native StyleSheet
- **Print/PDF**: Expo Print & Sharing
- **Camera**: Expo Camera & Barcode Scanner

## 📱 Supported Platforms

- ✅ iOS (iPhone & iPad)
- ✅ Android (Phone & Tablet)
- ✅ Web (via Expo Web)

## 🔒 Security Features

- Firebase Authentication with email/password
- User data isolation (each user sees only their data)
- Secure API calls with authentication tokens
- Firestore security rules for data protection

## 🎉 Ready for Business!

This POS system is production-ready and includes everything needed for retail operations:
- Complete transaction processing
- Inventory management
- Sales reporting
- User management
- Cloud synchronization
- Print/export capabilities

Perfect for convenience stores, small retail shops, cafes, and other businesses needing a modern POS solution.

---

**Built with ❤️ using React Native, Expo, and Firebase**