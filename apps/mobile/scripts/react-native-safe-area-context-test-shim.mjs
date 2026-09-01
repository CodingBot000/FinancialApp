import { createElement, forwardRef } from 'react';

export const SafeAreaProvider = forwardRef(
  function SafeAreaProvider(props, ref) {
    return createElement('SafeAreaProvider', { ...props, ref });
  },
);

export const SafeAreaView = forwardRef(function SafeAreaView(props, ref) {
  return createElement('SafeAreaView', { ...props, ref });
});
