var raiseIt = {

    fbConfig: {
        apiKey: 'AIzaSyBEaiVmq0L-WW3uuOliqYJ3e6stWiCIt_I',
        authDomain: 'raise-it.firebaseapp.com',
        databaseURL: 'https://raise-it.firebaseio.com',
        storageBucket: 'raise-it.appspot.com',
    },

    currentRoom: {},
    meRef: {},
    app: {},

};

(function($) {

    firebase.initializeApp(raiseIt.fbConfig);
    raiseIt.fb_ref = firebase.database().ref().child('rooms');

    $.fn.extend({
        animateCss: function (animationName, callback) {
            var thisID = $(this).attr('id');
            var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
            $(this).addClass('animated ' + animationName).one(animationEnd, function() {
                $(this).removeClass('animated ' + animationName);
                if (callback) callback();
            });
        }
    });

    Vue.config.debug = true;

    raiseIt.app = new Vue({

        el: '#app',

        data: {
            joinSubmission: {
                room: '',
                name: ''
            },
            room: {
                actions: {},
                people: {}
            },
        },

        methods: {

            joinRoom: function() {
                raiseIt.currentRoom = raiseIt.fb_ref.child(this.joinSubmission.room);

                var myRef = raiseIt.currentRoom.child('people').push({
                    name: this.joinSubmission.name,
                    waiting: false
                }).then(function(s) {
                    // successfully added the user to the room; get the ID
                    var myID = s.key;

                    raiseIt.meRef = raiseIt.currentRoom.child('people').child(myID);

                    raiseIt.currentRoom.child('actions').orderByChild('timestamp').on('value', function(s) {
                        raiseIt.app.room.actions = s.val();
                    });

                    raiseIt.currentRoom.child('people').on('value', function(s) {
                        raiseIt.app.room.people = s.val();
                    });

                    $("#login-form").animateCss('fadeOutUp', function() {
                        $("#login-form").hide();
                        $("#room").show().animateCss('fadeInUp');
                    });
                }, function(error) {
                    console.error(error);
                });
            },

            leaveRoom: function() {
                raiseIt.meRef.remove();

                $("#room").animateCss('fadeOutUp', function() {
                    $("#room").hide();
                    $("#login-form").show().animateCss('fadeInUp');
                });

                // last one out, turn off the lights
                raiseIt.currentRoom.child('people').orderByKey().once('value', function(s) {
                    if (s.numChildren() == 0) {
                        raiseIt.currentRoom.remove();
                    }
                });
            },

            doRaiseHand: function() {
                raiseIt.currentRoom.child('actions').push({
                    action: raiseIt.app.joinSubmission.name + ' raised a hand.',
                    timestamp: new Date().getTime(),
                });

                raiseIt.meRef.update({
                    waiting: true
                });
            },

            doLowerHand: function() {
                raiseIt.currentRoom.child('actions').push({
                    action: raiseIt.app.joinSubmission.name + ' lowered a hand.',
                    timestamp: new Date().getTime(),
                });

                raiseIt.meRef.update({
                    waiting: false
                });
            },

            doAcknowledgePerson: function(personID) {
                raiseIt.currentRoom.child('people').child(personID).once('value', function(s) {

                    var personName = s.val().name;
                    raiseIt.currentRoom.child('actions').push({
                        action: personName + ' was acknowledged by ' + raiseIt.app.joinSubmission.name + '.',
                        timestamp: new Date().getTime(),
                    });

                    raiseIt.currentRoom.child('people').child(personID).update({
                        waiting: false
                    });

                });
            },

            getFormattedDate: function(unixtime, format) {
                return new Date(unixtime).format(format);
            }
        }

    });

})(jQuery);