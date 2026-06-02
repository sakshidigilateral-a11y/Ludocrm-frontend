import React, {
  useEffect,
  useMemo,
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
  Easing,
} from 'react-native-reanimated';

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

const colors: any = {
  topLeft: {
    diceColor: '#ff2d2d',
    dotColor: 'white',
  },

  topRight: {
    diceColor: '#22c55e',
    dotColor: 'white',
  },

  bottomRight: {
    diceColor: '#ffd60a',
    dotColor: 'black',
  },

  bottomLeft: {
    diceColor: '#2563eb',
    dotColor: 'white',
  },
};

export default function Dice3D({
  diceValue = 1,
  size = 70,
  position = 'bottomLeft',
  isPlayerStartedRolling,
  onPress,
}: any) {
  const rotateX = useSharedValue(0);

  const rotateY = useSharedValue(0);

  const scale = useSharedValue(1);

  const translateY =
    useSharedValue(0);

  const wobble =
    useSharedValue(0);

  const currentColors =
    useMemo(() => {
      return (
        colors[position] || {
          diceColor: '#ffffff',
          dotColor: '#000000',
        }
      );
    }, [position]);

  useEffect(() => {
    if (
      !isPlayerStartedRolling
    ) {
      return;
    }

    rotateX.value = 0;
    rotateY.value = 0;

    const randomX =
      720 +
      Math.random() * 720;

    const randomY =
      720 +
      Math.random() * 720;

    rotateX.value = withTiming(
      randomX,
      {
        duration: 700,
        easing:
          Easing.out(
            Easing.exp,
          ),
      },
    );

    rotateY.value = withTiming(
      randomY,
      {
        duration: 700,
        easing:
          Easing.out(
            Easing.exp,
          ),
      },
    );

    scale.value = withTiming(1.12, {
      duration: 180,
    });

    scale.value = withTiming(1, {
      duration: 700,
      easing:
        Easing.out(
          Easing.exp,
        ),
    });

    translateY.value =
      withTiming(-16, {
        duration: 160,
      });

    translateY.value =
      withTiming(0, {
        duration: 650,
        easing: Easing.bounce,
      });

    wobble.value = withTiming(12, {
      duration: 120,
    });

    wobble.value = withTiming(0, {
      duration: 600,
      easing: Easing.bounce,
    });
  }, [
    diceValue,
    isPlayerStartedRolling,
  ]);

  const animatedStyle =
    useAnimatedStyle(() => {
      return {
        transform: [
          {
            perspective: 800,
          },

          {
            rotateX: `${rotateX.value}deg`,
          },

          {
            rotateY: `${rotateY.value}deg`,
          },

          {
            rotateZ: `${wobble.value}deg`,
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
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.dice,
          {

            backgroundColor:
              currentColors.diceColor,
          },

          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.highlight,
            {
              borderRadius:
                size * 0.22,
            },
          ]}
        />

        {positions[diceValue].map(
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

                  backgroundColor:
                    currentColors.dotColor,
                },
              ]}
            />
          ),
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dice: {
    width:30,
    height:30,
    borderRadius: 8,

    overflow: 'hidden',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',

    shadowOpacity: 0.35,

    shadowRadius: 18,

    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 15,
  },

  highlight: {
    position: 'absolute',

    inset: 0,

    backgroundColor:
      'rgba(255,255,255,0.08)',
  },

  dot: {
    position: 'absolute',

    width: 6,
    height: 6,

    borderRadius: 999,

    transform: [
      {
        translateX: -3,
      },

      {
        translateY: -3,
      },
    ],

    shadowColor: '#000',

    shadowOpacity: 0.2,

    shadowRadius: 4,

    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
});