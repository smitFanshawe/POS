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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { COLORS, formatDate } from '../utils/Utils';

const EmployeesScreen = ({ navigation }) => {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'cashier',
    hourlyRate: '',
    isActive: true,
  });

  const { user } = useAuth();
  const database = useDatabase();

  const roles = [
    { id: 'cashier', name: 'Cashier', description: 'Basic POS operations' },
    { id: 'manager', name: 'Manager', description: 'POS + Reports + Inventory' },
    { id: 'admin', name: 'Admin', description: 'Full system access' },
  ];

  useEffect(() => {
    if (database.isReady) {
      loadEmployees();
    }
  }, [database.isReady]);

  const loadEmployees = async () => {
    try {
      const employeesData = await database.getEmployees();
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load employees',
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'cashier',
      hourlyRate: '',
      isActive: true,
    });
    setShowAddModal(true);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || 'cashier',
      hourlyRate: employee.hourlyRate?.toString() || '',
      isActive: employee.isActive !== false,
    });
    setShowAddModal(true);
  };

  const handleSaveEmployee = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    try {
      const employeeData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        isActive: formData.isActive,
      };

      if (editingEmployee) {
        await database.updateEmployee(editingEmployee.id, employeeData);
        Toast.show({
          type: 'success',
          text1: 'Employee Updated',
          text2: `${employeeData.displayName} has been updated`,
        });
      } else {
        await database.addEmployee(employeeData);
        Toast.show({
          type: 'success',
          text1: 'Employee Added',
          text2: `${employeeData.displayName} has been added`,
        });
      }

      setShowAddModal(false);
      await loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      Alert.alert('Error', 'Failed to save employee');
    }
  };

  const handleToggleEmployeeStatus = async (employee) => {
    try {
      const newStatus = !employee.isActive;
      await database.updateEmployee(employee.id, { isActive: newStatus });
      
      Toast.show({
        type: 'success',
        text1: newStatus ? 'Employee Activated' : 'Employee Deactivated',
        text2: `${employee.displayName} is now ${newStatus ? 'active' : 'inactive'}`,
      });
      
      await loadEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      Alert.alert('Error', 'Failed to update employee status');
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleInfo = (roleId) => {
    return roles.find(role => role.id === roleId) || roles[0];
  };

  const renderEmployee = (employee) => {
    const roleInfo = getRoleInfo(employee.role);
    
    return (
      <View key={employee.id} style={styles.employeeCard}>
        <View style={styles.employeeInfo}>
          <View style={styles.employeeHeader}>
            <Text style={styles.employeeName}>{employee.displayName}</Text>
            <View style={[
              styles.statusBadge,
              employee.isActive ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={styles.statusText}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.employeeRole}>{roleInfo.name}</Text>
          
          {employee.email && (
            <Text style={styles.employeeDetail}>
              <Ionicons name="mail-outline" size={14} color={COLORS.textSecondary} />
              {' '}{employee.email}
            </Text>
          )}
          
          {employee.phone && (
            <Text style={styles.employeeDetail}>
              <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
              {' '}{employee.phone}
            </Text>
          )}
          
          {employee.hourlyRate && (
            <Text style={styles.employeeDetail}>
              <Ionicons name="cash-outline" size={14} color={COLORS.textSecondary} />
              {' '}${employee.hourlyRate}/hour
            </Text>
          )}
          
          <Text style={styles.employeeDate}>
            Added: {formatDate(employee.createdAt)}
          </Text>
        </View>
        
        <View style={styles.employeeActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditEmployee(employee)}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              employee.isActive ? styles.deactivateButton : styles.activateButton
            ]}
            onPress={() => handleToggleEmployeeStatus(employee)}
          >
            <Ionicons 
              name={employee.isActive ? "pause-outline" : "play-outline"} 
              size={20} 
              color={employee.isActive ? COLORS.warning : COLORS.success} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAddModal(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editingEmployee ? 'Edit Employee' : 'Add Employee'}
          </Text>
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={handleSaveEmployee}
          >
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                  placeholder="First name"
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                  placeholder="Last name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="employee@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.textInput}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {roles.map(role => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleButton,
                      formData.role === role.id && styles.selectedRole
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, role: role.id }))}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      formData.role === role.id && styles.selectedRoleText
                    ]}>
                      {role.name}
                    </Text>
                    <Text style={[
                      styles.roleDescription,
                      formData.role === role.id && styles.selectedRoleDescription
                    ]}>
                      {role.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hourly Rate (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.hourlyRate}
                onChangeText={(text) => setFormData(prev => ({ ...prev, hourlyRate: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchContainer}>
                <Text style={styles.inputLabel}>Active Employee</Text>
                <TouchableOpacity
                  style={[
                    styles.switch,
                    formData.isActive && styles.switchActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                >
                  <View style={[
                    styles.switchThumb,
                    formData.isActive && styles.switchThumbActive
                  ]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // Only allow admin users to access employee management
  if (user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.accessDeniedText}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtext}>
            Only administrators can manage employees
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Employees</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddEmployee}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.employeesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredEmployees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No employees match your search' : 'No employees added yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleAddEmployee}
              >
                <Text style={styles.emptyButtonText}>Add First Employee</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredEmployees.map(renderEmployee)
        )}
      </ScrollView>

      {renderAddModal()}
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
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  employeesList: {
    flex: 1,
    padding: 16,
  },
  employeeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  activeBadge: {
    backgroundColor: COLORS.success,
  },
  inactiveBadge: {
    backgroundColor: COLORS.textSecondary,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  employeeRole: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  employeeDetail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  employeeActions: {
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
  activateButton: {
    backgroundColor: COLORS.success + '20',
  },
  deactivateButton: {
    backgroundColor: COLORS.warning + '20',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
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
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
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
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  roleButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    minWidth: 120,
  },
  selectedRole: {
    backgroundColor: COLORS.primary,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  selectedRoleText: {
    color: 'white',
  },
  roleDescription: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  selectedRoleDescription: {
    color: 'white',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
});

export default EmployeesScreen;