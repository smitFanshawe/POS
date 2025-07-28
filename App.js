import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// Screens
import POSScreen from './POSScreen';
import InventoryScreen from './InventoryScreen';
import AddItemScreen from './AddItemScreen';
import PaymentScreen from './PaymentScreen';
import ReportsScreen from './ReportsScreen';

// Context
import { CartProvider } from './CartContext';
import { DatabaseProvider } from './DatabaseContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function POSStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="POS" 
        component={POSScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{ 
          title: 'Payment Processing',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#fff'
        }}
      />
    </Stack.Navigator>
  );
}

function InventoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="InventoryList" 
        component={InventoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AddItem" 
        component={AddItemScreen}
        options={{ 
          title: 'Add New Item',
          headerStyle: { backgroundColor: '#2563eb' },
          headerTintColor: '#fff'
        }}
      />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'POSTab') {
            iconName = focused ? 'calculator' : 'calculator-outline';
          } else if (route.name === 'InventoryTab') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="POSTab" 
        component={POSStack}
        options={{ tabBarLabel: 'POS' }}
      />
      <Tab.Screen 
        name="InventoryTab" 
        component={InventoryStack}
        options={{ tabBarLabel: 'Inventory' }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ tabBarLabel: 'Reports' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <CartProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#2563eb" />
          <TabNavigator />
          <Toast />
        </NavigationContainer>
      </CartProvider>
    </DatabaseProvider>
  );
}