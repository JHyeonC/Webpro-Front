import {StyleSheet, SafeAreaView, Image, Pressable} from 'react-native';
import React, {useCallback} from 'react';
import {apiServer} from '../utils/MetaDataetaData';
import {RESTAPIBuilder} from '../utils/RestapiBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_WEB_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from '../utils/GoogleConfig';

export default function Login(navigation) {
  useFocusEffect(
    useCallback(() => {
      checkIsLogin();
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
      });
    }, []),
  );
  const checkIsLogin = async () => {
    const userData = await AsyncStorage.getItem('userData');
    if (userData == null) {
      return;
    }

    const url = `${apiServer}/myid`;
    const result = await new RESTAPIBuilder(url, 'GET')
      .setNeedToken(true)
      .build()
      .run()
      .catch(err => {
        console.log(err);
        AsyncStorage.removeItem('userData');
      });

    if (result) {
      console.log('verify Result : ', result);
      navigation.navigate('BottomTab');
    }
  };
  
  const signInWithGoogle = async () => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn().catch(error => {
      console.log(error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Login Cancel : ', error.message);
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log(`Login Fail(code:${error.code})`, error.message);
      }
      return;
    });
    if (!userInfo) {
      return;
    }
    const result = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: JSON.stringify({
        code: userInfo.serverAuthCode,
        client_id: GOOGLE_WEB_CLIENT_ID,
        client_secret: GOOGLE_WEB_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    }).then(res => {
      return res.json();
    });
    const url = `${apiServer}/login/oauth2/code/google?token=${result?.access_token}`;
    const {data} = await new RESTAPIBuilder(url, 'POST')
      .build()
      .run()
      .catch(err => {
        console.log(err);
      });
    console.log('Login Success');
    const tokenData = {
      userId: data.userId,
      accessToken: data.accessToken,
    };
    await AsyncStorage.setItem('userData', JSON.stringify(tokenData));
    await navigation.navigate('BottomTab');
  };

  
  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={signInWithGoogle}>
        <Image
          source={{
            uri: `https://kiwes-bucket.s3.ap-northeast-2.amazonaws.com/main/google_login.png`,
          }}
          style={styles.oauth}
          resizeMode="contain"
        />
      </Pressable>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    aspectRatio: 1,
    width: '100%',
    marginBottom: 30,
  },
  oauth: {
    aspectRatio: 5,
    width: '70%',
  },
});
