import React, { useEffect, useRef, memo } from 'react';

import {
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

const AnimatedTouchable =
  Animated.createAnimatedComponent(
    TouchableOpacity,
  );

const AnimatedPawn = ({
  pawn,
  left,
  top,
  image,
  isTouchable,
  isEligible,
  onPress,
  styles,
  customStyle,
}: any) => {

  const scale =
    useSharedValue(1);

  const pulse =
    useSharedValue(1);

  const ringScale =
    useSharedValue(1);

  const ringOpacity =
    useSharedValue(0);

  const x =
    useSharedValue(0);

  const y =
    useSharedValue(0);

  const initialized =
    useRef(false);

  const animatedStyle =
    useAnimatedStyle(() => {
      return {
        position: 'absolute',

        shadowColor:
          isTouchable
            ? '#00e5ff'
            : '#000',

        shadowOpacity:
          isTouchable
            ? 0.9
            : 0,

        shadowRadius:
          isTouchable
            ? 12
            : 0,

        elevation:
          isTouchable
            ? 10
            : 0,

        transform: [
          {
            translateX:
              x.value,
          },
          {
            translateY:
              y.value,
          },
          {
            scale:
              scale.value *
              pulse.value,
          },
        ],
      };
    });

  const ringStyle =
    useAnimatedStyle(() => {
      return {
        position: 'absolute',
        top: 10,
        width: 12,
        height: 12,
        borderRadius: 999,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#959595',

        opacity:
          ringOpacity.value,

        transform: [
          {
            scale:
              ringScale.value,
          },
        ],
      };
    });

  // STEP BY STEP MOVEMENT
  useEffect(() => {

    // first render
    if (!initialized.current) {

      x.value = left;
      y.value = top;

      initialized.current = true;

      return;
    }

    x.value = withTiming(left, {
      duration: 90,
    });

    y.value = withTiming(top, {
      duration: 90,
    });

    scale.value =
      withSequence(

        withTiming(1.15, {
          duration: 40,
        }),

        withTiming(0.95, {
          duration: 40,
        }),

        withSpring(1, {
          damping: 6,
          stiffness: 220,
        }),
      );

  }, [left, top]);

  // ELIGIBLE PAWN ANIMATION
  useEffect(() => {

    if (isEligible) {

      pulse.value =
        withRepeat(
          withSequence(

            withTiming(1.12, {
              duration: 500,
            }),

            withTiming(1, {
              duration: 500,
            }),
          ),
          -1,
          true,
        );

      ringScale.value =
        withRepeat(
          withTiming(1.4, {
            duration: 900,
          }),
          -1,
          false,
        );

      ringOpacity.value =
        withRepeat(
          withSequence(

            withTiming(0.8, {
              duration: 450,
            }),

            withTiming(0.2, {
              duration: 450,
            }),
          ),
          -1,
          true,
        );

    } else {

      pulse.value =
        withTiming(1);

      ringScale.value =
        withTiming(1);

      ringOpacity.value =
        withTiming(0);
    }

  }, [isEligible]);

  return (

    <AnimatedTouchable
      activeOpacity={
        isTouchable
          ? 0.8
          : 1
      }

      onPress={onPress}

      style={[
        styles.boardPawn,

        customStyle,

        {
          left: 0,
          top: 0,
        },

        animatedStyle,
      ]}
    >

      {isEligible && (
        <Animated.View
          pointerEvents="none"
          style={ringStyle}
        />
      )}

      <View
        style={
          styles.pawnBackplate
        }
      >

        <Image
          source={image}

          style={
            styles.boardPawnImage
          }

          fadeDuration={0}
        />

        {pawn.hasHeart === 1 && (

          <View
            style={{
              position: 'absolute',
              top: -6,
              right: 2,
              zIndex: 999,
              elevation: 999,
              borderRadius: 20,
              padding: 2,
            }}
          >

            <Text
              style={{
                fontSize: 12,
              }}
            >
              ❤️
            </Text>

          </View>
        )}

      </View>

    </AnimatedTouchable>
  );
};

export default memo(
  AnimatedPawn,
);