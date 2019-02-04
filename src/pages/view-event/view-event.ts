import { Component, NgZone } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, ToastController, ActionSheetController } from 'ionic-angular';
import { FormControl } from '@angular/forms';
import { LiveComunicationProvider } from '../../providers/live-comunication/live-comunication';
import { HelpersProvider } from '../../providers/helpers/helpers';
import { HttpClient } from '@angular/common/http';
import { ViewCourtPage } from '../view-court/view-court';
import { AuthProvider } from '../../providers/auth/auth';
import { ViewTournamentPage } from '../view-tournament/view-tournament';
import { RestProvider } from '../../providers/rest/rest';
import { PublicProfilePage } from '../public-profile/public-profile';

declare var google: any;

@IonicPage()
@Component({
  selector: 'page-view-event',
  templateUrl: 'view-event.html',
})
export class ViewEventPage {

  public _viewMap = false;
  public _isChangingLocation = false;
  public type = "";
  public items = [];

  public dateStart = new Date();
  public dateEnd = new Date();

  //Para busquedad de torneos
  public torneoName = "";
  public tournaments = [];

  //Para busquedad de jugadores
  searching: any = false;
  shouldShowCancel: any = false;
  searchTerm: string = '';
  searchControl: FormControl;
  public players: any = [];
  userID: any;
  disable: boolean = false;

  //Para busquedad de courts
  public search = "";
  public map: any;
  public lat = 36.778259;
  public lng = -119.417931;
  marker: any;

  public courst = [];
  public courstSaved = [];
  public courstSaveds = [];
  public markers = [];


  constructor(public navCtrl: NavController, public navParams: NavParams,
    public viewCtrl: ViewController, public http: HttpClient,
    private zone: NgZone, private rest: RestProvider, public toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController
  ) {
    this.type = this.navParams.get("type");
  }

  async ionViewWillEnter() {
    this.userID = await AuthProvider.me.getIdUser();
    if (this.type === "courts")
      await this.getCourtsSaved();
    if (this.type === "tournaments")
      this.getTournamentsSaved();
  }

  public getBanner() {
    if (this.type === "courts")
      return `url(./assets/imgs/pickleball-doubles.jpg)`;
    else if (this.type === "tournaments")
      return `url(assets/imgs/men-women-1.jpg)`;
    else if(this.type === 'players')
      return `url(assets/imgs/find-players.jpg)`;
    else if(this.type === 'clinics')
      return `url(assets/imgs/racket-balls.png)`;
  }

  public async changeDateStart() {
    let dateStart = await HelpersProvider.me.nativeDatePicker({
      defaultDate: this.dateStart,
      title: "Select the initial date"
    });
    if (dateStart !== null) {
      this.dateStart = dateStart;
      await this.getTournaments();
    }
  }

  public async changeDateEnd() {
    let dateEnd = await HelpersProvider.me.nativeDatePicker({
      defaultDate: this.dateStart,
      title: "Select the end date"
    });
    if (dateEnd !== null) {
      this.dateEnd = dateEnd;
      await this.getTournaments();
    }
  }

  async ngAfterViewInit() {
    document.querySelector(".back-button").setAttribute("hidden", "");
    await LiveComunicationProvider.reloadGoogleplaces();
    await this.initMap();

    let input = () => { return document.querySelector("#search-courts-input-view-event .searchbar-input") };
    let autocomplete = new google.maps.places.Autocomplete(input());
    google.maps.event.addListener(autocomplete, 'place_changed', () => {
      var address = (input() as any).value;
      this.setLocationOfSearch(address);
    });

    let position = await HelpersProvider.me.getMyPosition();
    // console.log("MyPosition", position);
    this.setPosition(position, false);

  }

