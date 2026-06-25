import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

const TAB_SCREENS = new Set(['Home', 'History', 'Wallet', 'Notifications', 'Profile']);

export const navigateFromNotification = (data = {}) => {
  if (!navigationRef.isReady()) return false;

  const screen = data.screen || 'Notifications';
  const transactionId = data.transactionId;

  if (screen === 'TransactionDetails' && transactionId) {
    navigationRef.navigate('TransactionDetails', { id: transactionId });
    return true;
  }

  if (TAB_SCREENS.has(screen)) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'MainTabs',
        params: { screen },
      })
    );
    return true;
  }

  if (navigationRef.getRootState()?.routeNames?.includes(screen)) {
    navigationRef.navigate(screen);
    return true;
  }

  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'MainTabs',
      params: { screen: 'Notifications' },
    })
  );
  return true;
};
