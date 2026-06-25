import React from 'react';
import ProviderSelector from './ProviderSelector';

const NetworkSelector = ({ networks, selected, onSelect, label = 'Select Network' }) => (
  <ProviderSelector
    label={label}
    providers={networks}
    selected={selected}
    onSelect={onSelect}
    columns={2}
  />
);

export default NetworkSelector;
