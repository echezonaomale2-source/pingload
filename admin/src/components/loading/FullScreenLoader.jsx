import { useEffect, useState } from 'react';
import LogoLoader from './LogoLoader';
import './LogoLoader.css';

const SLOW_DELAY_MS = 3000;

const FullScreenLoader = ({ visible, message = 'Please Wait...', slow = false, slowMessage = "Please wait, we're processing your request." }) => {
  const [localSlow, setLocalSlow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setLocalSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setLocalSlow(true), SLOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible, message]);

  if (!visible) return null;

  const showSlowText = slow || localSlow;

  return (
    <div className="pingload-fullscreen-loader bg-white/96 dark:bg-slate-950/96">
      <div className="text-center">
        <LogoLoader size={80} />
        <p className="pingload-fullscreen-loader__message">{message}</p>
        {showSlowText && <p className="pingload-fullscreen-loader__slow text-slate-500 dark:text-slate-400">{slowMessage}</p>}
      </div>
    </div>
  );
};

export default FullScreenLoader;
