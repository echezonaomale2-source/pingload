import './LogoLoader.css';

const LogoLoader = ({ size = 72, showRing = true }) => {
  const ringSize = size + 28;

  return (
    <div className="pingload-logo-loader" style={{ width: ringSize, height: ringSize }}>
      {showRing && (
        <div
          className="pingload-logo-loader__ring"
          style={{ width: ringSize, height: ringSize }}
        />
      )}
      <img
        src="/favicon.svg"
        alt="Pingload"
        className="pingload-logo-loader__logo"
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default LogoLoader;
