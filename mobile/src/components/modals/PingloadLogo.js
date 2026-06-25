import React from 'react';
import { Image } from 'react-native';
import { logoImage, logoDimensions } from '../../assets/brandAssets';

const PingloadLogo = ({ size = 52 }) => (
  <Image source={logoImage} style={logoDimensions(size)} resizeMode="contain" />
);

export default PingloadLogo;
