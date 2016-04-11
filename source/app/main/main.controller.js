export class MainController {
  constructor ($timeout, $http, toastr) {
    'ngInject';

    this.awesomeThings = [];
    this.classAnimation = '';
    this.loading = true;
    this.inDetail = false;
    this.toastr = toastr;
    this.$http = $http;
    this.events = [];
    this.selectedEvent = null;
    this.attendee = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: ''
    };

    this.fetchEvents();
  }

  fetchEvents() {
    this.$http({
      method: 'GET',
      url: '/api/events'
    })
    .then((response) => {
      this.events = response.data.data;
      this.loading = false;
    })
    .catch((err) => {
      console.log(err);
    });
  }

  gotoDetail(resourceId) {
    this.loading = true;
    this.inDetail = true;
    this.$http({
      method: 'GET',
      url: `/api/events/${resourceId}`
    })
    .then((response) => {
      this.selectedEvent = response.data.data;
      this.loading = false;
    })
    .catch((err) => {
      console.log(err);
    })
  }

  attend() {
    console.log(this.attendee);

    this.$http({
      method: 'POST',
      url: `/api/attendees`,
      data: this.attendee
    })
    .then((response) => {
      var attendee = response.data;
      var promises = [];

      for(let i = 0, l = this.selectedEvent.sessions.length; i < l; i++) {
        let session = this.selectedEvent.sessions[i];
        promises.push(
          this.$http({
            method: 'POST',
            url: `/api/attendees/${attendee.resourceId}/attend`,
            data: {
              sessionResourceId: session.resourceId
            }
          })
        );
      }

      return Promise.all(promises);
    })
    .then((resolves) => {
      this.toastr.info('Successfully registered!');
      this.inDetail = false;
      this.fetchEvents();
    })
    .catch((err) => {
      this.toastr.info('Failed to register to event.');
    });
  }

  showToastr() {
    this.toastr.info('Fork <a href="https://github.com/Swiip/generator-gulp-angular" target="_blank"><b>generator-gulp-angular</b></a>');
    this.classAnimation = '';
  }
}
