import LogoLoader from './LogoLoader';
import './LogoLoader.css';

const ButtonLoader = () => (
  <span className="pingload-button-loader">
    <LogoLoader size={26} showRing={false} />
  </span>
);

export default ButtonLoader;
