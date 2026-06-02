import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset, launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getBaseUrl, authHeaders } from '../api';
import { useAuth } from '../auth/AuthContext';
import AlertModal from '../components/AlertModal';

const { width } = Dimensions.get('window');

const SPECIALITIES = [
  'Cardiology',
  'Critical Care',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'General Medicine',
  'Gynaecology',
  'Nephrology',
  'Neurology',
  'Oncology',
  'Ophthalmology',
  'Orthopaedics',
  'Paediatrics',
  'Psychiatry',
  'Pulmonology',
  'Urology',
];

type ActivityField = {
  type: string;
  required?: boolean;
  fieldName: string;
  options?: Array<string | { label?: string; value?: string }>;
};

type ActivityType = {
  id: string;
  typeName: string;
  activitySpecificFields?: ActivityField[];
};

type Brand = {
  id: string | number;
  brandName: string;
};

type Camp = {
  id: string | number;
  campName: string;
};

type DropdownFieldProps = {
  placeholder: string;
  active?: boolean;
};

const fieldLabel = (fieldName: string) =>
  fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase());

const fileNameFromAsset = (asset: Asset, index: number) =>
  asset.fileName || `upload_${Date.now()}_${index}.jpg`;

export default function UploadPrescriptionScreen() {
  const { session, user } = useAuth();
const baseUrl = session?.backendUrl || '';
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertVariant, setAlertVariant] = useState<'info' | 'error' | 'confirm'>('info');
  const closeAlert = () => setAlertVisible(false);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' = 'success',
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);

    if (type === 'error') setAlertVariant('error');
    else if (type === 'warning') setAlertVariant('confirm');
    else setAlertVariant('info');

    setAlertVisible(true);
  };

  const [form, setForm] = useState<Record<string, string>>({
    drName: '',
    scCode: '',
    speciality: '',
    mobNo: '',
  });

  const [selectedImages, setSelectedImages] = useState<Array<Asset | null>>([
    null,
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [imageCount, setImageCount] = useState(1);

  const selectedActivity = useMemo(
    () => activityTypes.find(type => type.typeName === selectedType) || null,
    [activityTypes, selectedType],
  );

  const BRAND_RULES: Record<
    string,
    { maxImages: number; pointsPerImage: number }
  > = {
    'Brand A': { maxImages: 6, pointsPerImage: 1 },
    'Brand B': { maxImages: 3, pointsPerImage: 2 },
    'Brand C': { maxImages: 2, pointsPerImage: 3 },
  };

  const activityFields = selectedActivity?.activitySpecificFields || [];
  const selectedBrand = form.brandName;

  const imageCountOptions = Array.from(
    {
      length: BRAND_RULES[selectedBrand]?.maxImages || 1,
    },
    (_, i) => String(i + 1),
  );

  // Image count is always 1 for all activity types
  useEffect(() => {
    // Keep single image slot always available
    if (selectedImages.length !== 1) {
      setSelectedImages([null]);
    }
  }, []);

  const updateField = (fieldName: string, value: string) => {
    setForm(current => ({
      ...current,
      [fieldName]: value,
    }));

    // No image count changes based on field updates
    // Always keep single image upload
  };
  const resetForType = (typeName: string) => {
    setSelectedType(typeName);
    setShowDropdown(null);

    setForm({
      drName: form.drName,
      scCode: form.scCode,
      speciality: form.speciality,
      mobNo: form.mobNo,
    });

    // Always show single image for all types
    setImageCount(1);
    setSelectedImages([null]);
  };

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [activityResponse, brandResponse, campResponse] = await Promise.all(
        [
          fetch(`${baseUrl}/api/mr/activity-types?isActive=true`, {
            headers: authHeaders(session?.token),
          }),
          fetch(`${baseUrl}/api/mr/brands?limit=1000`, {
            headers: authHeaders(session?.token),
          }),
          fetch(`${baseUrl}/api/mr/camps?limit=1000`, {
            headers: authHeaders(session?.token),
          }),
        ],
      );

      const activityJson = await activityResponse.json();
      const brandJson = await brandResponse.json();
      const campJson = await campResponse.json();
      const loadedTypes: ActivityType[] =
        activityJson?.data?.activityTypes || [];

      setActivityTypes(loadedTypes);
      setBrands(brandJson?.data?.brands || []);
      setCamps(campJson?.data?.camps || []);
      setSelectedType(current => current || loadedTypes[0]?.typeName || '');
    } catch (error) {
      showAlert(
        'Upload',
        error instanceof Error ? error.message : 'Unable to load upload data.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const pickImage = async (index: number) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
        assetRepresentationMode: 'compatible',
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        showAlert(
          'Image Picker Error',
          result.errorMessage || 'Unable to pick image.',
          'error',
        );
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        showAlert(
          'Image Picker Error',
          'No image was returned from the picker.',
          'warning',
        );
        return;
      }

      setSelectedImages(prev => {
        const updatedImages = [...prev];
        updatedImages[index] = asset;
        return updatedImages;
      });
    } catch (error) {
      showAlert(
        'Image Picker Error',
        error instanceof Error ? error.message : 'Unable to open image picker.',
      );
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const updatedImages = [...prev];
      updatedImages[index] = null;
      return updatedImages;
    });
  };
  const fieldOptions = (field: ActivityField) => {
    if (field.fieldName === 'brandName') {
      return brands.map(brand => brand.brandName);
    }

    if (field.fieldName === 'campName') {
      return camps.map(camp => camp.campName);
    }

    if (field.options?.length) {
      return field.options.map(option =>
        typeof option === 'string'
          ? option
          : option.value || option.label || '',
      );
    }

    return [];
  };

  const validateForm = () => {
    const missing: string[] = [];

    if (!user?.id) {
      showAlert(
        'Session Expired',
        'Please login again before uploading.',
        'warning',
      );
      return false;
    }

    if (user.role !== 'MR') {
      showAlert('Upload', 'Only MR users can upload activities.');
      return false;
    }

    if (!selectedType) {
      missing.push('type');
    }

    if (!form.drName.trim()) {
      missing.push('drName');
    }

    if (!form.scCode.trim()) {
      missing.push('scCode');
    }
    if (form.mobNo && form.mobNo.length !== 10) {
      showAlert(
        'Invalid Number',
        'Mobile number must be 10 digits',
        'warning',
      );
      return false;
    }
    activityFields.forEach(field => {
      if (field.required && !form[field.fieldName]?.trim()) {
        missing.push(field.fieldName);
      }
    });

    if (!selectedImages.some(asset => asset?.uri)) {
      missing.push('uploadImage');
    }

    if (missing.length) {
      showAlert('Upload', `Please fill: ${missing.join(', ')}`);
      return false;
    }

    return true;
  };

  const submitUpload = async () => {
    if (!validateForm()) {
      return;
    }

    const body = new FormData();
    body.append('type', selectedType);
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '') {
        body.append(key, value);
      }
    });

    body.append('defaultFactor', '1');

    selectedImages.forEach((asset, index) => {
      if (!asset?.uri) {
        return;
      }

      body.append('uploadImage', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: fileNameFromAsset(asset, index),
      } as any);
    });

    try {
      setIsSubmitting(true);
      const response = await fetch(
        `${baseUrl}/api/mr/upload/${user?.id}`,
        {
          method: 'POST',
          headers: {
            ...(session?.token
              ? { Authorization: `Bearer ${session.token}` }
              : {}),
          },
          body,
        },
      );
      const json = await response.json();

      if (!response.ok || !json.success) {
        showAlert(
          'Upload Failed',
          json.message || 'Unable to submit upload.',
          'error',
        );
        return;
      }

      showAlert('Upload', json.message || 'Uploaded successfully.');
      setForm({
        drName: '',
        scCode: '',
        speciality: '',
        mobNo: '',
      });
      setSelectedImages([null]);
    } catch (error) {
      showAlert(
        'Upload Failed',
        error instanceof Error ? error.message : 'Unable to submit upload.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDropdown = (
    id: string,
    value: string,
    placeholder: string,
    options: string[],
    onSelect: (value: string) => void,
  ) => (
    <>
      <TouchableOpacity
        onPress={() => setShowDropdown(current => (current === id ? null : id))}
      >
        <DropdownField
          placeholder={value || placeholder}
          active={Boolean(value)}
        />
      </TouchableOpacity>

      {showDropdown === id && (
        <DropdownList>
          {options.length === 0 ? (
            <Text style={styles.emptyDropdownText}>No options</Text>
          ) : (
            options.map(item => (
              <DropdownItem
                key={item}
                label={item}
                active={value === item}
                onPress={() => {
                  onSelect(item);
                  setShowDropdown(null);
                }}
              />
            ))
          )}
        </DropdownList>
      )}
    </>
  );

  const renderActivityField = (field: ActivityField) => {
    if (field.fieldName === 'rxnDuration') {
      return (
        <View
          key="defaultFactor"
          style={{
            opacity: 0.55,
          }}
        >
          <LinearGradient
            colors={['#3273a8', '#42b983']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inputGradient}
          >
            <View style={styles.innerInputContainer}>
              <View>
                <Text
                  style={{
                    color: '#a0a0c0',
                    fontSize: 12,
                    marginBottom: 2,
                  }}
                >
                  Default Factor
                </Text>

                <Text
                  style={{
                    color: 'white',
                    fontSize: 15,
                    fontWeight: 'bold',
                  }}
                >
                  1
                </Text>
              </View>

              <Icon
                name="lock"
                size={18}
                color="rgba(255,255,255,0.5)"
              />
            </View>
          </LinearGradient>
        </View>
      );
    }
    const label = `${fieldLabel(field.fieldName)}${field.required ? '*' : ''}`;
    const options = fieldOptions(field);
    const rxnOptions =
      field.fieldName === 'noRxns'
        ? imageCountOptions
        : options;
    if (
      options.length > 0 ||
      field.fieldName === 'brandName' ||
      field.fieldName === 'campName' ||
      field.fieldName === 'noRxns'
    ) {
      return (
        <View
          key={field.fieldName}
          style={{
            opacity:
              field.fieldName === 'noRxns' && !selectedBrand
                ? 0.45
                : 1,
          }}
        >
          {field.fieldName === 'noRxns' && !selectedBrand ? (
            <TouchableOpacity activeOpacity={1}>
              <DropdownField
                placeholder="Select Brand First"
                active={false}
              />
            </TouchableOpacity>
          ) : (
            renderDropdown(
              field.fieldName,
              form[field.fieldName] || '',
              label,
              rxnOptions,
              value => updateField(field.fieldName, value),
            )
          )}
        </View>
      );
    }

    return (
      <InputField
        key={field.fieldName}
        placeholder={label}
        value={form[field.fieldName] || ''}
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        onChangeText={value => updateField(field.fieldName, value)}
      />
    );
  };
  const lowerType = selectedType.toLowerCase();

  // Always show single image upload for all activity types
  const shouldShowImages = selectedType !== '';

  return (
    <ImageBackground
      source={require('../assets/newAssets/bgMain.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#607bf466', '#001244']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Upload Prescription</Text>
              <View style={styles.typeSelector}>
                <Text style={styles.typeLabel}>Type:</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() =>
                    setShowDropdown(current =>
                      current === 'type' ? null : 'type',
                    )
                  }
                >
                  <Text style={styles.dropdownText}>{selectedType || '-'}</Text>
                  <Icon
                    name={
                      showDropdown === 'type' ? 'expand-less' : 'expand-more'
                    }
                    size={16}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {showDropdown === 'type' && (
              <View style={styles.typeDropdown}>
                {activityTypes.map(item => (
                  <DropdownItem
                    key={item.id}
                    label={item.typeName}
                    active={selectedType === item.typeName}
                    onPress={() => resetForType(item.typeName)}
                  />
                ))}
              </View>
            )}

            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <View style={styles.form}>
                {shouldShowImages && (
                  <>
                    <View style={styles.imageHeaderRow}>
                      <Text style={styles.conditionalLabel}>
                        Upload Proof*
                      </Text>
                    </View>

                    <View style={styles.singleImageContainer}>
                      {selectedImages.map((asset, index) => (
                        <TouchableOpacity
                          key={`${index}-${asset?.uri || 'empty'}`}
                          style={styles.largeImageUploadBox}
                          onPress={() => pickImage(index)}
                        >
                          {asset?.uri ? (
                            <>
                              <Image
                                source={{ uri: asset.uri }}
                                style={styles.selectedImage}
                              />

                              <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => removeImage(index)}
                              >
                                <Icon name="close" size={16} color="white" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <View style={styles.imagePlaceholder}>
                              <Icon
                                name="cloud-upload"
                                size={40}
                                color="#9d7bff"
                              />

                              <Text style={styles.addPhotoText}>Click to upload</Text>
                              <Text style={styles.fileInfoText}>JPG, JPEG, Max 2MB</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <InputField
                  placeholder="Dr Name*"
                  value={form.drName}
                  onChangeText={value => updateField('drName', value)}
                />
                <InputField
                  placeholder="MCL code*"
                  value={form.scCode}
                  onChangeText={value => updateField('scCode', value)}
                />

                {renderDropdown(
                  'speciality',
                  form.speciality,
                  'Select Speciality',
                  SPECIALITIES,
                  value => updateField('speciality', value),
                )}

                <InputField
                  placeholder="Mob No"
                  value={form.mobNo}
                  keyboardType="phone-pad"
                  onChangeText={value => {
                    const cleaned = value.replace(/[^0-9]/g, '');
                    if (cleaned.length <= 10) {
                      updateField('mobNo', cleaned);
                    }
                  }}
                />

                {activityFields.map(renderActivityField)}

                <TouchableOpacity
                  style={[
                    styles.submitBtnContainer,
                    isSubmitting && styles.disabledButton,
                  ]}
                  onPress={submitUpload}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={['#9d50bb', '#6e48aa']}
                    style={styles.submitBtn}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Submit</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </ScrollView>
        <AlertModal
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          variant={alertVariant === 'error' ? 'error' : alertVariant}
          buttons={[
            {
              text: 'OK',
              style: 'default',
              onPress: closeAlert,
            },
          ]}
          onRequestClose={closeAlert}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const InputField = ({
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) => (
  <LinearGradient
    colors={['#3273a8', '#42b983']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.inputGradient}
  >
    <View style={styles.innerInputContainer}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#a0a0c0"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  </LinearGradient>
);

const DropdownField = ({ placeholder, active = false }: DropdownFieldProps) => (
  <LinearGradient
    colors={['#3273a8', '#42b983']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.inputGradient}
  >
    <View style={styles.innerInputContainer}>
      <Text style={active ? styles.dropdownValueText : styles.placeholderText}>
        {placeholder}
      </Text>
      <Icon name="expand-more" size={18} color="#a0a0c0" />
    </View>
  </LinearGradient>
);

const DropdownList = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.dropdownList}>
    <ScrollView
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      style={styles.dropdownScroll}
    >
      {children}
    </ScrollView>
  </View>
);

const DropdownItem = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Text style={[styles.menuItemText, active && styles.menuItemActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create<Record<string, any>>({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  alertBox: {
    width: '82%',
    height: '20%',
    borderRadius: 24,
    paddingHorizontal: 25,
    paddingVertical: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white'
  },

  successAlert: {
    backgroundColor: '#000f84aa',
  },

  errorAlert: {
    backgroundColor: '#000f84aa',
  },

  warningAlert: {
    backgroundColor: '#000f84aa',
  },

  alertTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },

  alertMessage: {
    color: 'white',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },

  alertButton: {
    marginTop: 20,
    backgroundColor: 'rgb(140, 73, 226)',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 15,
  },

  alertButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 32,
  },
  card: {
    width: width * 0.9,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeLabel: {
    color: 'white',
    marginRight: 5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7b42f5',
  },
  dropdownText: {
    color: 'white',
    fontSize: 12,
    marginRight: 5,
  },
  typeDropdown: {
    alignSelf: 'flex-end',
    width: 180,
    marginTop: 60,
    backgroundColor: '#0b2059',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4d5dfb',
    overflow: 'hidden',
    position: 'absolute',
    zIndex: 1,
  },
  form: {
    gap: 15,
  },
  loadingWrap: {
    paddingVertical: 30,
  },
  inputGradient: {
    borderRadius: 15,
    paddingHorizontal: 1.5,
    paddingVertical: 1.5,
  },
  innerInputContainer: {
    backgroundColor: '#0a1a45',
    borderRadius: 14,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    color: 'white',
  },
  placeholderText: {
    flex: 1,
    color: '#a0a0c0',
  },
  dropdownValueText: {
    flex: 1,
    color: 'white',
  },
  dropdownList: {
    backgroundColor: '#0a1a45',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4d5dfb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1,
    width: '100%',
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  menuItem: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemText: {
    color: 'white',
    fontSize: 14,
  },
  menuItemActive: {
    color: '#9d7bff',
    fontWeight: 'bold',
  },
  emptyDropdownText: {
    color: '#a0a0c0',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  conditionalLabel: {
    color: 'white',
    fontSize: 14,
    marginLeft: 5,
  },
  imageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addImageSlotButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7d4dff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  singleImageContainer: {
    width: '100%',
    marginBottom: 5,
  },
  imageUploadBox: {
    width: (width * 0.9 - 60) / 2,
    height: 100,
    borderRadius: 15,
    borderStyle: 'dashed',
    borderColor: 'rgba(123, 66, 245, 0.5)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  largeImageUploadBox: {
    width: '100%',
    height: 160,
    borderRadius: 15,
    borderStyle: 'dashed',
    borderColor: 'rgba(157, 123, 255, 0.6)',
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#9d7bff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  fileInfoText: {
    color: '#a0a0c0',
    fontSize: 12,
    marginTop: 4,
  },
  submitBtnContainer: {
    marginTop: 20,
    alignSelf: 'center',
  },
  submitBtn: {
    minWidth: 130,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#9d50bb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  submitBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});