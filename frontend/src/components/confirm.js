// Imperative themed dialogs (no per-screen state/JSX needed).
//
// Mount <ConfirmHost /> ONCE near the app root. Then anywhere:
//
//   import { showConfirm, showInfo } from '.../components/confirm';
//
//   showConfirm({ title, message, confirmLabel, cancelLabel, destructive, icon, onConfirm, onCancel });
//   showInfo({ title, message, icon, buttonLabel, onClose });
//
// showConfirm → app-themed ConfirmModal (Cancel + action) for confirm/delete/logout.
// showInfo    → app-themed InfoModal (single button) for success/error/info,
//               replacing the plain Alert.alert('Success', ...) popups.

import React, { useEffect, useState, useCallback } from 'react';
import { ConfirmModal, InfoModal } from './AppModal';

let _openConfirm = null;
let _openInfo = null;

export function showConfirm(options = {}) {
  if (_openConfirm) _openConfirm(options);
  else if (options.onConfirm) options.onConfirm(); // fail open if host not mounted
}

export function showInfo(options = {}) {
  // Accept a plain string as the message for convenience.
  const opts = typeof options === 'string' ? { message: options } : options;
  if (_openInfo) _openInfo(opts);
  else if (opts.onClose) opts.onClose();
}

export function ConfirmHost() {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmOpts, setConfirmOpts] = useState({});
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoOpts, setInfoOpts] = useState({});

  const openConfirm = useCallback((o) => { setConfirmOpts(o || {}); setConfirmVisible(true); }, []);
  const openInfo = useCallback((o) => { setInfoOpts(o || {}); setInfoVisible(true); }, []);

  useEffect(() => {
    _openConfirm = openConfirm;
    _openInfo = openInfo;
    return () => {
      if (_openConfirm === openConfirm) _openConfirm = null;
      if (_openInfo === openInfo) _openInfo = null;
    };
  }, [openConfirm, openInfo]);

  return (
    <>
      <ConfirmModal
        visible={confirmVisible}
        title={confirmOpts.title}
        message={confirmOpts.message}
        icon={confirmOpts.icon}
        confirmLabel={confirmOpts.confirmLabel || 'OK'}
        cancelLabel={confirmOpts.cancelLabel || 'Cancel'}
        destructive={!!confirmOpts.destructive}
        onConfirm={() => { setConfirmVisible(false); confirmOpts.onConfirm && confirmOpts.onConfirm(); }}
        onCancel={() => { setConfirmVisible(false); confirmOpts.onCancel && confirmOpts.onCancel(); }}
      />
      <InfoModal
        visible={infoVisible}
        title={infoOpts.title}
        message={infoOpts.message}
        icon={infoOpts.icon || 'information-circle'}
        buttonLabel={infoOpts.buttonLabel || 'Got it'}
        onClose={() => { setInfoVisible(false); infoOpts.onClose && infoOpts.onClose(); }}
      />
    </>
  );
}

export default ConfirmHost;
