import { createElement, forwardRef } from 'react';

function createNativeTestComponent(name) {
  return forwardRef(function NativeTestComponent(props, ref) {
    return createElement(name, { ...props, ref });
  });
}

export const ActivityIndicator = createNativeTestComponent('ActivityIndicator');
export const SafeAreaView = createNativeTestComponent('SafeAreaView');
export const ScrollView = createNativeTestComponent('ScrollView');
export const Text = createNativeTestComponent('Text');
export const View = createNativeTestComponent('View');

export const Pressable = forwardRef(function Pressable(
  { style, ...props },
  ref,
) {
  const resolvedStyle =
    typeof style === 'function' ? style({ pressed: false }) : style;
  return createElement('Pressable', {
    ...props,
    accessible: true,
    ref,
    style: resolvedStyle,
  });
});

function flattenStyle(style) {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  if (typeof style === 'object' && style !== null) {
    return style;
  }
  return {};
}

export const StyleSheet = {
  create(styles) {
    return styles;
  },
  flatten: flattenStyle,
};
