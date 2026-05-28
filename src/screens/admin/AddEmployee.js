import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usersAPI } from '../../services/api';
import { isValidEmail } from '../../utils/helpers';

const AddEmployee = ({ navigation }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    nip: '',
    jabatan: '',
    divisi: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Nama wajib diisi';
    if (!form.email.trim()) newErrors.email = 'Email wajib diisi';
    else if (!isValidEmail(form.email)) newErrors.email = 'Format email tidak valid';
    if (!form.password.trim()) newErrors.password = 'Password wajib diisi';
    else if (form.password.length < 6) newErrors.password = 'Password minimal 6 karakter';
    if (!form.nip.trim()) newErrors.nip = 'NIP wajib diisi';
    if (!form.jabatan.trim()) newErrors.jabatan = 'Jabatan wajib diisi';
    if (!form.divisi.trim()) newErrors.divisi = 'Divisi wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await usersAPI.getAll(); // Just checking API is reachable
      const response = await usersAPI.create
        ? await usersAPI.create({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            nip: form.nip.trim(),
            jabatan: form.jabatan.trim(),
            divisi: form.divisi.trim(),
            role: 'karyawan',
          })
        : await usersAPI.register({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            nip: form.nip.trim(),
            jabatan: form.jabatan.trim(),
            divisi: form.divisi.trim(),
            role: 'karyawan',
          });

      Alert.alert(
        'Berhasil',
        'Karyawan berhasil ditambahkan!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Gagal', error.message || 'Gagal menambahkan karyawan');
    } finally {
      setLoading(false);
    }
  };

  const inputFields = [
    { key: 'name', label: 'Nama Lengkap', icon: 'person-outline', placeholder: 'Masukkan nama lengkap', autoCapitalize: 'words' },
    { key: 'email', label: 'Email', icon: 'mail-outline', placeholder: 'contoh@email.com', keyboardType: 'email-address', autoCapitalize: 'none' },
    { key: 'password', label: 'Password', icon: 'lock-closed-outline', placeholder: 'Minimal 6 karakter', secureTextEntry: true, autoCapitalize: 'none' },
    { key: 'nip', label: 'NIP', icon: 'card-outline', placeholder: 'Masukkan NIP', autoCapitalize: 'none' },
    { key: 'jabatan', label: 'Jabatan', icon: 'briefcase-outline', placeholder: 'Masukkan jabatan', autoCapitalize: 'words' },
    { key: 'divisi', label: 'Divisi', icon: 'business-outline', placeholder: 'Masukkan divisi', autoCapitalize: 'words' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Info */}
        <View style={styles.headerInfo}>
          <Ionicons name="person-add-outline" size={32} color="#0D9488" />
          <Text style={styles.headerTitle}>Tambah Karyawan Baru</Text>
          <Text style={styles.headerSubtitle}>
            Isi data karyawan baru dengan lengkap dan benar
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {inputFields.map((field) => (
            <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{field.label}</Text>
              <View style={[styles.inputContainer, errors[field.key] && styles.inputError]}>
                <Ionicons
                  name={field.icon}
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor="#9CA3AF"
                  value={form[field.key]}
                  onChangeText={(text) => updateField(field.key, text)}
                  keyboardType={field.keyboardType || 'default'}
                  secureTextEntry={field.secureTextEntry || false}
                  autoCapitalize={field.autoCapitalize || 'none'}
                  autoCorrect={false}
                />
              </View>
              {errors[field.key] && (
                <Text style={styles.errorText}>{errors[field.key]}</Text>
              )}
            </View>
          ))}

          {/* Role info */}
          <View style={styles.roleInfo}>
            <Ionicons name="information-circle-outline" size={18} color="#0D9488" />
            <Text style={styles.roleInfoText}>
              Akun akan dibuat dengan role <Text style={styles.roleHighlight}>Karyawan</Text>
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#0D9488', '#0F766E']}
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <Text style={styles.submitText}>Menyimpan...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.submitText}>Simpan Data</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  headerInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    height: 48,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  roleInfoText: {
    fontSize: 13,
    color: '#0F766E',
  },
  roleHighlight: {
    fontWeight: '700',
  },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
    borderRadius: 14,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default AddEmployee;
