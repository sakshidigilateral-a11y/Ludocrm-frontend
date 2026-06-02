import React from 'react';
import { View, Text } from 'react-native';

export const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View
      style={{
        top:45,
        width: '90%',
        height: 30,
        backgroundColor: '#fe9a00',
        borderLeftWidth: 6,
        borderLeftColor: '#e18700',
        // paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
      }}
    >
      {/* <Text
        style={{
          color: '#6d3400',
          fontSize: 16,
          fontWeight: '800',
        }}
      >
        {text1}
      </Text> */}

      <Text
        style={{
          color: '#6d3400',
          fontSize: 13,
          marginTop: 6,
          fontWeight: '500',
        }}
      >
        {text2}
      </Text>
    </View>
  ),

  error: ({ text1, text2 }: any) => (
    <View
      style={{
        top:45,
        width: '90%',
        height: 30,
        backgroundColor: '#fe9a00',
        borderLeftWidth: 6,
        borderLeftColor: '#d47f00',
        // paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
      }}
    >
      {/* <Text
        style={{
          color: '#6d3400',
          fontSize: 16,
          fontWeight: '800',
        }}
      >
        {text1}
      </Text> */}

      <Text
        style={{
          color: '#6d3400',
          fontSize: 13,
          marginTop: 6,
          fontWeight: '500',
        }}
      >
        {text2}
      </Text>
    </View>
  ),
};