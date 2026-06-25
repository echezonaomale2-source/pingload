const PingloadLogo = ({ size = 52, className = '' }) => (
  <img
    src="/logo.png"
    alt="Pingload"
    className={`object-contain ${className}`}
    style={{ width: size, height: size }}
  />
);

export default PingloadLogo;
