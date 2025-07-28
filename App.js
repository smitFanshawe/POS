import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

// Import screens
import POSScreen from './src/screens/POSScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import context providers
import { CartProvider } from './src/context/CartContext';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { COLORS } from './src/utils/Utils';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack navigator for POS flow
function POSStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="POSMain" 
        component={POSScreen} 
        options={{ title: 'Point of Sale' }}
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen} 
        options={{ title: 'Payment Processing' }}
      />
    </Stack.Navigator>
  );
}

// Stack navigator for Inventory flow
function InventoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="InventoryMain" 
        component={InventoryScreen} 
        options={{ title: 'Inventory Management' }}
      />
      <Stack.Screen 
        name="AddItem" 
        component={AddItemScreen} 
        options={{ title: 'Add New Item' }}
      />
    </Stack.Navigator>
  );
}

// Authentication stack navigator
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// Main tab navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'POS') {
            iconName = focused ? 'calculator' : 'calculator-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="POS" component={POSStack} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Loading component
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={{ marginTop: 16, fontSize: 16, color: COLORS.text }}>Loading...</Text>
    </View>
  );
}

// Main app content with authentication check
function AppContent() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {user ? <MainTabs /> : <AuthStack />}
      <Toast />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DatabaseProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </DatabaseProvider>
    </AuthProvider>
  );
}