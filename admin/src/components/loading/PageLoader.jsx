import LogoLoader from './LogoLoader';

import './LogoLoader.css';

import { LOADING_MESSAGES } from '../../utils/loadingMessages';



const PageLoader = ({ message = LOADING_MESSAGES.DASHBOARD }) => (

  <div className="pingload-page-loader">

    <LogoLoader size={72} />

    {message && <p className="pingload-page-loader__message">{message}</p>}

  </div>

);



export default PageLoader;

