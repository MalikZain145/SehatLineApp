import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Image, StatusBar, SafeAreaView, Modal, Alert, RefreshControl, Platform, TextInput, Animated, TouchableWithoutFeedback, FlatList, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIZES, SHADOWS } from '../../../theme';
import tokenService from '../services/tokenService';
import { onQueueUpdate } from '../../../services/socket';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const HospitalHomeScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userName, setUserName] = useState('Guest');
  const [userData, setUserData] = useState(null);
  const [activeToken, setActiveToken] = useState(null);
  const prevTokenStatusRef = useRef(null);

  // Rotating general health tips for patients.
  const HEALTH_TIPS = [{
    icon: 'water-outline',
    color: '#00B4D8',
    text: 'Drink 8–10 glasses of water daily to stay hydrated.'
  }, {
    icon: 'walk-outline',
    color: '#10B981',
    text: '30 minutes of walking a day keeps your heart healthy.'
  }, {
    icon: 'nutrition-outline',
    color: '#F59E0B',
    text: 'Eat more fruits and vegetables for essential vitamins.'
  }, {
    icon: 'bed-outline',
    color: '#8B5CF6',
    text: 'Aim for 7–8 hours of sleep for better recovery.'
  }, {
    icon: 'heart-outline',
    color: '#EF4444',
    text: 'Get your blood pressure checked regularly.'
  }, {
    icon: 'fitness-outline',
    color: '#06B6D4',
    text: 'Reduce salt and sugar intake for a healthier heart.'
  }, {
    icon: 'happy-outline',
    color: '#EC4899',
    text: 'Take short breaks to reduce stress during the day.'
  }];
  const [tipIndex, setTipIndex] = useState(0);
  const [showTokenDetails, setShowTokenDetails] = useState(false);
  const [hasActiveToken, setHasActiveToken] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  // Today's hospital-wide stats — REAL, from backend + live socket.
  const [todayData, setTodayData] = useState({
    operations: {
      appointments: 0,
      tokensIssued: 0,
      patientsServed: 0,
      reportsUploaded: 0
    },
    queue: {
      serving: '—',
      yourToken: '—',
      ahead: 0,
      waitTime: 0
    }
  });

  // Live queue for 3 departments
  const [liveQueue, setLiveQueue] = useState([{
    id: 1,
    dept: 'Chronic OPD',
    current: '—',
    waiting: 0,
    time: '',
    color: COLORS.primary,
    icon: 'medical-outline',
    screen: 'LiveTokenQueueScreen',
    key: 'chronic_opd'
  }, {
    id: 2,
    dept: 'Pharmacy',
    current: '—',
    waiting: 0,
    time: '',
    color: '#F59E0B',
    icon: 'medkit-outline',
    screen: 'LiveTokenQueueScreen',
    key: 'pharmacy'
  }, {
    id: 3,
    dept: 'Laboratory',
    current: '—',
    waiting: 0,
    time: '',
    color: '#10B981',
    icon: 'flask-outline',
    screen: 'LiveTokenQueueScreen',
    key: 'laboratory'
  }]);

  // AI Health Tip - Replacing AI Insight
  const [aiHealthTip] = useState({
    title: '💡 AI Health Tip',
    message: 'Regular walking for 30 minutes daily can reduce heart disease risk by 30%. Start your wellness journey today!',
    icon: 'fitness-outline',
    color: COLORS.primary
  });

  // Quick Actions
  const quickActions = [{
    id: 1,
    name: 'Generate\nToken',
    icon: 'ticket-outline',
    color: COLORS.primary,
    screen: 'GenerateTokenScreen'
  }, {
    id: 2,
    name: 'Book\nAppointment',
    icon: 'calendar-outline',
    color: '#8B5CF6',
    screen: 'BookAppointmentScreen'
  }, {
    id: 3,
    name: 'Live\nQueue',
    icon: 'timer-outline',
    color: '#FF6B35',
    screen: 'LiveQueueScreen'
  }, {
    id: 4,
    name: 'Laboratory',
    icon: 'flask-outline',
    color: '#F59E0B',
    screen: 'LaboratoryScreen'
  }, {
    id: 5,
    name: 'Pharmacy',
    icon: 'medkit-outline',
    color: '#10B981',
    screen: 'PharmacyScreen'
  }, {
    id: 7,
    name: 'My\nReports',
    icon: 'document-text-outline',
    color: '#EF4444',
    screen: 'ReportsListScreen'
  }];

  // My Token Button
  const myTokenAction = {
    id: 8,
    name: 'My Token',
    icon: 'qr-code-outline',
    color: '#06B6D4'
  };

  // Hospital Modules
  const hospitalModules = [{
    id: 1,
    name: 'Chronic OPD',
    icon: 'medical-outline',
    color: '#8B5CF6',
    screen: 'ChronicDashboardScreen',
    desc: 'Chronic Disease Care'
  }, {
    id: 2,
    name: 'Laboratory',
    icon: 'flask-outline',
    color: '#10B981',
    screen: 'LabDashboardScreen',
    desc: 'Tests & Reports'
  }, {
    id: 3,
    name: 'Pharmacy',
    icon: 'medkit-outline',
    color: '#F59E0B',
    screen: 'PharmacyDashboardScreen',
    desc: 'Medicine Collection'
  }];

  // Search data
  const searchableItems = [{
    id: '1',
    name: 'Book Appointment',
    icon: 'calendar-outline',
    screen: 'BookAppointmentScreen'
  }, {
    id: '2',
    name: 'Chronic OPD',
    icon: 'medical-outline',
    screen: 'ChronicOPDScreen'
  }, {
    id: '3',
    name: 'Laboratory',
    icon: 'flask-outline',
    screen: 'LabDashboardScreen'
  }, {
    id: '4',
    name: 'Pharmacy',
    icon: 'medkit-outline',
    screen: 'PharmacyDashboardScreen'
  }, {
    id: '5',
    name: 'Live Queue',
    icon: 'timer-outline',
    screen: 'LiveTokenQueueScreen'
  }, {
    id: '6',
    name: 'Generate Token',
    icon: 'ticket-outline',
    screen: 'GenerateTokenScreen'
  }, {
    id: '7',
    name: 'My Reports',
    icon: 'document-text-outline',
    screen: 'ReportsListScreen'
  }, {
    id: '8',
    name: 'Profile',
    icon: 'person-outline',
    screen: 'ProfileScreen'
  }, {
    id: '9',
    name: 'Settings',
    icon: 'settings-outline',
    screen: 'SettingsScreen'
  }, {
    id: '10',
    name: 'Appointments',
    icon: 'list-outline',
    screen: 'AppointmentList'
  }, {
    id: '11',
    name: 'AI Health Tips',
    icon: 'bulb-outline',
    screen: 'AIHealthTipsScreen'
  }];

  // Side menu
  const menuItems = [{
    section: 'DASHBOARD',
    items: [{
      name: 'Home',
      icon: 'home-outline',
      screen: 'HospitalHome'
    }]
  }, {
    section: 'QUEUE MANAGEMENT',
    items: [{
      name: 'Generate Token',
      icon: 'ticket-outline',
      screen: 'GenerateTokenScreen'
    }, {
      name: 'My Token',
      icon: 'qr-code-outline',
      screen: 'GenerateTokenScreen'
    }, {
      name: 'Live Queue',
      icon: 'timer-outline',
      screen: 'LiveTokenQueueScreen'
    }, {
      name: 'Book Appointment',
      icon: 'calendar-outline',
      screen: 'BookAppointmentScreen'
    }, {
      name: 'Appointment History',
      icon: 'list-outline',
      screen: 'AppointmentList'
    }]
  }, {
    section: 'HOSPITAL MODULES',
    items: [{
      name: 'Chronic OPD',
      icon: 'medical-outline',
      screen: 'ChronicOPDScreen'
    }, {
      name: 'Laboratory',
      icon: 'flask-outline',
      screen: 'LabDashboardScreen'
    }, {
      name: 'Pharmacy',
      icon: 'medkit-outline',
      screen: 'PharmacyDashboardScreen'
    }]
  }, {
    section: 'PATIENT SERVICES',
    items: [{
      name: 'My Reports',
      icon: 'document-text-outline',
      screen: 'ReportsListScreen'
    }, {
      name: 'Notifications',
      icon: 'notifications-outline',
      screen: 'Notifications'
    }, {
      name: 'AI Health Tips',
      icon: 'bulb-outline',
      screen: 'AIHealthTipsScreen'
    }]
  }, {
    section: 'ACCOUNT',
    items: [{
      name: 'Profile',
      icon: 'person-outline',
      screen: 'ProfileScreen'
    }, {
      name: 'Settings',
      icon: 'settings-outline',
      screen: 'SettingsScreen'
    }, {
      name: 'Help',
      icon: 'help-circle-outline',
      screen: 'HelpSupportScreen'
    }, {
      name: 'Logout',
      icon: 'log-out-outline',
      screen: 'Logout',
      isLogout: true
    }]
  }];
  useEffect(() => {
    getUserData();
    loadAppointmentData();
    checkActiveToken();
    fetchStats();

    // Real-time stats + queue via socket + refetch on focus.
    const unsubQueue = onQueueUpdate(payload => {
      if (payload?.stats) applyStats(payload.stats);
      fetchLiveQueue();
      checkActiveToken();
    });
    const focusUnsub = navigation.addListener?.('focus', () => {
      fetchStats();
      fetchLiveQueue();
      checkActiveToken();
    });
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showMenu) {
        setShowMenu(false);
        return true;
      }
      if (showSearchModal) {
        setShowSearchModal(false);
        setSearchQuery('');
        setSearchResults([]);
        return true;
      }
      return false;
    });
    return () => {
      backHandler.remove();
      unsubQueue && unsubQueue();
      focusUnsub && focusUnsub();
    };
  }, []);

  // Map backend stats → todayData shape.
  const applyStats = stats => {
    setTodayData(prev => ({
      ...prev,
      operations: {
        appointments: stats.appointments ?? 0,
        tokensIssued: stats.tokens ?? 0,
        patientsServed: stats.served ?? 0,
        reportsUploaded: stats.reports ?? 0
      }
    }));
  };
  const fetchStats = async () => {
    try {
      const res = await tokenService.getStats();
      if (res?.stats) applyStats(res.stats);
    } catch (e) {/* offline — keep zeros */}
  };

  // Fetch REAL live queue from backend, and refresh periodically.
  const fetchLiveQueue = async () => {
    try {
      const res = await tokenService.getQueuesSummary();
      if (res?.queues) {
        setLiveQueue(prev => prev.map(item => {
          const match = res.queues.find(q => q.department === item.key);
          return match ? {
            ...item,
            current: match.nowServing,
            waiting: match.waiting,
            time: match.waiting > 0 ? `~${match.waiting * 5} min` : 'No wait'
          } : item;
        }));
      }
    } catch (e) {/* offline — keep placeholders */}
  };
  useEffect(() => {
    fetchLiveQueue();
    // Refresh live queue every 15s (socket also refreshes it on changes).
    const interval = setInterval(() => {
      fetchLiveQueue();
      checkActiveToken();
    }, 15000);
    return () => clearInterval(interval);
  }, []);
  const checkActiveToken = async () => {
    try {
      const res = await tokenService.getActive();
      if (res?.token) {
        const deptLabel = {
          chronic_opd: 'Chronic OPD',
          pharmacy: 'Pharmacy',
          laboratory: 'Laboratory',
          done: 'Completed'
        }[res.token.department] || res.token.department;
        setActiveToken({
          token: res.token.tokenNumber,
          tokenNumber: res.token.tokenNumber,
          department: deptLabel,
          status: res.token.status,
          stage: res.stage,
          time: res.isNext ? 'You are next' : `${res.ahead ?? 0} ahead`,
          _id: res.token._id
        });
        setHasActiveToken(true);

        // AUTO-NAVIGATE: when the doctor calls this patient (status becomes
        // "in-progress" / Now Serving), open the journey screen automatically.
        if (res.token.status === 'in-progress' && prevTokenStatusRef.current !== 'in-progress') {
          prevTokenStatusRef.current = res.token.status;
          navigation.navigate('TokenJourneyScreen');
        }
        prevTokenStatusRef.current = res.token.status;
      } else {
        setHasActiveToken(false);
        setActiveToken(null);
        prevTokenStatusRef.current = null;
      }
    } catch (e) {
      setHasActiveToken(false);
      setActiveToken(null);
    }
  };
  const getUserData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        setUserData(parsed);
        // Show only the FIRST name in the greeting.
        const firstName = (parsed.name || 'Guest').trim().split(/\s+/)[0];
        setUserName(firstName);
      }
    } catch (e) {
      console.log('getUserData error:', e);
    }
  };
  const loadAppointmentData = async () => {
    try {
      const stored = await AsyncStorage.getItem('appointments');
      if (stored) {
        const appointments = JSON.parse(stored);
        const active = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Pending');
        if (active.length > 0) {
          setActiveToken(active[active.length - 1]);
          setHasActiveToken(true);
        }
      }
    } catch (e) {
      console.log('loadAppointmentData error:', e);
    }
  };
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  const navigateTo = (screen, params = {}) => {
    if (!screen || !navigation) return;
    try {
      navigation.navigate(screen, params);
    } catch (e) {
      Alert.alert('Coming Soon', 'This feature is being updated.');
    }
  };
  const handleSearch = query => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchResults(searchableItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase())));
  };
  const handleSearchItemPress = item => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    navigateTo(item.screen);
  };
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Logout',
      style: 'destructive',
      onPress: async () => {
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('activeToken');
        navigation.replace('Login');
      }
    }]);
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointmentData();
    await getUserData();
    await checkActiveToken();
    setTimeout(() => setRefreshing(false), 800);
  };

  // ── RENDERS ──────────────────────────────────────────────────────────

  const renderHeader = () => <View style={styles.headerContainer}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowMenu(true)}>
          <Ionicons name="menu-outline" size={wp(5.5)} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle}>
            <Image source={require('../../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.logoText}>Sehat<Text style={{
              color: 'rgba(255,255,255,0.8)'
            }}>Line</Text></Text>
            <Text style={styles.logoSub}>CDA Hospital Islamabad</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearchModal(true)}>
            <Ionicons name="search-outline" size={wp(5)} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigateTo('SettingsScreen')}>
            <Ionicons name="settings-outline" size={wp(5)} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greetingHello}>{greeting()},</Text>
          <Text style={styles.greetingName}>{userName} 👋</Text>
          <Text style={styles.greetingSub}>CDA Hospital Islamabad</Text>
        </View>
      </View>
    </View>;
  const renderTodayStats = () => <View style={styles.statsContainer}>
      {[{
      label: 'Appointments',
      value: todayData.operations.appointments,
      color: COLORS.primary
    }, {
      label: 'Tokens',
      value: todayData.operations.tokensIssued,
      color: '#8B5CF6'
    }, {
      label: 'Served',
      value: todayData.operations.patientsServed,
      color: '#34D399'
    }, {
      label: 'Reports',
      value: todayData.operations.reportsUploaded,
      color: '#F59E0B'
    }].map(item => <View key={item.label} style={styles.statBox}>
          <Text style={[styles.statNumber, {
        color: item.color
      }]}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>)}
    </View>;

  // Compact banner shown ABOVE quick actions when a token journey is active.
  const renderActiveTokenBanner = () => {
    if (!hasActiveToken || !activeToken) return null;
    const stageColors = {
      'Waiting': '#F59E0B',
      'Now Serving': '#10B981',
      'Pharmacy': '#8B5CF6',
      'Laboratory': '#EF4444',
      'Pharmacy Done': '#8B5CF6'
    };
    const stageColor = stageColors[activeToken.stage] || COLORS.primary;
    return <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('TokenJourneyScreen')} style={styles.activeBannerWrap}>
        <LinearGradient colors={[COLORS.secondary, COLORS.primary]} start={{
        x: 0,
        y: 0
      }} end={{
        x: 1,
        y: 1
      }} style={styles.activeBanner}>
          <View style={styles.activeBannerLeft}>
            <View style={styles.activeBannerIconWrap}>
              <Ionicons name="ticket" size={22} color="#FFF" />
            </View>
            <View>
              <Text style={styles.activeBannerLabel}>Active Token</Text>
              <Text style={styles.activeBannerToken}>{activeToken.token}</Text>
            </View>
          </View>
          <View style={styles.activeBannerRight}>
            <View style={[styles.activeBannerPill, {
            backgroundColor: 'rgba(255,255,255,0.2)'
          }]}>
              <View style={[styles.activeBannerDot, {
              backgroundColor: stageColor
            }]} />
              <Text style={styles.activeBannerStage}>{activeToken.stage || 'Waiting'}</Text>
            </View>
            <Text style={styles.activeBannerAhead}>{activeToken.time}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>;
  };
  const renderMyToken = () => {
    if (!hasActiveToken || !activeToken) return null;
    return <View style={[styles.tokenCard, SHADOWS.medium]}>
        <View style={styles.tokenHeader}>
          <Text style={styles.tokenTitle}>My Active Token</Text>
          <TouchableOpacity onPress={() => navigateTo('GenerateTokenScreen')}>
            <Text style={styles.tokenViewAll}>Manage →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tokenContent}>
          <View style={styles.tokenLeft}>
            <Text style={styles.tokenNumber}>{activeToken.token || '---'}</Text>
            <Text style={[styles.tokenStatus, {
            color: '#34D399'
          }]}>
              ● Active
            </Text>
            <View style={styles.tokenInfoRow}>
              <Text style={styles.tokenInfoText}>{activeToken.department || 'OPD'}</Text>
              <Text style={styles.tokenInfoText}>•</Text>
              <Text style={styles.tokenInfoText}>{activeToken.time || 'N/A'}</Text>
            </View>
          </View>
          <Ionicons name="qr-code" size={wp(13)} color={COLORS.primary} />
        </View>
        <View style={styles.tokenActions}>
          <TouchableOpacity style={[styles.tokenActionBtn, {
          borderColor: COLORS.primary
        }]} onPress={() => Alert.alert('Download', 'Token PDF downloading...')}>
            <Ionicons name="download-outline" size={wp(3.5)} color={COLORS.primary} />
            <Text style={[styles.tokenActionText, {
            color: COLORS.primary
          }]}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tokenActionBtn, {
          borderColor: COLORS.primary
        }]} onPress={() => Alert.alert('Share', 'Sharing token...')}>
            <Ionicons name="share-outline" size={wp(3.5)} color={COLORS.primary} />
            <Text style={[styles.tokenActionText, {
            color: COLORS.primary
          }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tokenActionBtn, {
          backgroundColor: COLORS.primary
        }]} onPress={() => navigateTo('LiveTokenQueueScreen')}>
            <Ionicons name="timer-outline" size={wp(3.5)} color={COLORS.white} />
            <Text style={[styles.tokenActionText, {
            color: COLORS.white
          }]}>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tokenActionBtn, {
          borderColor: '#EF4444'
        }]} onPress={() => {
          Alert.alert('Cancel Token', 'Are you sure?', [{
            text: 'No',
            style: 'cancel'
          }, {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.removeItem('activeToken');
              setHasActiveToken(false);
              setActiveToken(null);
            }
          }]);
        }}>
            <Ionicons name="close-outline" size={wp(3.5)} color="#EF4444" />
            <Text style={[styles.tokenActionText, {
            color: '#EF4444'
          }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>;
  };
  const renderMyTokenButton = () => {
    const hasToken = !!activeToken;
    return <TouchableOpacity style={[styles.myTokenButton, SHADOWS.small]} onPress={() => setShowTokenDetails(!showTokenDetails)} activeOpacity={0.8}>
        <View style={[styles.myTokenIcon, {
        backgroundColor: myTokenAction.color + '18'
      }]}>
          <Ionicons name={myTokenAction.icon} size={wp(5.5)} color={myTokenAction.color} />
        </View>
        <View style={styles.myTokenContent}>
          <Text style={styles.myTokenName}>My Token</Text>
          {hasToken ? <Text style={styles.myTokenValue}>{activeToken.token}</Text> : <Text style={styles.myTokenNoToken}>No Token</Text>}
        </View>
        <Ionicons name={showTokenDetails ? 'chevron-up' : 'chevron-down'} size={wp(5)} color={COLORS.textLight} />
      </TouchableOpacity>;
  };
  const renderTokenDetailsPopup = () => {
    if (!showTokenDetails || !activeToken) return null;
    return <View style={[styles.tokenDetailsPopup, SHADOWS.medium]}>
        <View style={styles.popupHeader}>
          <Text style={styles.popupTitle}>Token Details</Text>
          <TouchableOpacity onPress={() => setShowTokenDetails(false)}>
            <Ionicons name="close" size={wp(5)} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
        <View style={styles.popupRow}>
          <Text style={styles.popupLabel}>Token Number</Text>
          <Text style={styles.popupValue}>{activeToken.token}</Text>
        </View>
        <View style={styles.popupRow}>
          <Text style={styles.popupLabel}>Department</Text>
          <Text style={styles.popupValue}>{activeToken.department || 'OPD'}</Text>
        </View>
        <View style={styles.popupRow}>
          <Text style={styles.popupLabel}>Time</Text>
          <Text style={styles.popupValue}>{activeToken.time || 'N/A'}</Text>
        </View>
        <View style={styles.popupRow}>
          <Text style={styles.popupLabel}>Status</Text>
          <Text style={[styles.popupValue, {
          color: '#34D399'
        }]}>Active</Text>
        </View>
        <TouchableOpacity style={styles.popupAction} onPress={() => navigateTo('LiveTokenQueueScreen')}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.popupGradient}>
            <Text style={styles.popupActionText}>View in Queue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>;
  };
  const renderQuickActions = () => <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickGrid}>
        {quickActions.map(item => <TouchableOpacity key={item.id} style={[styles.quickCard, SHADOWS.small]} onPress={() => navigateTo(item.screen)} activeOpacity={0.8}>
            <View style={[styles.quickIcon, {
          backgroundColor: item.color + '18'
        }]}>
              <Ionicons name={item.icon} size={wp(5.5)} color={item.color} />
            </View>
            <Text style={styles.quickName}>{item.name}</Text>
          </TouchableOpacity>)}
        {renderMyTokenButton()}
      </View>
      {renderTokenDetailsPopup()}
    </View>;

  // ─── AI HEALTH TIP - Replacing AI Queue Insight ──────────────────
  const renderAIHealthTip = () => <TouchableOpacity style={[styles.aiTipCard, SHADOWS.medium]} onPress={() => navigateTo('AIHealthTipsScreen')} activeOpacity={0.85}>
      <LinearGradient colors={[aiHealthTip.color + '12', COLORS.secondary + '08']} style={styles.aiTipGradient}>
        <View style={styles.aiTipHeader}>
          <View style={[styles.aiTipIcon, {
          backgroundColor: aiHealthTip.color + '18'
        }]}>
            <Ionicons name={aiHealthTip.icon} size={wp(5)} color={aiHealthTip.color} />
          </View>
          <Text style={styles.aiTipTitle}>{aiHealthTip.title}</Text>
          <Ionicons name="chevron-forward" size={wp(4.5)} color={COLORS.textLight} />
        </View>
        <Text style={styles.aiTipMessage}>{aiHealthTip.message}</Text>
      </LinearGradient>
    </TouchableOpacity>;

  // General health tip card (rotates), shown above hospital modules.
  const renderHealthTip = () => {
    const tip = HEALTH_TIPS[tipIndex % HEALTH_TIPS.length];
    return <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="bulb" size={wp(4.2)} color="#F59E0B" />
            <Text style={styles.sectionTitle}>  Health Tip</Text>
          </View>
          <TouchableOpacity onPress={() => setTipIndex(i => (i + 1) % HEALTH_TIPS.length)}>
            <Ionicons name="refresh" size={wp(4.5)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.healthTipCard, SHADOWS.small]}>
          <View style={[styles.healthTipIcon, {
          backgroundColor: tip.color + '18'
        }]}>
            <Ionicons name={tip.icon} size={wp(6)} color={tip.color} />
          </View>
          <Text style={styles.healthTipText}>{tip.text}</Text>
        </View>
      </View>;
  };
  const renderModules = () => <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hospital Modules</Text>
      <View style={styles.modulesRow}>
        {hospitalModules.map(item => <TouchableOpacity key={item.id} style={[styles.moduleCard, SHADOWS.medium, {
        borderColor: item.color + '40'
      }]} onPress={() => navigateTo(item.screen)} activeOpacity={0.85}>
            <LinearGradient colors={[item.color + '18', 'transparent']} style={styles.moduleGradient}>
              <View style={[styles.moduleIcon, {
            backgroundColor: item.color + '18'
          }]}>
                <Ionicons name={item.icon} size={wp(6.5)} color={item.color} />
              </View>
              <Text style={styles.moduleName}>{item.name}</Text>
              <Text style={styles.moduleDesc}>{item.desc}</Text>
              <Text style={[styles.moduleOpen, {
            color: item.color
          }]}>Open →</Text>
            </LinearGradient>
          </TouchableOpacity>)}
      </View>
    </View>;
  const renderLiveQueue = () => <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.liveDot} />
          <Text style={styles.sectionTitle}>Live Queue Status</Text>
        </View>
        <TouchableOpacity onPress={() => navigateTo('LiveQueueScreen')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {liveQueue.map(item => <TouchableOpacity key={item.id} style={[styles.queueCard, SHADOWS.small, {
      borderLeftColor: item.color,
      borderLeftWidth: 4
    }]} onPress={() => navigateTo('LiveQueueScreen', {
      department: item.dept,
      departmentId: item.id
    })} activeOpacity={0.85}>
          <View style={styles.queueLeft}>
            <View style={[styles.queueIcon, {
          backgroundColor: item.color + '18'
        }]}>
              <Ionicons name={item.icon} size={wp(4.5)} color={item.color} />
            </View>
            <View>
              <Text style={styles.queueDept}>{item.dept}</Text>
              <Text style={styles.queueCurrent}>Serving: <Text style={{
              color: item.color,
              fontWeight: '700'
            }}>{item.current}</Text></Text>
            </View>
          </View>
          <View style={styles.queueRight}>
            <Text style={styles.queueWait}>{item.waiting} ahead</Text>
            <Text style={[styles.queueTime, {
          color: item.color
        }]}>{item.time}</Text>
          </View>
        </TouchableOpacity>)}
    </View>;
  const renderAnnouncements = () => <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Announcements</Text>
        <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
      </View>
      {[{
      dot: '#EF4444',
      title: 'Lab Counter 2 Unavailable',
      sub: 'Patients shifted to Counter 1'
    }, {
      dot: '#F59E0B',
      title: 'Pharmacy Queue Delayed',
      sub: '15 min extra wait expected'
    }, {
      dot: '#10B981',
      title: 'Reports Ready',
      sub: '3 reports ready at Lab Counter'
    }].map((item, i) => <View key={i} style={[styles.announceCard, SHADOWS.small]}>
          <View style={[styles.announceDot, {
        backgroundColor: item.dot
      }]} />
          <View style={{
        flex: 1
      }}>
            <Text style={styles.announceTitle}>{item.title}</Text>
            <Text style={styles.announceSub}>{item.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={wp(4)} color={COLORS.textLight} />
        </View>)}
    </View>;

  // ── MODALS ──────────────────────────────────────────────────────────

  const renderSearchModal = () => <Modal visible={showSearchModal} transparent animationType="fade" onRequestClose={() => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  }}>
      <TouchableWithoutFeedback onPress={() => {
      setShowSearchModal(false);
      setSearchQuery('');
      setSearchResults([]);
    }}>
        <View style={styles.searchOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.searchModal, SHADOWS.large]}>
              <View style={styles.searchInputRow}>
                <View style={styles.searchInputWrap}>
                  <Ionicons name="search-outline" size={wp(5)} color={COLORS.textSecondary} />
                  <TextInput style={styles.searchInput} placeholder="Search services..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={handleSearch} autoFocus />
                  {searchQuery.length > 0 && <TouchableOpacity onPress={() => handleSearch('')}>
                      <Ionicons name="close-circle" size={wp(5)} color={COLORS.textLight} />
                    </TouchableOpacity>}
                </View>
                <TouchableOpacity onPress={() => {
                setShowSearchModal(false);
                setSearchQuery('');
                setSearchResults([]);
              }}>
                  <Text style={styles.searchCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {searchResults.length > 0 ? <ScrollView style={styles.searchResultsList} showsVerticalScrollIndicator={false}>
                  {searchResults.map(item => <TouchableOpacity key={item.id} style={styles.searchResultItem} onPress={() => handleSearchItemPress(item)}>
                      <View style={[styles.searchResultIcon, {
                  backgroundColor: COLORS.primary + '15'
                }]}>
                        <Ionicons name={item.icon} size={wp(5)} color={COLORS.primary} />
                      </View>
                      <Text style={styles.searchResultName}>{item.name}</Text>
                      <Ionicons name="chevron-forward" size={wp(4)} color={COLORS.textLight} />
                    </TouchableOpacity>)}
                </ScrollView> : <View style={styles.searchEmpty}>
                  <Ionicons name={searchQuery ? 'search-outline' : 'compass-outline'} size={wp(12)} color={COLORS.textLight} />
                  <Text style={styles.searchEmptyText}>{searchQuery ? 'No results found' : 'Search for services'}</Text>
                </View>}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>;
  const renderSideMenu = () => <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
      <View style={styles.menuOverlay}>
        <View style={styles.menuContainer}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.menuHeader}>
            <View style={styles.menuLogoCircle}>
              <Image source={require('../../../assets/logo.png')} style={styles.menuLogo} resizeMode="contain" />
            </View>
            <Text style={styles.menuHospital}>SehatLine</Text>
            <Text style={styles.menuAddress}>CDA Hospital, Islamabad</Text>
            <TouchableOpacity style={styles.closeMenuBtn} onPress={() => setShowMenu(false)}>
              <Ionicons name="close-circle" size={wp(7)} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.menuScroll}>
            {menuItems.map((section, idx) => <View key={idx} style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{section.section}</Text>
                {section.items.map((item, index) => <TouchableOpacity key={index} style={styles.menuItem} onPress={() => {
              setShowMenu(false);
              if (item.isLogout) {
                handleLogout();
              } else {
                setTimeout(() => navigateTo(item.screen), 250);
              }
            }}>
                    <View style={[styles.menuItemIcon, item.isLogout && {
                backgroundColor: '#EF444415'
              }]}>
                      <Ionicons name={item.icon} size={wp(4)} color={item.isLogout ? '#EF4444' : COLORS.primary} />
                    </View>
                    <Text style={[styles.menuItemText, item.isLogout && {
                color: '#EF4444'
              }]}>{item.name}</Text>
                    {!item.isLogout && <Ionicons name="chevron-forward" size={wp(3.5)} color={COLORS.textLight} />}
                  </TouchableOpacity>)}
              </View>)}
            <View style={{
            height: hp(4)
          }} />
          </ScrollView>
        </View>
        <TouchableOpacity style={styles.menuBackdrop} onPress={() => setShowMenu(false)} />
      </View>
    </Modal>;

  // ── ROOT ──────────────────────────────────────────────────────────────
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.background]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 0,
      y: 0.45
    }} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}

        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.white} />} contentContainerStyle={styles.scrollContent}>
          {renderTodayStats()}
          {renderActiveTokenBanner()}
          {renderQuickActions()}
          {renderHealthTip()}
          {renderModules()}
          {renderLiveQueue()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>SehatLine v2.0</Text>
            <Text style={styles.footerSub}>CDA Hospital • Islamabad</Text>
          </View>
        </ScrollView>

        {/* Bottom Tab */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.bottomTab} onPress={() => navigation.navigate('HospitalHome')}>
            <Ionicons name="home" size={wp(5.5)} color={COLORS.primary} />
            <Text style={[styles.bottomLabel, styles.activeLabel]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomTab} onPress={() => navigateTo('BookAppointmentScreen')}>
            <Ionicons name="calendar-outline" size={wp(5.5)} color={COLORS.textSecondary} />
            <Text style={styles.bottomLabel}>Book</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomTabCenter} onPress={() => navigateTo('GenerateTokenScreen')}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.bottomCenterBtn}>
              <Ionicons name="ticket-outline" size={wp(6)} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomTab} onPress={() => navigateTo('LiveTokenQueueScreen')}>
            <Ionicons name="timer-outline" size={wp(5.5)} color={COLORS.textSecondary} />
            <Text style={styles.bottomLabel}>Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomTab} onPress={() => navigateTo('ProfileScreen')}>
            <Ionicons name="person-outline" size={wp(5.5)} color={COLORS.textSecondary} />
            <Text style={styles.bottomLabel}>Profile</Text>
          </TouchableOpacity>
        </View>

        {renderSideMenu()}
        {renderSearchModal()}
      </SafeAreaView>
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  safeArea: {
    flex: 1,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  scrollContent: {
    paddingBottom: hp(10),
    paddingTop: hp(0.5)
  },
  // ─── HEADER ──────────────────────────────────────────────────────
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? hp(0.5) : 0,
    paddingBottom: hp(0.5)
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    marginBottom: hp(0.8)
  },
  iconBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5)
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5)
  },
  logoCircle: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden'
  },
  logoImage: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    resizeMode: 'contain'
  },
  logoText: {
    color: COLORS.white,
    fontSize: wp(4.5),
    fontWeight: '900',
    letterSpacing: 0.5
  },
  logoSub: {
    color: COLORS.white,
    fontSize: wp(2.2),
    opacity: 0.85,
    marginTop: hp(0.05)
  },
  greetingRow: {
    paddingHorizontal: wp(4),
    marginTop: hp(0.5)
  },
  greetingHello: {
    color: COLORS.white,
    fontSize: wp(3),
    fontWeight: '500',
    opacity: 0.9
  },
  greetingName: {
    color: COLORS.white,
    fontSize: wp(4.8),
    fontWeight: '800'
  },
  greetingSub: {
    color: COLORS.white,
    fontSize: wp(2.5),
    opacity: 0.7,
    marginTop: hp(0.05)
  },
  // ─── ACTIVE TOKEN BANNER ────────────────────────────────────────
  activeBannerWrap: {
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0077B6',
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.2,
        shadowRadius: 10
      },
      android: {
        elevation: 4
      }
    })
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6)
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  activeBannerIconWrap: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3)
  },
  activeBannerLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: wp(2.8),
    fontWeight: '600'
  },
  activeBannerToken: {
    color: '#FFF',
    fontSize: wp(5),
    fontWeight: '900',
    letterSpacing: -0.5
  },
  activeBannerRight: {
    alignItems: 'flex-end',
    marginRight: wp(2)
  },
  activeBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: 12,
    marginBottom: hp(0.4)
  },
  activeBannerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5
  },
  activeBannerStage: {
    color: '#FFF',
    fontSize: wp(2.7),
    fontWeight: '700'
  },
  activeBannerAhead: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: wp(2.5),
    fontWeight: '500'
  },
  // ─── HEALTH TIP ─────────────────────────────────────────────────
  healthTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: wp(3.5),
    gap: wp(3)
  },
  healthTipIcon: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    justifyContent: 'center',
    alignItems: 'center'
  },
  healthTipText: {
    flex: 1,
    fontSize: wp(3.3),
    color: COLORS.text,
    lineHeight: wp(4.8),
    fontWeight: '500'
  },
  // ─── STATS ──────────────────────────────────────────────────────
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    marginBottom: hp(1.2)
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: wp(2.5),
    padding: wp(2.5),
    alignItems: 'center',
    marginHorizontal: wp(0.5),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1
        },
        shadowOpacity: 0.06,
        shadowRadius: 3
      },
      android: {
        elevation: 2
      }
    })
  },
  statNumber: {
    fontSize: wp(4.5),
    fontWeight: '800'
  },
  statLabel: {
    fontSize: wp(2.3),
    color: COLORS.textSecondary,
    marginTop: hp(0.05)
  },
  // ─── TOKEN CARD ──────────────────────────────────────────────
  tokenCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3.5),
    padding: wp(3.5),
    marginHorizontal: wp(4),
    marginBottom: hp(1.2),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5)
  },
  tokenTitle: {
    fontSize: wp(4),
    fontWeight: '700',
    color: COLORS.text
  },
  tokenViewAll: {
    fontSize: wp(3),
    color: COLORS.primary,
    fontWeight: '600'
  },
  tokenContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tokenLeft: {
    flex: 1
  },
  tokenNumber: {
    fontSize: wp(7),
    fontWeight: '900',
    color: COLORS.text
  },
  tokenStatus: {
    fontSize: wp(2.8),
    fontWeight: '600',
    marginTop: hp(0.05)
  },
  tokenInfoRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(0.1)
  },
  tokenInfoText: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary
  },
  tokenActions: {
    flexDirection: 'row',
    gap: wp(1.5),
    marginTop: hp(0.8),
    flexWrap: 'wrap'
  },
  tokenActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.35),
    borderRadius: wp(2),
    borderWidth: 1.5
  },
  tokenActionText: {
    fontSize: wp(2.4),
    fontWeight: '600'
  },
  // ─── SECTION ──────────────────────────────────────────────────
  section: {
    paddingHorizontal: wp(4),
    marginBottom: hp(1.2)
  },
  sectionTitle: {
    fontSize: wp(4),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(0.6)
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.6)
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5)
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: wp(3),
    fontWeight: '600'
  },
  liveDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
    backgroundColor: '#EF4444'
  },
  // ─── QUICK ACTIONS ──────────────────────────────────────────
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  quickCard: {
    width: (width - wp(12)) / 4,
    backgroundColor: COLORS.card,
    borderRadius: wp(2.5),
    padding: wp(1.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: hp(0.6)
  },
  quickIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    justifyContent: 'center',
    alignItems: 'center'
  },
  quickName: {
    fontSize: wp(2.3),
    color: COLORS.text,
    textAlign: 'center',
    marginTop: hp(0.15),
    fontWeight: '500'
  },
  // ─── MY TOKEN BUTTON ────────────────────────────────────────
  myTokenButton: {
    width: (width - wp(12)) / 4,
    backgroundColor: COLORS.card,
    borderRadius: wp(2.5),
    padding: wp(1.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: hp(0.6)
  },
  myTokenIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    justifyContent: 'center',
    alignItems: 'center'
  },
  myTokenContent: {
    alignItems: 'center',
    marginTop: hp(0.1)
  },
  myTokenName: {
    fontSize: wp(2.3),
    color: COLORS.text,
    fontWeight: '500'
  },
  myTokenValue: {
    fontSize: wp(3),
    fontWeight: '800',
    color: '#06B6D4',
    marginTop: hp(0.05)
  },
  myTokenNoToken: {
    fontSize: wp(2.3),
    color: COLORS.textLight,
    marginTop: hp(0.05)
  },
  // ─── TOKEN DETAILS POPUP ────────────────────────────────────
  tokenDetailsPopup: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    padding: wp(3),
    marginTop: hp(0.3),
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%'
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5),
    paddingBottom: hp(0.3),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  popupTitle: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text
  },
  popupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp(0.2)
  },
  popupLabel: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary
  },
  popupValue: {
    fontSize: wp(3),
    fontWeight: '600',
    color: COLORS.text
  },
  popupAction: {
    marginTop: hp(0.5),
    borderRadius: wp(2),
    overflow: 'hidden'
  },
  popupGradient: {
    paddingVertical: hp(0.6),
    alignItems: 'center'
  },
  popupActionText: {
    color: COLORS.white,
    fontSize: wp(3),
    fontWeight: '600'
  },
  // ─── AI HEALTH TIP - New Styles ─────────────────────────────
  aiTipCard: {
    marginHorizontal: wp(4),
    marginBottom: hp(1.2),
    borderRadius: wp(3.5),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card
  },
  aiTipGradient: {
    padding: wp(3.5)
  },
  aiTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.3)
  },
  aiTipIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2)
  },
  aiTipTitle: {
    flex: 1,
    fontSize: wp(3.5),
    fontWeight: '700',
    color: COLORS.text
  },
  aiTipMessage: {
    fontSize: wp(3),
    color: COLORS.textSecondary,
    paddingLeft: wp(2),
    lineHeight: hp(2)
  },
  // ─── MODULES ──────────────────────────────────────────────────
  modulesRow: {
    flexDirection: 'row',
    gap: wp(2.5)
  },
  moduleCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: wp(3),
    overflow: 'hidden',
    borderWidth: 1.5
  },
  moduleGradient: {
    padding: wp(3)
  },
  moduleIcon: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(2.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.4)
  },
  moduleName: {
    fontSize: wp(3.2),
    fontWeight: '700',
    color: COLORS.text
  },
  moduleDesc: {
    fontSize: wp(2.3),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  moduleOpen: {
    fontSize: wp(2.6),
    fontWeight: '700',
    marginTop: hp(0.4)
  },
  // ─── LIVE QUEUE ──────────────────────────────────────────────
  queueCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: wp(2.5),
    padding: wp(2.5),
    marginBottom: hp(0.6),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1
        },
        shadowOpacity: 0.05,
        shadowRadius: 3
      },
      android: {
        elevation: 2
      }
    })
  },
  queueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5)
  },
  queueIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.25),
    justifyContent: 'center',
    alignItems: 'center'
  },
  queueDept: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.text
  },
  queueCurrent: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary,
    marginTop: hp(0.1)
  },
  queueRight: {
    alignItems: 'flex-end'
  },
  queueWait: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary,
    fontWeight: '500'
  },
  queueTime: {
    fontSize: wp(2.8),
    fontWeight: '700'
  },
  // ─── ANNOUNCEMENTS ──────────────────────────────────────────
  announceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: wp(2.5),
    borderRadius: wp(2.5),
    marginBottom: hp(0.5),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  announceDot: {
    width: wp(1),
    height: hp(4),
    borderRadius: wp(0.5),
    marginRight: wp(2.5)
  },
  announceTitle: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.text
  },
  announceSub: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary,
    marginTop: hp(0.05)
  },
  // ─── FOOTER ──────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: wp(4),
    marginTop: hp(0.5)
  },
  footerText: {
    color: COLORS.primary,
    fontSize: wp(3),
    fontWeight: '600'
  },
  footerSub: {
    color: COLORS.textSecondary,
    fontSize: wp(2.3),
    marginTop: hp(0.1)
  },
  // ─── BOTTOM BAR ──────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingTop: hp(0.6),
    paddingBottom: Platform.OS === 'ios' ? hp(3) : hp(0.8),
    paddingHorizontal: wp(1),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2
        },
        shadowOpacity: 0.08,
        shadowRadius: 8
      },
      android: {
        elevation: 8
      }
    })
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(0.1)
  },
  bottomTabCenter: {
    flex: 1,
    alignItems: 'center',
    marginTop: -hp(2.5)
  },
  bottomCenterBtn: {
    width: wp(13),
    height: wp(13),
    borderRadius: wp(6.5),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.4,
        shadowRadius: 8
      },
      android: {
        elevation: 8
      }
    })
  },
  bottomLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(2.1),
    marginTop: hp(0.1),
    fontWeight: '500'
  },
  activeLabel: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  // ─── SIDE MENU ──────────────────────────────────────────────
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row'
  },
  menuContainer: {
    width: width * 0.78,
    height: '100%',
    backgroundColor: COLORS.card
  },
  menuBackdrop: {
    flex: 1
  },
  menuHeader: {
    paddingTop: Platform.OS === 'ios' ? hp(5) : hp(3),
    paddingBottom: hp(2),
    alignItems: 'center',
    position: 'relative'
  },
  menuLogoCircle: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.5),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden'
  },
  menuLogo: {
    width: wp(13),
    height: wp(13),
    resizeMode: 'contain'
  },
  menuHospital: {
    color: COLORS.white,
    fontSize: wp(4.2),
    fontWeight: '800'
  },
  menuAddress: {
    color: COLORS.white,
    fontSize: wp(2.6),
    marginTop: hp(0.1),
    opacity: 0.85
  },
  closeMenuBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? hp(5) : hp(3),
    right: wp(3)
  },
  menuScroll: {
    flex: 1
  },
  menuSection: {
    marginBottom: hp(0.2)
  },
  menuSectionTitle: {
    fontSize: wp(2.8),
    fontWeight: '800',
    color: '#1E293B',
    paddingHorizontal: wp(4),
    paddingTop: hp(0.8),
    paddingBottom: hp(0.1),
    letterSpacing: 0.5
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(4),
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    gap: wp(2.5)
  },
  menuItemIcon: {
    width: wp(7.5),
    height: wp(7.5),
    borderRadius: wp(2),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '12'
  },
  menuItemText: {
    flex: 1,
    color: COLORS.text,
    fontSize: wp(3),
    fontWeight: '500'
  },
  // ─── SEARCH MODAL ──────────────────────────────────────────
  searchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-start'
  },
  searchModal: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: wp(5),
    borderBottomRightRadius: wp(5),
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(5) : hp(2.5),
    paddingBottom: hp(2),
    maxHeight: height * 0.82
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    marginBottom: hp(1)
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary || '#F5F6FA',
    borderRadius: wp(2.5),
    paddingHorizontal: wp(2.5),
    gap: wp(1.5),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: wp(3.2),
    paddingVertical: Platform.OS === 'ios' ? hp(0.7) : hp(0.4)
  },
  searchCancel: {
    color: COLORS.primary,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  searchResultsList: {
    maxHeight: height * 0.58
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.9),
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    gap: wp(3)
  },
  searchResultIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.25),
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchResultName: {
    flex: 1,
    color: COLORS.text,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  searchEmpty: {
    alignItems: 'center',
    paddingVertical: hp(4),
    gap: hp(0.5)
  },
  searchEmptyText: {
    color: COLORS.textSecondary,
    fontSize: wp(3.5),
    fontWeight: '600'
  }
});
export default HospitalHomeScreen;