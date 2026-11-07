import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function AudioVisualizerBar({ isPlaying, color = '#ef4444', barCount = 4 }) {
  const animValues = useRef([...Array(barCount)].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    let animations = [];
    if (isPlaying) {
      animations = animValues.map((anim, idx) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.9,
              duration: 300 + idx * 80,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration: 250 + idx * 60,
              useNativeDriver: true,
            }),
          ])
        );
      });
      animations.forEach((a) => a.start());
    } else {
      animValues.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => {
      animations.forEach((a) => a.stop());
    };
  }, [isPlaying, animValues]);

  return (
    <View style={styles.container}>
      {animValues.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 18,
    width: 24,
  },
  bar: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
});

