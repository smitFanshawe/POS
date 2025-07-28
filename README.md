# ConveniPOS - Point of Sale System

A modern, feature-rich Point of Sale (POS) system built with React Native and Expo, designed for convenience stores and small retail businesses.

## 🚀 Features

### 📱 Core Functionality
- **Point of Sale Interface**: Intuitive product selection and checkout process
- **Inventory Management**: Add, edit, and track product inventory
- **Payment Processing**: Support for multiple payment methods (Cash, Card)
- **Receipt Generation**: Digital receipt creation and sharing
- **Barcode Scanning**: Quick product lookup using device camera
- **Sales Reports**: Comprehensive sales analytics and reporting

### 🔐 Authentication & User Management
- **User Registration & Login**: Secure Firebase authentication
- **User Profiles**: Customizable user profiles with role management
- **Multi-user Support**: Support for multiple cashiers/users

### 📊 Business Intelligence
- **Real-time Analytics**: Live sales tracking and performance metrics
- **Transaction History**: Complete transaction logs with search functionality
- **Low Stock Alerts**: Automatic notifications for inventory management
- **Sales Reports**: Daily, weekly, and monthly sales summaries

### 🎨 User Experience
- **Modern UI/UX**: Clean, intuitive interface with smooth animations
- **Responsive Design**: Optimized for tablets and mobile devices
- **Dark/Light Theme**: Customizable appearance
- **Offline Support**: Basic functionality works without internet connection

## 🛠️ Technology Stack

- **Frontend**: React Native with Expo
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Navigation**: React Navigation 6
- **State Management**: React Context API
- **UI Components**: Custom components with Expo Vector Icons
- **Charts**: React Native Chart Kit
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **Storage**: AsyncStorage for local data

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

### Required Software
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Package manager (comes with Node.js)
- **Expo CLI** - For running the development server
- **Git** - Version control system

### Development Environment
Choose one of the following:

#### For iOS Development:
- **Xcode** (macOS only) - For iOS simulator
- **iOS Simulator** - Comes with Xcode

#### For Android Development:
- **Android Studio** - For Android emulator
- **Android SDK** - Comes with Android Studio

#### For Physical Device Testing:
- **Expo Go App** - Install from App Store/Google Play Store

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/smitFanshawe/POS.git
cd POS
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Install Expo CLI (if not already installed)
```bash
npm install -g @expo/cli
```

### 4. Firebase Configuration
The app uses Firebase for backend services. The configuration is already set up, but you may need to:

1. **Enable Authentication** in your Firebase Console
2. **Set up Firestore Database** with the following collections:
   - `users` - User profiles
   - `categories` - Product categories
   - `items` - Product inventory
   - `transactions` - Sales transactions
   - `transactionItems` - Transaction line items
   - `payments` - Payment records

3. **Configure Firestore Security Rules** (see Firebase Setup section below)

### 5. Start the Development Server
```bash
npm start
# or
expo start
```

### 6. Run on Device/Simulator
- **iOS Simulator**: Press `i` in the terminal or scan QR code with Camera app
- **Android Emulator**: Press `a` in the terminal or scan QR code with Expo Go
- **Physical Device**: Install Expo Go app and scan the QR code

## 🔥 Firebase Setup

### Firestore Security Rules
To fix permission errors, update your Firestore security rules:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database → Rules
4. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own data
    match /{collection}/{document} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### Authentication Setup
1. Enable **Email/Password** authentication in Firebase Console
2. Configure authorized domains if needed
3. Set up password requirements

## 📦 Key Dependencies

### Core Dependencies
```json
{
  "@expo/vector-icons": "^14.0.2",
  "@react-native-async-storage/async-storage": "^1.23.1",
  "@react-navigation/bottom-tabs": "^6.0.5",
  "@react-navigation/native": "^6.0.2",
  "@react-navigation/stack": "^6.0.7",
  "expo": "~51.0.28",
  "firebase": "^12.0.0",
  "react": "18.2.0",
  "react-native": "0.74.5"
}
```

### Additional Features
```json
{
  "expo-barcode-scanner": "~13.0.1",
  "expo-camera": "~15.0.14",
  "expo-print": "~13.0.1",
  "expo-sharing": "~12.0.1",
  "react-native-chart-kit": "^6.12.0",
  "react-native-toast-message": "^2.1.5"
}
```

## 🏗️ Project Structure

```
POS/
├── src/
│   ├── components/          # Reusable UI components
│   ├── context/            # React Context providers
│   │   ├── AuthContext.js  # Authentication state
│   │   ├── CartContext.js  # Shopping cart state
│   │   └── DatabaseContext.js # Database operations
│   ├── screens/            # App screens
│   │   ├── LoginScreen.js
│   │   ├── SignupScreen.js
│   │   ├── POSScreen.js
│   │   ├── InventoryScreen.js
│   │   ├── PaymentScreen.js
│   │   └── ReportsScreen.js
│   ├── config/             # Configuration files
│   │   └── firebase.js     # Firebase configuration
│   └── utils/              # Utility functions
│       └── Utils.js        # Helper functions and constants
├── assets/                 # Images and static assets
├── App.js                  # Main app component
├── app.json               # Expo configuration
└── package.json           # Dependencies and scripts
```

## 🚀 Available Scripts

```bash
# Start development server
npm start

# Start for Android
npm run android

# Start for iOS
npm run ios

# Start for web
npm run web

# Install dependencies
npm install

# Clear cache and restart
expo start --clear
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory for any environment-specific configurations:

```env
# Firebase configuration is in src/config/firebase.js
# Add any additional environment variables here
```

### Customization
- **Colors**: Modify `src/utils/Utils.js` for theme colors
- **Tax Rate**: Update `TAX_RATE` in `src/utils/Utils.js`
- **Payment Methods**: Configure in `src/utils/Utils.js`
- **Categories**: Default categories in `src/utils/Utils.js`

## 📱 Usage

### Getting Started
1. **Sign Up**: Create a new account or log in
2. **Set Up Inventory**: Add products and categories
3. **Start Selling**: Use the POS interface for transactions
4. **Track Performance**: View reports and analytics

### Key Features Usage
- **Add Products**: Navigate to Inventory → Add Item
- **Process Sale**: Select products → Add to cart → Process payment
- **View Reports**: Check Reports tab for sales analytics
- **Manage Users**: Admin features in Profile section

## 🐛 Troubleshooting

### Common Issues

#### Firebase Permission Errors
```
Error: Missing or insufficient permissions
```
**Solution**: Update Firestore security rules (see Firebase Setup section)

#### Expo/Metro Bundle Errors
```
Error: Unable to resolve module
```
**Solution**: 
```bash
expo start --clear
npm install
```

#### iOS Simulator Issues
**Solution**: 
```bash
expo install --fix
npx expo run:ios
```

#### Android Build Issues
**Solution**:
```bash
expo install --fix
npx expo run:android
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Smit Patel**
- GitHub: [@smitFanshawe](https://github.com/smitFanshawe)
- Project: [ConveniPOS](https://github.com/smitFanshawe/POS)

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Backend powered by [Firebase](https://firebase.google.com/)
- Icons by [Expo Vector Icons](https://icons.expo.fyi/)
- Charts by [React Native Chart Kit](https://github.com/indiespirit/react-native-chart-kit)

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/smitFanshawe/POS/issues)
3. Create a new issue with detailed information
4. Contact the development team

---

**Happy Selling! 🛒✨**