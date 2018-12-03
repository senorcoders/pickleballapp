import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { LoginPage } from '../pages/login/login';
import { Storage } from '@ionic/storage';
import { TabsPage } from '../pages/tabs/tabs';
import { Push, PushObject } from '@ionic-native/push';
import { HttpClient } from '@angular/common/http';
import { LiveComunicationProvider } from '../providers/live-comunication/live-comunication';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {

  rootPage: any;
  pushObject: PushObject;

  public static initNotifications: Function = () => { };
  public static setNotifications = false;

  constructor(
    platform: Platform, statusBar: StatusBar,
    splashScreen: SplashScreen, public storage: Storage,
    public pusherNotification: Push, public http: HttpClient,
    public lc: LiveComunicationProvider
  ) {
    MyApp.initNotifications = this.initNotifications.bind(this);
    platform.ready().then(() => {
      statusBar.styleDefault();
      splashScreen.hide();
      this.storage.get('LOGGED_IN').then((logged) => {
        if (logged == true) {
          this.rootPage = TabsPage;
        } else {
          this.rootPage = LoginPage;
        }
      })
    });
  }

  public initNotifications() {

    if (MyApp.setNotifications === true) {
      return;
    }

    // to initialize push notifications
    const options: any = {
      android: {
        senderID: "241655088031",
        topics: [],
        sound: true,
        vibrate: true,
        soundname: "default"
      },
      ios: {
        alert: 'true',
        badge: true,
        sound: 'true',
        soundname: "default"
      },
      windows: {},
      browser: {
        pushServiceURL: 'https://pickle-connect.firebaseio.com'
      }
    };

    try {

      //#region for notification
      this.pushObject = this.pusherNotification.init(options);

      this.pushObject.on('notification').subscribe(async function (notification: any) {
        console.log(notification);
      });


      this.pushObject.on('registration').subscribe(function (registration: any) {

        this.updateTokens(registration.registrationId);
        console.log('Device registered', registration);
      }.bind(this));

      this.pushObject.on('error').subscribe(error => console.error('Error with Push plugin', error));
      //#endregion

      MyApp.setNotifications = true;
    }
    catch (e) {
      console.error(e);
    }
  }

  private async updateTokens(token: string) {
    try {
      let updateTokens = localStorage.getItem("updateTokens");
      if (updateTokens) {
        return;
      }
      let userID: any = await this.storage.get("USER_ID");
      if (userID) {
        let user: any = await this.http.get(`/user/${userID}`).toPromise();
        console.log(user);
        let tokens: string[] = [];
        if (user.tokens) {
          user.tokens.push(token);
        } else {
          user.tokens = [token];
        }
        tokens = user.tokens;
        await this.http.patch(`/user/${user.id}`, { tokens }).toPromise();
        await this.storage.set("tokenNotification", token);
        localStorage.setItem("updateTokens", JSON.stringify({ set: true }));
      }
    }
    catch (e) {
      console.error(e);
    }
  }

}
