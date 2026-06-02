import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Modal,
  LayoutRectangle,
  ActivityIndicator,
  Platform,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getBaseUrl } from '../api';
import { useAuth } from '../auth/AuthContext';
import ImageViewer from 'react-native-image-zoom-viewer';
import AlertModal, { AlertButton } from '../components/AlertModal';
const { width: W, height: H } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;

interface UploadEntry {
  id: string;
  mrName: string;
  type: string;
  diceValue: number;
  date: string;
  time: string;
  status: 'approved' | 'pending' | 'rejected';
  uploadImage?: any;
  drName?: string;
  scCode?: string;
  speciality?: string;
  mobNo?: string;
  points?: number;
  reason?: string;
  brandName?: string;
  noRxns?: number;
  rxnDuration?: number;
  chemistName?: string;
  noOfUnits?: number;
  allValue?: number;
  campName?: string;
  noOfCamps?: number;
  mrHq?: string;
  mrRegion?: string;
  mrZone?: string;
}

const TYPES = [
  'All Types',
  'Prescription',
  'Pob',
  'Camp',
  'Conversion',
  'Chemist Availability',
];
const STATUS_FILTERS = ['All Status', 'approved', 'rejected'];

const UploadsScreen = () => {
  const { user } = useAuth();
  const isFlm = user?.role?.toLowerCase() === 'flm';
  const [baseUrl, setBaseUrl] = useState('');
  const [filter, setFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [btnLayout, setBtnLayout] = useState<LayoutRectangle | null>(null);
  const [data, setData] = useState<UploadEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Image viewer
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionUpload, setActionUpload] = useState<UploadEntry | null>(null);

  const managerId = isFlm ? user?.flmId || '' : user?.mrId || '';
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const loadBaseUrl = async () => {
      const url = await getBaseUrl();

      console.log('UPLOAD BASE URL =>', url);

      setBaseUrl(url);
    };

    loadBaseUrl();
  }, []);
  useEffect(() => {
    fetchUploads();
    return () => abortRef.current?.abort();
  }, [selectedDate, filter, statusFilter]);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVariant, setAlertVariant] = useState<
    'info' | 'error' | 'confirm'
  >('info');

  const alertButtons: AlertButton[] = [
    {
      text: 'OK',
      style: 'default',
      onPress: () => setAlertVisible(false),
    },
  ];

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' = 'success',
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVariant(
      type === 'error' ? 'error' : type === 'warning' ? 'info' : 'confirm',
    );
    setAlertVisible(true);
  };
  const fetchUploads = useCallback(async () => {
    if (!baseUrl) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setLoading(true);
    try {
      const dateParam = selectedDate
        ? `date=${selectedDate.toISOString().split('T')[0]}`
        : '';
      const typeParam =
        filter !== 'All Types' ? `type=${filter.toLowerCase()}` : '';
      const query = [dateParam, typeParam].filter(Boolean).join('&');
      const qs = query ? `?${query}` : '';

      if (isFlm) {
        const res = await fetch(
          `${baseUrl}/api/flm/${managerId}/uploads/pending${qs}`,
          { signal },
        );
        const json = await res.json();
        console.log('data', json);
        setData((json.data || []).map(mapUpload));
      // } else {
      //   if (statusFilter === 'approved') {
      //     const approved = await fetch(
      //       `${baseUrl}/api/mr/${managerId}/uploads/approved${qs}`,
      //       { signal },
      //     ).then(r => r.json());

      //     setData((approved.data || []).map(mapUpload));
      //   } else if (statusFilter === 'rejected') {
      //     const rejected = await fetch(
      //       `${baseUrl}/api/mr/${managerId}/uploads/rejected${qs}`,
      //       { signal },
      //     ).then(r => r.json());

      //     setData((rejected.data || []).map(mapUpload));
      //   } else {
      //     const [approved, rejected] = await Promise.all([
      //       fetch(`${baseUrl}/api/mr/${managerId}/uploads/approved${qs}`, {
      //         signal,
      //       }).then(r => r.json()),

      //       fetch(`${baseUrl}/api/mr/${managerId}/uploads/rejected${qs}`, {
      //         signal,
      //       }).then(r => r.json()),
      //     ]);

      //     setData([
      //       ...(approved.data || []).map(mapUpload),
      //       ...(rejected.data || []).map(mapUpload),
      //     ]);
      //   }
  }  else {

  if (statusFilter === 'approved') {

    const approvedRes = await fetch(
      `${baseUrl}/api/mr/${managerId}/uploads/approved${qs}`,
      { signal },
    );

    const approvedText =
      await approvedRes.text();

    console.log(
      'APPROVED RESPONSE =>',
      approvedText,
    );

    const approved =
      JSON.parse(approvedText);

    setData(
      (approved.data || []).map(mapUpload),
    );

  }

  else if (statusFilter === 'rejected') {

    const rejectedRes = await fetch(
      `${baseUrl}/api/mr/${managerId}/uploads/rejected${qs}`,
      { signal },
    );

    const rejectedText =
      await rejectedRes.text();

    console.log(
      'REJECTED RESPONSE =>',
      rejectedText,
    );

    const rejected =
      JSON.parse(rejectedText);

    setData(
      (rejected.data || []).map(mapUpload),
    );

  }

  else {

    const approvedRes = await fetch(
      `${baseUrl}/api/mr/${managerId}/uploads/approved${qs}`,
      { signal },
    );

    const approvedText =
      await approvedRes.text();

    const approved =
      JSON.parse(approvedText);

    const rejectedRes = await fetch(
      `${baseUrl}/api/mr/${managerId}/uploads/rejected${qs}`,
      { signal },
    );

    const rejectedText =
      await rejectedRes.text();

    const rejected =
      JSON.parse(rejectedText);

    setData([
      ...(approved.data || []).map(mapUpload),
      ...(rejected.data || []).map(mapUpload),
    ]);
  }

      }
    } catch (error: any) {
      if (error?.name !== 'AbortError')
        console.error('Error fetching uploads:', error);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [selectedDate, filter, statusFilter, isFlm, managerId, baseUrl]);

  const mapUpload = (item: any): UploadEntry => ({
    id: item.id,
    mrName: item.mrName || 'Unknown',
    type: item.type || 'Unknown',
    diceValue: item.diceValue || 0,
    date: item.dateOfUpload
      ? new Date(item.dateOfUpload).toLocaleDateString('en-GB')
      : '',
    time: item.timeOfUpload || '',
    status: item.status,
    uploadImage: item.uploadImage,
    drName: item.drName,
    scCode: item.scCode,
    speciality: item.speciality,
    mobNo: item.mobNo,
    points: item.points,
    reason: item.reason,
    brandName: item.brandName || item.activitySpecificDetails?.brandName,
    noRxns: item.noRxns || item.activitySpecificDetails?.noRxns,
    rxnDuration: item.rxnDuration || item.activitySpecificDetails?.rxnDuration,
    chemistName: item.chemistName || item.activitySpecificDetails?.chemistName,
    noOfUnits: item.noOfUnits || item.activitySpecificDetails?.noOfUnits,
    allValue: item.allValue || item.activitySpecificDetails?.allValue,
    campName: item.campName || item.activitySpecificDetails?.campName,
    noOfCamps: item.noOfCamps || item.activitySpecificDetails?.noOfCamps,
    mrHq: item.mrHq,
    mrRegion: item.mrRegion,
    mrZone: item.mrZone,
  });

  const getImages = (uploadImage: any): string[] => {
    if (!uploadImage) return [];

    // Backend might send:
    // 1) JSON string like '["/path1","/path2"]'
    // 2) Single url string like '/path1.png'
    // 3) Already-parsed array/object
    // JSON.parse can throw on non-JSON strings, so only parse when it looks like JSON.
    try {
      if (typeof uploadImage === 'string') {
        const trimmed = uploadImage.trim();

        // If it looks like JSON, parse it; otherwise treat it as a single path/URL.
        if (
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'))
        ) {
          const parsed = JSON.parse(trimmed);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          return arr.filter(Boolean).map((p: string) => `${baseUrl}${p}`);
        }

        // Sometimes backend might return comma-separated paths.
        if (trimmed.includes(',')) {
          const parts = trimmed
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          return parts.map(p => `${baseUrl}${p}`);
        }

        return [`${baseUrl}${trimmed}`];
      }

      const arr = Array.isArray(uploadImage) ? uploadImage : [uploadImage];
      return arr.filter(Boolean).map((p: string) => `${baseUrl}${p}`);
    } catch (e) {
      console.error('getImages JSON parse failed. payload:', uploadImage, e);
      return typeof uploadImage === 'string'
        ? [`${baseUrl}${uploadImage}`]
        : [];
    }
  };

  const openDetail = (item: UploadEntry) => {
    setExpandedId(prev => (prev === item.id ? null : item.id));
  };

  const openImageViewer = (images: string[], index: number) => {
    setImageViewerImages(images);
    setImageViewerIndex(index);
    setShowImageViewer(true);
  };

  const handleApprove = async (upload: UploadEntry) => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `${baseUrl}/api/flm/${managerId}/uploads/${upload.id}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve', role: 'flm' }),
        },
      );
      const json = await res.json();
      if (json.success) {
        showAlert('Success', 'Upload approved successfully');
        setExpandedId(null);
        fetchUploads();
      } else {
        showAlert('Error', json.message || 'Failed to approve');
      }
    } catch {
      showAlert('Error', 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!actionUpload || !rejectReason.trim()) {
      showAlert('Error', 'Please enter a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(
        `${baseUrl}/api/flm/${managerId}/uploads/${actionUpload.id}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reject',
            rejectionReason: rejectReason,
            role: 'flm',
          }),
        },
      );
      const json = await res.json();
      if (json.success) {
        showAlert('Success', 'Upload rejected');
        setShowRejectModal(false);
        setRejectReason('');
        setActionUpload(null);
        setExpandedId(null);
        fetchUploads();
      } else {
        showAlert('Error', json.message || 'Failed to reject');
      }
    } catch {
      showAlert('Error', 'Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const changeDateBy = (days: number) => {
    const newDate = selectedDate ? new Date(selectedDate) : new Date();
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      if (Platform.OS === 'ios') setShowDatePicker(false);
    }
  };

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate || new Date(),
        mode: 'date',
        maximumDate: new Date(), // ADD THIS
        onChange: (_event: any, date?: Date) => {
          if (date) setSelectedDate(date);
        },
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const statusIcons = {
    approved: { name: 'check-circle', color: '#4CAF50' },
    pending: { name: 'access-time', color: '#FFC107' },
    rejected: { name: 'cancel', color: '#F44336' },
  };

  const renderItem = (item: UploadEntry) => {
    const statusIcon = statusIcons[item.status];
    const isExpanded = expandedId === item.id;
    const images = getImages(item.uploadImage);
    return (
      <View key={item.id}>
        <TouchableOpacity
          onPress={() => openDetail(item)}
          activeOpacity={isFlm ? 0.7 : 1}
        >
          <LinearGradient
            colors={['#7149c8', '#9776e0', '#8c5fee', '#293772']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.row}
          >
            <Text style={styles.nameCell}>{item.mrName}</Text>
            <Text style={styles.cell}>{item.type}</Text>
            <View style={styles.diceCell}>
              <View style={styles.diceCircle}>
                <Text style={styles.diceText}>{item.points}</Text>
              </View>
            </View>
            <Text style={styles.cell}>{item.date}</Text>
            <Text style={styles.cell}>{item.time}</Text>
            <View style={{ width: s(24), alignItems: 'center' }}>
              <Icon
                name={statusIcon.name}
                size={s(18)}
                color={statusIcon.color}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Expanded detail panel for FLM */}
        {isExpanded && (
          <View style={styles.expandedPanel}>
            <View style={styles.infoGrid}>
              {[
                { label: 'Doctor', value: item.drName },
                { label: 'Speciality', value: item.speciality },
                { label: 'Mobile', value: item.mobNo },
                { label: 'SC Code', value: item.scCode },
                { label: 'Brand', value: item.brandName },
                {
                  label: 'No. Rxns',
                  value: item.noRxns != null ? String(item.noRxns) : null,
                },
                {
                  label: 'Rxn Duration',
                  value:
                    item.rxnDuration != null ? String(item.rxnDuration) : null,
                },
                { label: 'Chemist', value: item.chemistName },
                {
                  label: 'No. Units',
                  value: item.noOfUnits != null ? String(item.noOfUnits) : null,
                },
                {
                  label: 'All Value',
                  value: item.allValue != null ? String(item.allValue) : null,
                },
                { label: 'Camp', value: item.campName },
                {
                  label: 'No. Camps',
                  value: item.noOfCamps != null ? String(item.noOfCamps) : null,
                },
                { label: 'Points', value: String(item.points || 0) },
                { label: 'Dice', value: String(item.diceValue || 0) },
                { label: 'HQ', value: item.mrHq },
                { label: 'Region', value: item.mrRegion },
                { label: 'Zone', value: item.mrZone },
                { label: 'Status', value: item.status, isStatus: true },
              ]
                .filter(
                  f => f.value != null && f.value !== '' && f.value !== 'null',
                )
                .map(({ label, value, isStatus }) => (
                  <View key={label} style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        isStatus && { color: statusIcons[item.status].color },
                      ]}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
            </View>
            {item.reason ? (
              <Text style={styles.reasonText}>Reason: {item.reason}</Text>
            ) : null}

            {/* Images row */}
            {images.length > 0 && (
              <View>
                <Text style={styles.imagesLabel}>Images ({images.length})</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagesRow}
                >
                  {images.map((uri, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => openImageViewer(images, idx)}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.thumbImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Approve / Reject */}
            {item.status === 'pending' && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(item)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>✓ Approve</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => {
                    setActionUpload(item);
                    setShowRejectModal(true);
                  }}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionBtnText}>✗ Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };
  const isToday = selectedDate?.toDateString() === new Date().toDateString();
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/newAssets/bgMain.png')}
        style={styles.bg}
      />
      <SafeAreaView
        style={{ flex: 1, marginHorizontal: s(15), marginTop: s(10) }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.topBarBorder}>
            <LinearGradient
              colors={['#8d5ce7', '#a59de4', '#8d5ce7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topBar}
            >
              <TouchableOpacity
                style={styles.filterBtn}
                onLayout={e => setBtnLayout(e.nativeEvent.layout)}
                onPress={() => setShowStatusDropdown(true)}
              >
                <Text style={styles.filterText}>{statusFilter}</Text>
                <Icon name="arrow-drop-down" size={s(18)} color="#333" />
              </TouchableOpacity>
              <Modal
                transparent
                visible={showStatusDropdown}
                onRequestClose={() => setShowStatusDropdown(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowStatusDropdown(false)}
                >
                  {btnLayout && (
                    <View
                      style={[
                        styles.dropdown,
                        {
                          position: 'absolute',
                          top: btnLayout.y + btnLayout.height + s(8),
                          left: '4%',
                        },
                      ]}
                    >
                      {STATUS_FILTERS.map(t => (
                        <TouchableOpacity
                          key={t}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setStatusFilter(t);
                            setShowStatusDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownText,
                              statusFilter === t && styles.dropdownTextActive,
                            ]}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              </Modal>

              <TouchableOpacity
                style={styles.filterBtn}
                onLayout={e => setBtnLayout(e.nativeEvent.layout)}
                onPress={() => setShowDropdown(true)}
              >
                <Text style={styles.filterText}>{filter}</Text>
                <Icon name="arrow-drop-down" size={s(18)} color="#333" />
              </TouchableOpacity>
              <Modal
                transparent
                visible={showDropdown}
                onRequestClose={() => setShowDropdown(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowDropdown(false)}
                >
                  {btnLayout && (
                    <View
                      style={[
                        styles.dropdown,
                        {
                          position: 'absolute',
                          top: btnLayout.y + btnLayout.height + s(8),
                          left: btnLayout.x,
                        },
                      ]}
                    >
                      {TYPES.map(t => (
                        <TouchableOpacity
                          key={t}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFilter(t);
                            setShowDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownText,
                              filter === t && styles.dropdownTextActive,
                            ]}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              </Modal>
              <View style={styles.dateControls}>
                <TouchableOpacity
                  onPress={() => changeDateBy(-1)}
                  style={styles.dateBtn}
                >
                  <Icon name="chevron-left" size={s(20)} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateBadge}
                  onPress={openDatePicker}
                >
                  <Text style={styles.dateText}>
                    {selectedDate
                      ? selectedDate.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'All Dates'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => !isToday && changeDateBy(1)}
                  style={[styles.dateBtn, isToday && { opacity: 0.4 }]}
                >
                  <Icon name="chevron-right" size={s(20)} color="#333" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.tableBorder}>
            <LinearGradient
              colors={['#b870fffd', '#a28ab9fd', '#b870fffd']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tableContainer}
            >
              <View style={styles.tableHeader}>
                <Text style={styles.headerLabel}>MR NAME</Text>
                <Text style={styles.headerLabelSm}>TYPE</Text>
                <Text style={styles.headerLabelSm}>POINTS</Text>
                <Text style={styles.headerLabelSm}>DATE</Text>
                <Text style={styles.headerLabelSm}>TIME</Text>
                <Text style={styles.headerLabelIcon}>✓</Text>
              </View>
            </LinearGradient>
            <View>
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="#FFF"
                  style={{ marginTop: s(20) }}
                />
              ) : data.length === 0 ? (
                <Text style={styles.emptyText}>No uploads found</Text>
              ) : (
                data.map(item => renderItem(item))
              )}
            </View>
          </View>
        </ScrollView>
        <AlertModal
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          variant={alertVariant}
          buttons={alertButtons}
          onRequestClose={() => setAlertVisible(false)}
        />
      </SafeAreaView>

      {/* Date Picker - iOS only, Android uses DateTimePickerAndroid.open */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal
          transparent
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.iosDatePickerContainer}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.iosDatePickerBtn}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(null);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.iosDatePickerBtn}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text
                    style={[styles.iosDatePickerBtn, { fontWeight: 'bold' }]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_event: any, date?: Date) => {
                  if (date) setSelectedDate(date);
                }}
                textColor="#000"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setShowImageViewer(false)}
          >
            <Icon name="close" size={s(28)} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.imageViewerCounter}>
            {imageViewerIndex + 1} / {imageViewerImages.length}
          </Text>
          <ImageViewer
            imageUrls={imageViewerImages.map(uri => ({
              url: uri,
            }))}
            index={imageViewerIndex}
            enableSwipeDown
            onSwipeDown={() => setShowImageViewer(false)}
            saveToLocalByLongPress={false}
            renderIndicator={(current, all) => (
              <Text style={styles.imageViewerCounter}>
                {current} / {all}
              </Text>
            )}
          />
          <View style={styles.imageViewerDots}>
            {imageViewerImages.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === imageViewerIndex && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        transparent
        visible={showRejectModal}
        onRequestClose={() => setShowRejectModal(false)}
        animationType="fade"
      >
        <View style={styles.detailOverlay}>
          <View style={styles.rejectModal}>
            <Text style={styles.detailTitle}>Rejection Reason</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for rejection..."
              placeholderTextColor="#999"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionBtnText}>Confirm Reject</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: '#999' }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0066' },
  bg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topBarBorder: {
    borderRadius: s(18),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    marginBottom: s(10),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: s(18),
    paddingHorizontal: s(12),
    paddingVertical: s(16),
    flexWrap: 'wrap',
    gap: s(6),
  },
  headerTitle: { color: '#FFF', fontSize: s(14), fontWeight: 'bold', flex: 1 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: s(4),
    paddingVertical: s(6),
    borderRadius: s(20),
    maxWidth: s(105),
  },
  filterText: { color: '#666', fontSize: s(12), fontWeight: '600' },
  dateBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: s(8),
    paddingVertical: s(5),
    borderRadius: s(20),
  },
  dateText: { color: '#333', fontWeight: 'bold', fontSize: s(11) },
  tableBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  tableContainer: {
    paddingHorizontal: s(8),
    paddingVertical: s(8),
    borderTopRightRadius: 20,
    borderTopLeftRadius: 18,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(4),
    paddingVertical: s(6),
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    // marginBottom: s(2),
    // borderTopLeftRadius:20,
    // borderTopRightRadius:20
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: s(11),
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'center',
  },
  headerLabelSm: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: s(11),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerLabelIcon: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: s(11),
    fontWeight: '700',
    width: s(24),
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: s(6),
  },
  nameCell: {
    color: '#FFF',
    fontSize: s(12),
    fontWeight: '600',
    flex: 1.2,
    textAlign: 'center',
  },
  cell: { color: '#FFF', fontSize: 13, flex: 1, textAlign: 'center' },
  diceCell: { flex: 1, alignItems: 'center' },
  diceCircle: {
    backgroundColor: '#FFF',
    width: s(24),
    height: s(24),
    borderRadius: s(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceText: { color: '#333', fontSize: s(12), fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  dropdown: {
    backgroundColor: '#FFF',
    borderRadius: s(12),
    paddingVertical: s(6),
    minWidth: s(160),
    elevation: 8,
  },
  dropdownItem: { paddingHorizontal: s(16), paddingVertical: s(10) },
  dropdownText: { color: '#333', fontSize: s(14), textAlign: 'center' },
  dropdownTextActive: { color: '#7149c8', fontWeight: 'bold' },
  emptyText: {
    color: '#FFF',
    fontSize: s(14),
    textAlign: 'center',
    marginTop: s(20),
  },
  dateControls: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  dateBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: s(4),
    paddingVertical: s(4),
    borderRadius: s(16),
    width: s(28),
    height: s(28),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  clearBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: s(4),
    paddingVertical: s(4),
    borderRadius: s(16),
    width: s(28),
    height: s(28),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  iosDatePickerContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: s(16),
    borderTopRightRadius: s(16),
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingVertical: s(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  iosDatePickerBtn: { color: '#7149c8', fontSize: s(16), fontWeight: '600' },
  // Detail modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
    paddingHorizontal: s(16),
    paddingVertical: s(16),
    maxHeight: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: s(16),
  },
  detailTitle: { fontSize: s(18), fontWeight: 'bold', color: '#333' },
  uploadImage: {
    width: '100%',
    height: s(200),
    borderRadius: s(12),
    marginBottom: s(16),
    backgroundColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: s(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: { color: '#888', fontSize: s(13) },
  detailValue: {
    color: '#333',
    fontSize: s(13),
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    gap: s(12),
    marginTop: s(20),
    marginBottom: s(10),
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: s(14),
    borderRadius: s(10),
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: s(14),
    borderRadius: s(10),
    alignItems: 'center',
  },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: s(14) },
  // Reject modal
  rejectModal: {
    backgroundColor: '#FFF',
    borderRadius: s(16),
    paddingHorizontal: s(20),
    paddingVertical: s(20),
    marginHorizontal: s(20),
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: s(12),
    fontSize: s(14),
    color: '#333',
    marginTop: s(12),
    marginBottom: s(4),
    minHeight: s(80),
    textAlignVertical: 'top',
  },
  // Expanded panel
  expandedPanel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: s(10),
    paddingHorizontal: s(12),
    paddingVertical: s(12),
    marginBottom: s(2),
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: s(6) },
  infoItem: { width: '50%', paddingVertical: s(4) },
  infoLabel: { color: 'rgba(255,255,255,0.6)', fontSize: s(16) },
  infoValue: { color: '#FFF', fontSize: s(14), fontWeight: '600' },
  reasonText: { color: '#F44336', fontSize: s(14), marginBottom: s(8) },
  imagesLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: s(14),
    marginBottom: s(6),
  },
  imagesRow: { marginBottom: s(10) },
  thumbImage: {
    width: s(100),
    height: s(140),
    borderRadius: s(8),
    marginRight: s(8),
    backgroundColor: '#333',
  },
  // Image viewer
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: s(50),
    right: s(16),
    zIndex: 10,
    paddingHorizontal: s(8),
    paddingVertical: s(8),
  },
  imageViewerCounter: {
    position: 'absolute',
    top: s(54),
    alignSelf: 'center',
    color: '#FFF',
    fontSize: s(14),
    fontWeight: 'bold',
    zIndex: 10,
  },
  imageViewerDots: {
    position: 'absolute',
    bottom: s(40),
    flexDirection: 'row',
    alignSelf: 'center',
    gap: s(6),
  },
  dot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFF',
    width: s(10),
    height: s(10),
    borderRadius: s(5),
  },
});

export default UploadsScreen;
