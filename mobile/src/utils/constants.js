import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { TAWK_PROPERTY_ID_DEFAULT, TAWK_WIDGET_ID_DEFAULT, buildTawkChatUrl } from './tawk';

const extra = Constants.expoConfig?.extra ?? Constants.expoGoConfig?.extra ?? {};

const getDevHost = () => {
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri ??
    Constants.linkingUri;

  if (debuggerHost) {
    const host = debuggerHost.replace(/^https?:\/\//, '').split(':')[0];
    if (host && host !== 'localhost') {
      return host;
    }
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
};

const DEV_API_PORT = extra.apiPort || '5003';

const resolveApiBaseUrl = () => {
  if (extra.apiUrl) return extra.apiUrl.replace(/\/$/, '');
  if (__DEV__) return `http://${getDevHost()}:${DEV_API_PORT}/api`;
  return 'https://pingload.top/api';
};

export const API_BASE_URL = resolveApiBaseUrl();

export const APP_DOMAIN = extra.appDomain || 'pingload.top';
export const PRIVACY_POLICY_URL = extra.privacyPolicyUrl || `https://${APP_DOMAIN}/privacy`;
export const TERMS_URL = extra.termsUrl || `https://${APP_DOMAIN}/terms`;

export const TAWK_PROPERTY_ID = extra.tawkPropertyId || TAWK_PROPERTY_ID_DEFAULT;
export const TAWK_WIDGET_ID = extra.tawkWidgetId || TAWK_WIDGET_ID_DEFAULT;
export const TAWK_CHAT_URL = buildTawkChatUrl(TAWK_PROPERTY_ID, TAWK_WIDGET_ID);

const supportWhatsapp = extra.supportWhatsapp || '';
const supportEmail = extra.supportEmail || 'support@pingload.top';

export const SUPPORT_CHANNELS = [
  ...(supportWhatsapp ? [{
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'logo-whatsapp',
    color: '#25D366',
    url: `https://wa.me/${supportWhatsapp.replace(/\D/g, '')}`,
  }] : []),
  {
    id: 'email',
    name: 'Email Support',
    icon: 'mail',
    color: '#0052CC',
    url: `mailto:${supportEmail}`,
  },
  { id: 'chat', name: 'Live Chat', icon: 'chatbubbles', color: '#FF6B00', screen: 'LiveChat' },
];

export const NETWORKS = [
  { id: 'mtn', name: 'MTN', color: '#FFCC00' },
  { id: 'airtel', name: 'Airtel', color: '#ED1C24' },
  { id: 'glo', name: 'Glo', color: '#00B140' },
  { id: '9mobile', name: '9mobile', color: '#006633' },
];

export const ELECTRICITY_PROVIDERS = [
  { id: 'ikeja', name: 'Ikeja Electric', color: '#F59E0B' },
  { id: 'eko', name: 'Eko Electric', color: '#2563EB' },
  { id: 'abuja', name: 'Abuja Electric', color: '#DC2626' },
  { id: 'kaduna', name: 'Kaduna Electric', color: '#7C3AED' },
  { id: 'kano', name: 'Kano Electric', color: '#059669' },
  { id: 'portharcourt', name: 'Port Harcourt Electric', color: '#0891B2' },
  { id: 'jos', name: 'Jos Electric', color: '#EA580C' },
  { id: 'ibadan', name: 'Ibadan Electric', color: '#4F46E5' },
];

export const TV_PROVIDERS = [
  { id: 'dstv', name: 'DStv', color: '#003882' },
  { id: 'gotv', name: 'GOtv', color: '#00A651' },
  { id: 'startimes', name: 'StarTimes', color: '#F47920' },
];

export const EDUCATION_EXAMS = [
  { id: 'waec', name: 'WAEC', color: '#047857' },
  { id: 'neco', name: 'NECO', color: '#1D4ED8' },
  { id: 'jamb', name: 'JAMB', color: '#0F766E' },
];

export const BETTING_PLATFORMS = [
  { id: 'bet9ja', name: 'Bet9ja', color: '#15803D' },
  { id: 'sportybet', name: 'SportyBet', color: '#DC2626' },
  { id: 'betking', name: 'BetKing', color: '#1E40AF' },
  { id: '1xbet', name: '1xBet', color: '#1E3A8A' },
  { id: 'bangbet', name: 'BangBet', color: '#B45309' },
  { id: 'merrybet', name: 'MerryBet', color: '#BE123C' },
  { id: 'premierbet', name: 'PremierBet', color: '#0369A1' },
];

export const SERVICES = [
  { id: 'airtime', name: 'Airtime', icon: 'phone-portrait', color: '#0052CC', screen: 'Airtime' },
  { id: 'data', name: 'Data', icon: 'wifi', color: '#FF6B00', screen: 'Data' },
  { id: 'electricity', name: 'Electricity', icon: 'flash', color: '#F59E0B', screen: 'Electricity' },
  { id: 'tv', name: 'TV', icon: 'tv', color: '#8B5CF6', screen: 'TV' },
  { id: 'education', name: 'Education', icon: 'school', color: '#10B981', screen: 'Education' },
  { id: 'betting', name: 'Betting', icon: 'trophy', color: '#EF4444', screen: 'Betting' },
  { id: 'bulk_sms', name: 'Bulk SMS', icon: 'chatbubbles', color: '#06B6D4', screen: 'MoreServices' },
  { id: 'more', name: 'More', icon: 'grid', color: '#6B7280', screen: 'MoreServices' },
];

export const ONBOARDING_SLIDES = [
  {
    title: 'Recharge Instantly',
    description: 'Buy airtime and data for any network in seconds. Fast, reliable, and always available.',
    icon: 'phone-portrait',
    color: '#0052CC',
  },
  {
    title: 'Affordable Data Plans',
    description: 'Get the best data deals on MTN, Airtel, Glo, and 9mobile at unbeatable prices.',
    icon: 'wifi',
    color: '#FF7A00',
  },
  {
    title: 'Pay Bills Easily',
    description: 'Pay electricity, TV subscriptions, and more — all from one beautiful app.',
    icon: 'receipt',
    color: '#10B981',
  },
];