  private async initMap() {

    let mapOptions: any = {
      center: {
        lat: this.lat,
        lng: this.lng
      },
      zoom: 12
    };
    this.map = new google.maps.Map(document.getElementById("map_place_event"), mapOptions);
    this.marker = new google.maps.Marker({
      animation: 'DROP',
      position: {
        lat: this.lat,
        lng: this.lng
      },
      map: this.map,
      icon: {
        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
      }
    });
    this.map.setCenter({ lat: this.lat, lng: this.lng });

    google.maps.event.addListener(this.map, 'click', event => {
      // console.log(event);
      this.lat = event.latLng.lat();
      this.lng = event.latLng.lng();

      this.marker.setPosition({
        lat: this.lat,
        lng: this.lng
      });
      this.map.setCenter({ lat: this.lat, lng: this.lng });
      if (this.type === "courts")
        this.getCourts();
      if (this.type === "tournaments")
        this.getTournaments(this.lat, this.lng);
    });
    if (this.type === "courts")
      this.getCourts();
  }

  private async setPosition(position, getCourts: boolean) {
    console.log(position);
    this.lat = position.coords.latitude;
    this.lng = position.coords.longitude;
    this.marker.setPosition({
      lat: this.lat,
      lng: this.lng
    });
    if (getCourts === true) {
      console.log("after set position!!");
      this.map.setCenter({ lat: this.lat, lng: this.lng });
      if (this.type === "courts")
        await this.getCourts();
      if (this.type === "tournaments")
        await this.getTournaments(this.lat, this.lng);
      console.log("set position!!");
    }
  }

