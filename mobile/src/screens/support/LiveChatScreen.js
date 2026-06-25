import React, { useMemo, useCallback, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { TAWK_PROPERTY_ID, TAWK_WIDGET_ID } from '../../utils/constants';
import { buildTawkEmbeddedHtml, isTawkConfigured, isTawkDomain } from '../../utils/tawk';
import { LogoLoader } from '../../components/loading';
import { SupportFallback } from '../../components/support';
import { brand } from '../../theme/brand';

/** WebView user agent — some chat providers block default RN WebView UA */
const WEBVIEW_USER_AGENT = Platform.select({
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  default: undefined,
});

const LiveChatScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chatReadyRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [webKey, setWebKey] = useState(0);

  const configured = isTawkConfigured(TAWK_PROPERTY_ID, TAWK_WIDGET_ID);

  const visitor = useMemo(() => ({
    name: user?.fullName || undefined,
    email: user?.email || undefined,
  }), [user?.fullName, user?.email]);

  const html = useMemo(
    () => buildTawkEmbeddedHtml(TAWK_PROPERTY_ID, TAWK_WIDGET_ID, visitor),
    [visitor]
  );

  const markReady = useCallback(() => {
    chatReadyRef.current = true;
    setLoading(false);
    setError(false);
  }, []);

  const markError = useCallback(() => {
    if (chatReadyRef.current) return;
    setLoading(false);
    setError(true);
  }, []);

  const handleRetry = useCallback(() => {
    chatReadyRef.current = false;
    setError(false);
    setLoading(true);
    setWebKey((k) => k + 1);
  }, []);

  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'tawk-loaded') {
        markReady();
      } else if (data.type === 'tawk-error') {
        markError();
      } else if (data.type === 'tawk-timeout' && !chatReadyRef.current) {
        markError();
      }
    } catch {
      // ignore non-JSON messages
    }
  }, [markReady, markError]);

  const handleShouldStartLoad = useCallback((request) => {
    const url = request.url || '';
    if (url === 'about:blank') return true;
    if (isTawkDomain(url)) return true;
    return false;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Live Chat</Text>
          <Text style={styles.subtitle}>Pingload Support</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {!configured ? (
        <SupportFallback
          title="Chat Not Configured"
          message="Tawk.to is not configured. Contact support using the options below."
        />
      ) : error ? (
        <SupportFallback
          title="Connection Failed"
          message="Unable to load live chat. Check your internet connection and try again, or contact us directly."
          onRetry={handleRetry}
        />
      ) : (
        <View style={styles.webviewWrap}>
          {loading ? (
            <View style={styles.loader}>
              <LogoLoader size={88} />
              <Text style={styles.loaderTitle}>Pingload Support</Text>
              <Text style={styles.loaderText}>Connecting you to our team...</Text>
            </View>
          ) : null}
          <WebView
            key={webKey}
            source={{ html, baseUrl: 'https://tawk.to' }}
            style={[styles.webview, loading && styles.webviewHidden]}
            userAgent={WEBVIEW_USER_AGENT}
            onMessage={handleWebViewMessage}
            onError={markError}
            onHttpError={markError}
            onContentProcessDidTerminate={markError}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            cacheEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={['https://*']}
            mixedContentMode="compatibility"
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onNavigationStateChange={(navState) => {
              if (navState.loading) return;
              if (isTawkDomain(navState.url) && navState.url.includes('/chat/')) {
                markReady();
              }
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 11, fontWeight: '600', color: brand.orange, marginTop: 2 },
  headerSpacer: { width: 32 },
  webviewWrap: { flex: 1, backgroundColor: brand.white },
  webview: { flex: 1, backgroundColor: brand.white },
  webviewHidden: { opacity: 0 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.white,
    zIndex: 2,
  },
  loaderTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '800',
    color: brand.blue,
  },
  loaderText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default LiveChatScreen;
