import React from 'react';
import { View, Text } from 'react-native';

const ScreenWrapper = ({ title }) => {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa'
    }}>
      <Text style={{
        fontSize: 26,
        fontWeight: 'bold',
        color: '#333'
      }}>
        {title}
      </Text>
    </View>
  );
};

export default ScreenWrapper;