  private setLocationOfSearch(address: string) {
    let geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (res, status) => {

      if (Object.prototype.toString.call(res) === "[object Array]") {
        if (res.length === 0) return;
        res = res[0];
      }

      if (res.geometry) {
        this.lat = res.geometry.location.lat();
        this.lng = res.geometry.location.lng();

        this.marker.setPosition({
          lat: this.lat,
          lng: this.lng
        });
        this.map.setCenter({ lat: this.lat, lng: this.lng });
        if (this.type === "courts")
          this.getCourts();
        if (this.type === "tournaments")
          this.getTournaments(this.lat, this.lng);
      }

    });

  }

  public viewMap() {
    this._viewMap = !this._viewMap;
    if (this._viewMap === false) this._isChangingLocation = false;
  }

  public formaterUrl(url) {
    return `url(${url})`;
  }

  public isSaved(data) {
    if (this.type === "courts")
      return this.isSavedCourt(data).saved;
    if (this.type === "tournaments")
      return this.isSavedTournament(data).saved;
  }

  public save(data) {
    if (this.type === "courts")
      return this.saveCourt(data);
    if (this.type === "tournaments")
      return this.saveTournament(data);
  }

  public remove(data) {
    if (this.type === "courts")
      return this.removeCourt(data);
    if (this.type === "tournaments")
      return this.removeTournament(data);
  }

  public toItem(data) {
    if (this.type === "courts")
      return this.toCourtSlide(data);
    if (this.type === "tournaments")
      return this.toTournament(data);
  }

  //#region para obtener los courts
  public changeSearch() {
    this._isChangingLocation = !this._isChangingLocation;
    if (this._isChangingLocation === true) this._viewMap = true;
  }

  public isChangingLocation() {
    return this._isChangingLocation === true && this._viewMap === true;
  }

  private cleanMarkers() {
    for (var i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(null);
    }
    this.markers = [];
  }

  private async getCourts() {
    this.courst = [];
    this.cleanMarkers();
    let defaultBounds = new google.maps.LatLng(this.lat, this.lng);
    let options: any = {
      location: defaultBounds,
      radius: 50000,
      fields: ['photos', 'formatted_address', 'name', 'rating', 'opening_hours', 'geometry', 'price_level']
    };
    options.name = 'pickleball courts';


    let service = new google.maps.places.PlacesService(this.map);

    let results = await new Promise((resolve, reject) => {
      service.nearbySearch(options, (results, status, pagination) => {
        // console.log(results, status, pagination);
        pagination.nextPage();
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          for (let result of results) {
            this.courst.push({
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              name: result.name,
              location: result.vicinity,
              photos: result.photos ? this.getUrlSmallImage(result.photos) : undefined,
              rating: result.rating,
            })

          }
          resolve(results);
        }
      });
    }) as any[];

    var options2: any = {
      location: defaultBounds,
      radius: 50000,
      fields: ['photos', 'formatted_address', 'name', 'rating', 'opening_hours', 'geometry', 'price_level']
    };
    options2.type = ['rv_park'];
    let results2 = await new Promise((resolve, reject) => {
      service.nearbySearch(options2, (results, status, pagination) => {
        // console.log(results, status, pagination);
        pagination.nextPage();
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          for (let result of results) {
            this.courst.push({
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              name: result.name,
              location: result.vicinity,
              photos: result.photos ? this.getUrlSmallImage(result.photos) : undefined,
              rating: result.rating,
            })

          }
          resolve(results);
        }
      });
    }) as any[];
    this.courst = this.courst.map(it => {
      it.users = this.getUsersCourt(it);
      return it;
    });
    this.setMarkersOfPlaces(results, results2);
  }

  public getUrlSmallImage(photos) {
    return photos.map(it => {
      return it.getUrl({ 'maxWidth': 200, 'maxHeight': 200 });
    });
  }

  private setMarkersOfPlaces(results_courts, results_rv) {
    if (this.type === "courts") {
      this.items = this.courst.map(it => {
        return {
          name: it.name,
          location: it.location,
          photo: it.photos !== undefined ? it.photos[0] : 'assets/imgs/court-sport-default.jpg',
          data: it
        };
      });
    }

    for (let result of results_courts) {
      let lat = result.geometry.location.lat();
      let lng = result.geometry.location.lng();
      let image = {
        url: './assets/imgs/pickleball-icon.png',
        // This marker is 20 pixels wide by 32 pixels high.
        size: new google.maps.Size(20, 20),
        // The origin for this image is (0, 0).
        origin: new google.maps.Point(0, 0),
        // The anchor for this image is the base of the flagpole at (0, 32).
        anchor: new google.maps.Point(10, 10)
      };

      let marker = new google.maps.Marker({
        animation: 'DROP',
        position: {
          lat,
          lng
        },
        map: this.map,
        icon: image
      });
      this.markers.push(marker);
    }

    for (let result of results_rv) {
      let lat = result.geometry.location.lat();
      let lng = result.geometry.location.lng();
      let image = {
        url: './assets/imgs/camper.png',
        // This marker is 20 pixels wide by 32 pixels high.
        size: new google.maps.Size(35, 21),
        // The origin for this image is (0, 0).
        origin: new google.maps.Point(0, 0),
        // The anchor for this image is the base of the flagpole at (0, 32).
        anchor: new google.maps.Point(17.5, 21)
      };

      let marker = new google.maps.Marker({
        animation: 'DROP',
        position: {
          lat,
          lng
        },
        map: this.map,
        icon: image
      });
      this.markers.push(marker);
    }
    this.setEventToMarkers();
    this.zone.run(function () { console.log("fetch courts"); });
  }

  private setEventToMarkers() {
    for (let marker of this.markers) {
      google.maps.event.addListener(marker, 'click', e => {
        console.log(e.latLng.lat(), e.latLng.lng());
        this.toCourt(e.latLng.lat(), e.latLng.lng());
      });
    }
  }

  public toCourtSlide(court) {
    if (court.lng !== null && court.lng !== undefined &&
      court.lat !== null && court.lat !== undefined) {
      this.toCourt(court.lat, court.lng);
    }
  }

  private toCourt(lat: number, lng: number) {
    let court = this.courst.find(it => {
      return it.lat === lat && it.lng === lng;
    });
    if (court !== null && court !== undefined)
      this.navCtrl.push(ViewCourtPage, { court });
  }

  private async getCourtsSaved() {
    let user = await AuthProvider.me.getIdUser();
    let query = { user };
    this.courstSaved = await this.http.get(`/court?where=${JSON.stringify(query)}&limit=40000`).toPromise() as any[];
    this.courstSaveds = await this.http.get(`/court?limit=400`).toPromise() as any[];
  }

  public getUsersCourt(court) {
    let users = [];
    if (court.lng !== null && court.lng !== undefined &&
      court.lat !== null && court.lat !== undefined) {
      try {
        let _courts = this.courstSaveds.filter(it => {
          return it.coordinates[0] === court.lng && it.coordinates[1] === court.lat;
        });
        // console.log(_courts);
        users = _courts.map(it => {
          return it.user;
        });
        users = users.filter(it => { return it !== undefined && it !== null && it.id !== this.userID; })
      }
      catch (e) {
        console.error(e);
      }
    }
    return users;
  }

  public async saveCourt(court) {
    if (court.lng !== null && court.lng !== undefined &&
      court.lat !== null && court.lat !== undefined) {
      try {
        let user = await AuthProvider.me.getIdUser();
        let ite = JSON.parse(JSON.stringify(court));
        ite.coordinates = [ite.lng, ite.lat];
        delete ite.lng;
        delete ite.lat;
        ite.user = user;
        await this.http.post("/court", ite).toPromise();
        // this.presentToast("Saved Court");
        await this.getCourtsSaved();
      }
      catch (e) {
        console.error(e);
      }
    }
  }

  public async removeCourt(court) {
    let pos = await this.isSavedCourt(court);
    if (pos.saved === true) {
      await this.http.delete(`/court/${this.courstSaved[pos.index].id}`).toPromise();
      // this.presentToast("Courst Removed");
      await this.getCourtsSaved();
    }
  }

  public isSavedCourt(court) {
    let index = this.courstSaved.findIndex(it => {
      // console.log(it.coordinates.lng === court.lng && it.coordinates.lat === court.lat);
      // console.log(it.coordinates.lng, court.lng, it.coordinates.lat, court.lat);
      return it.coordinates[0] === court.lng && it.coordinates[1] === court.lat;
    });
    if (index === -1) {
      return { saved: false, index };
    }

    return { saved: true, index };
  }

  public loadImage(court) {
    court.loadImage = true;
  }
  //#endregion

  //#region para los torneos
  private async getTournaments(lat?, lng?) {
    this.lat = lat || this.lat;
    this.lng = lng || this.lng;
    try {
      let tournamets = await this.http.get(`/tournaments-ubication?lat=${this.lat}&lng=${this.lng}&filterDate=true&startDate=${this.dateStart.getTime()}&endDate=${this.dateEnd.getTime()}`).toPromise() as any[];
      for (let tour of tournamets) {
        let image = {
          url: './assets/imgs/medal.png',
          // This marker is 20 pixels wide by 32 pixels high.
          size: new google.maps.Size(20, 41),
          // The origin for this image is (0, 0).
          origin: new google.maps.Point(0, 0),
          // The anchor for this image is the base of the flagpole at (0, 32).
          anchor: new google.maps.Point(10, 20.5)
        };

        new google.maps.Marker({
          animation: 'DROP',
          position: tour.latLng,
          map: this.map,
          icon: image
        });
      }
      this.items = tournamets.map(it => {
        return {
          name: it.title,
          location: it.address,
          photo: it.imgs !== undefined && it.imgs.length > 0 ? it.imgs[0] : 'assets/imgs/court-sport-default.jpg',
          data: it
        };
      });
      this.zone.run(function () { console.log("fetch tournaments"); });
    }
    catch (e) {
      console.error(e);
    }
  }

  public async getTournamentsSaved() {
    let idUser = await AuthProvider.me.getIdUser();
    let tournaments = await this.http.get(`/savedtournaments?where=${JSON.stringify({ user: idUser })}&limit=40000`).toPromise() as any;
    tournaments = tournaments.filter(it => {
      return it.tournament !== null && it.tournament !== undefined;
    });
    this.tournaments = tournaments.map(it => {
      it.tournament.savedID = it.id;
      return it.tournament;
    });
  }

  public isSavedTournament(tour) {
    let index = this.tournaments.findIndex(it => {
      // console.log(it.coordinates.lng === court.lng && it.coordinates.lat === court.lat);
      // console.log(it.coordinates.lng, court.lng, it.coordinates.lat, court.lat);
      return it.coordinates[0] === tour.coordinates[0] && it.coordinates[1] === tour.coordinates[1];
    });
    if (index === -1) {
      return { saved: false, index };
    }

    return { saved: true, index };
  }

  public async saveTournament(tournament) {
    try {
      let idUser = await AuthProvider.me.getIdUser();
      await this.http.post('/savedtournaments', { user: idUser, tournament: tournament.id }).toPromise();
      await this.getTournamentsSaved();
    }
    catch (e) {
      console.error(e);
    }
  }

  public async removeTournament(tournament) {
    try {
      let s = this.isSavedTournament(tournament);
      if (s.saved === true) {
        await this.http.delete('/savedtournaments/' + this.tournaments[s.index].savedID).toPromise();
        await this.getTournamentsSaved();
      }
    }
    catch (e) {
      console.error(e);
    }
  }

  public toTournament(tournament) {
    this.navCtrl.push(ViewTournamentPage, { tournament, save: true });
  }
  //#endregion

  //#region para busquedad de players
  onSearchInput() {
    if (this.searchTerm === "") {
      this.searching = false;
      this.shouldShowCancel = false;
    } else {
      this.searching = true;
      this.shouldShowCancel = true;
      this.getdata();
    }

  }

  getdata() {
    this.rest.getData(`/users/finds/${this.userID}?name=${this.searchTerm}`).subscribe(
      result => {
        this.players = result;
      },
      err => {
        console.error("Error : " + err);
      });
  }

  public errorImage(e) {
    e.target.src = "./assets/imgs/default-user.png";
  }

  public getUrlImage(player) {
    if (player.loginFacebook) {
      return player.loginFacebook.image;
    }
    return "";
  }

  cancel() {
    this.searching = false;
    this.players = [];
  }


  checkFriendRequest(player, $event) {
    if (this.sendRequestAllow(player) === true) {
      this.addFriend(player, $event);
    }
    let index = player.requests.findIndex(it => {
      if (it.response === null) return true;
      return false;
    });
    if (index !== -1)
      this.cancelRequestActionSheet($event, player.requests[index]);
  }

  public addFriend(player, $event) {
    let payload = {
      from: this.userID,
      to: player['_id']
    }
    this.rest.postData('/requestfriend', payload).subscribe(res => {
      console.log("Request", res);
      $event.srcElement.innerText = 'Cancel Request';
      this.presentToast("Friendship Request sent!");
      this.onSearchInput();
    })
  }

  presentToast(message) {
    let toast = this.toastCtrl.create({
      message: message,
      duration: 3000
    });
    toast.present();
  }

  public sendRequestAllow(user) {
    if (user.requests.length === 0) return true;
    let indexResponseTrue = user.requests.findIndex(it => {
      if (it.response === true || it.response === null) return true;
      return false;
    });
    console.log("all", indexResponseTrue);
    return indexResponseTrue === -1;
  }

  public isFriend(user) {
    let isFriend = false;
    for (let request of user.requests) {
      if (request.response === true) {
        isFriend = true;
        break;
      }

    }

    return !isFriend;
  }

  cancelRequestActionSheet($event, request) {
    const actionSheet = this.actionSheetCtrl.create({
      title: 'Request',
      buttons: [
        {
          text: 'Cancel Request',
          role: 'destructive',
          handler: () => {
            console.log('Destructive clicked');
            this.cancelRequest($event, request);
          }
        }, {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });
    actionSheet.present();
  }

  cancelRequest($event, request) {
    this.rest.removeData('/requestfriend/' + request['id']).subscribe(res => {
      this.onSearchInput();
      $event.srcElement.innerText = 'Add Friend';
      this.presentToast("Friendship Request cancelled!");
      this.onSearchInput();
    })
  }

  goToFriendProfile(userID){
    this.navCtrl.push(PublicProfilePage, {'userID': userID});
  }
  //#endregion

}