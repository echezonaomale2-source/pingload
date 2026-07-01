const LOGO_SRC = '/favicon.svg';

const PingloadLogo = ({ size = 52, className = '' }) => (
  <img
    src={LOGO_SRC}
    alt="Pingload"
    className={`object-contain ${className}`}
    style={{ width: size, height: size }}
  />
);

export default PingloadLogo;
