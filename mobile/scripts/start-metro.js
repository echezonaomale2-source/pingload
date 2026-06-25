/**
 * Start Expo Metro on LAN with a stable port and hostname for physical devices.
 * Expo Go shows "Failed to download remote update" when the phone cannot reach Metro.
 */
const { spawn } = require('child_process');
const os = require('os');

const METRO_PORT = process.env.EXPO_METRO_PORT || '8081';

const getLanIp = () => {
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const net of iface || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

const lanIp = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || getLanIp();
const clearCache = process.argv.includes('--clear');

const expoArgs = ['expo', 'start', '--lan', '--port', METRO_PORT];
if (clearCache) expoArgs.push('--clear');

console.log(`Starting Metro on exp://${lanIp}:${METRO_PORT}`);
console.log('Use this URL on your phone (same Wi-Fi). Do not use 127.0.0.1 on a physical device.\n');

const child = spawn('npx', expoArgs, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: lanIp,
    EXPO_DEV_SERVER_LISTEN_ADDRESS: '0.0.0.0',
  },
});

child.on('exit', (code) => process.exit(code ?? 0));
