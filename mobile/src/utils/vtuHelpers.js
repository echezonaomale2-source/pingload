import { formatCurrency } from './formatters';
import { getApiErrorMessage } from './getApiErrorMessage';

export const buildVtuSuccessMessage = (data, fallback = 'Purchase completed successfully.') => {
  if (!data) return fallback;

  const lines = [];
  if (data.reference) lines.push(`Reference: ${data.reference}`);
  if (data.amount != null) lines.push(`Amount: ${formatCurrency(data.amount)}`);
  if (data.details?.customerName) lines.push(`Customer: ${data.details.customerName}`);
  if (data.details?.token) lines.push(`Token: ${data.details.token}`);
  if (data.details?.units) lines.push(`Units: ${data.details.units}`);
  if (data.details?.productName) lines.push(`Plan: ${data.details.productName}`);
  if (data.details?.phone) lines.push(`Phone: ${data.details.phone}`);
  if (data.details?.purchasedCode) lines.push(`PIN: ${data.details.purchasedCode}`);
  if (data.details?.pins?.length) {
    data.details.pins.forEach((item, index) => {
      if (item.serial && item.pin) lines.push(`PIN ${index + 1}: ${item.serial} / ${item.pin}`);
      else if (item.pin) lines.push(`PIN ${index + 1}: ${item.pin}`);
    });
  }

  return lines.length ? lines.join('\n') : fallback;
};

export const handleVtuPurchaseResult = ({
  response,
  dialog,
  refreshBalance,
  navigation,
  successTitle = 'Purchase Successful',
  successFallback,
  onSuccess,
}) => {
  const payload = response?.data?.data;
  const isSuccess = response?.data?.success && payload?.status === 'successful';

  if (!isSuccess) {
    dialog.alertError(
      'Purchase Failed',
      response?.data?.message || 'Purchase failed. Your wallet has been refunded if debited.'
    );
    return;
  }

  dialog.showSuccess({
    title: successTitle,
    message: buildVtuSuccessMessage(payload, successFallback),
    onClose: () => {
      onSuccess?.(payload);
      navigation?.goBack?.();
    },
  });
};

export const handleVtuPurchaseError = (error, dialog, fallback = 'Purchase failed. Please try again.') => {
  const payload = error.response?.data?.data;
  const message = getApiErrorMessage(error, fallback);
  const detail = payload?.refunded ? `${message}\n\nYour wallet has been refunded.` : message;
  dialog.alertError('Purchase Failed', detail);
};
