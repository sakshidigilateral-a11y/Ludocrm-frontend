import React, {
  memo,
  useEffect,
} from 'react';

import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const SIZE = 72;

const positions: any = {
  1: [[50, 50]],

  2: [
    [25, 25],
    [75, 75],
  ],

  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],

  4: [
    [25, 25],
    [75, 25],
    [25, 75],
    [75, 75],
  ],

  5: [
    [25, 25],
    [75, 25],
    [50, 50],
    [25, 75],
    [75, 75],
  ],

  6: [
    [25, 20],
    [75, 20],
    [25, 50],
    [75, 50],
    [25, 80],
    [75, 80],
  ],
};

const Dice3D = ({
  value = 1,
  rolling = false,
  onPress,
}: any) => {
  const rotate =
    useSharedValue(0);

  const tiltX =
    useSharedValue(-12);

  const tiltY =
    useSharedValue(12);

  const scale =
    useSharedValue(1);

  const translateY =
    useSharedValue(0);

  useEffect(() => {
    if (!rolling) return;

    rotate.value = 0;

    rotate.value =
      withTiming(1080, {
        duration: 1200,

        easing: Easing.out(
          Easing.exp,
        ),
      });

    scale.value = withSequence(
      withTiming(0.72, {
        duration: 180,
      }),

      withSpring(1, {
        damping: 8,
      }),
    );

    translateY.value =
      withSequence(
        withTiming(-18, {
          duration: 180,
        }),

        withSpring(0, {
          damping: 8,
        }),
      );
      tiltX.value =
  withSequence(
    withTiming(-24, {
      duration: 180,
    }),

    withSpring(-12),
  );

tiltY.value =
  withSequence(
    withTiming(24, {
      duration: 180,
    }),

    withSpring(12),
  );
  }, [rolling]);

  const animatedStyle =
    useAnimatedStyle(() => {
      return {
        shadowOpacity:
  rolling ? 0.5 : 0.35,
  shadowRadius:
  rolling ? 18 : 12,
        transform: [
          {
            perspective: 900,
          },

          {
            rotateX: `${tiltX.value}deg`,
          },

          {
            rotateY: `${tiltY.value}deg`,
          },

          {
            rotateZ: `${rotate.value}deg`,
          },

          {
            scale: scale.value,
          },

          {
            translateY:
              translateY.value,
          },
        ],
      };
    });

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
    >
      {/* SHADOW */}
      <View style={styles.shadow} />

      {/* DEPTH */}
      <View style={styles.depth} />

      {/* MAIN DICE */}
      <Animated.View
        style={[
          styles.dice,
          animatedStyle,
        ]}
      >
        {/* LEFT FACE */}
<View style={styles.leftFace} />

{/* RIGHT FACE */}
<View style={styles.rightFace} />

{/* BOTTOM FACE */}
<View style={styles.bottomFace} />
        {/* LIGHT */}
        <View
          style={styles.gloss}
        />
{/* INNER SHADOW */}
<View style={styles.innerShadow} />
        {/* EDGE */}
        <View
          style={styles.edge}
        />

        {/* DOTS */}
        {(positions as any)[
          value
        ]?.map(
          (
            dot: any,
            index: number,
          ) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  left: `${dot[0]}%`,
                  top: `${dot[1]}%`,
                },
              ]}
            />
          ),
        )}
      </Animated.View>
    </Pressable>
  );
};

export default memo(Dice3D);

const styles = StyleSheet.create({
  leftFace: {
  position: 'absolute',

  left: -4,

  top: 4,

  width: 12,

  height: 52,

  borderTopLeftRadius: 16,

  borderBottomLeftRadius: 16,

  backgroundColor: '#dcdcdc',

  opacity: 0.9,
},

rightFace: {
  position: 'absolute',

  right: -4,

  top: 4,

  width: 10,

  height: 52,

  borderTopRightRadius: 16,

  borderBottomRightRadius: 16,

  backgroundColor: '#ffffff',

  opacity: 0.7,
},

bottomFace: {
  position: 'absolute',

  bottom: -5,

  left: 4,

  width: 52,

  height: 12,

  borderBottomLeftRadius: 16,

  borderBottomRightRadius: 16,

  backgroundColor: '#cfcfcf',

  opacity: 0.9,
},

innerShadow: {
  position: 'absolute',

  inset: 0,

  borderRadius: 20,

  borderWidth: 1,

  borderColor:
    'rgba(0,0,0,0.04)',

  shadowColor: '#000',

  shadowOpacity: 0.18,

  shadowRadius: 8,

  shadowOffset: {
    width: 0,
    height: 3,
  },
},
  container: {
    width: 120,
    height: 120,

    justifyContent: 'center',
    alignItems: 'center',
    left:30,
    bottom:30
  },

  shadow: {
    position: 'absolute',

    width: 70,
    height: 18,

    borderRadius: 999,

  //   backgroundColor:
  // 'rgba(0,0,0,0.28)',

    bottom: 18,

    transform: [
      {
        scaleX: 1.2,
      },
    ],
  },

  depth: {
    position: 'absolute',

    width: 60,
    height: 60,

    borderRadius: 20,

    backgroundColor: '#d7d7d7',

    top: 30,
    left: 30,
  },

  dice: {
    width: 60,
    height: 60,

    borderRadius: 20,

    backgroundColor: '#f8f8f8',

    overflow: 'hidden',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.7)',

    shadowColor: '#000',

    shadowOpacity: 0.35,

    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 14,
  },

  gloss: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,

    height: '45%',

    backgroundColor:
      'rgba(255,255,255,0.35)',
  },

  edge: {
    position: 'absolute',

    inset: 0,

    borderRadius: 20,

    borderWidth: 2,

    borderColor:
      'rgba(0,0,0,0.05)',
  },

  dot: {
    position: 'absolute',

    width: 8,
    height: 8,

    borderRadius: 999,

    backgroundColor: '#111',
    borderWidth: 1,

borderColor:
  'rgba(255,255,255,0.15)',

    transform: [
      {
        translateX: -6,
      },

      {
        translateY: -6,
      },
    ],

    shadowColor: '#000',

    shadowOpacity: 0.5,

    shadowRadius: 4,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 3,
  },
});