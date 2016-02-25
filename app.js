var baseUrl = 'https://raise-it.firebaseio.com/rooms';
var fb_ref = new Firebase(baseUrl);

(function($) {

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

	var currentRoom,
		myID,
		meRef;

	Vue.config.debug = true;

	var app = new Vue({
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
			narrowMiddle: "col-md-4 col-md-offset-4 col-sm-12",
		},

		methods: {
			joinRoom: function() {
				currentRoom = fb_ref.child(this.joinSubmission.room);

				var myRef = currentRoom.child('people').push({
					'name': this.joinSubmission.name,
					'waiting': false
				}).then(function(s) {

					// successfully added the user to the room
					myID = s.toString();

					meRef = new Firebase(myID);

					currentRoom.child('actions').orderByChild('timestamp').on('value', function(s) {
						app.room.actions = s.val();
					});

					currentRoom.child('people').on('value', function(s) {
						app.room.people = s.val();
					});

					$("#login-form").animateCss('fadeOutUp', function() {
						$("#login-form").hide();
						$("#room").show().animateCss('fadeInUp');
					});

				}, function(error) {
					console.log(error);
				});
			},

			leaveRoom: function() {
				new Firebase(myID).remove();

				$("#room").animateCss('fadeOutUp', function() {
					$("#room").hide();
					$("#login-form").show().animateCss('fadeInUp');
				});

				// last one out, turn off the lights.
				currentRoom.child('people').orderByKey().once('value', function(s) {
					if (s.numChildren() == 0) {
						currentRoom.remove();
					}
				});
			},

			doRaiseHand: function() {
				currentRoom.child('actions').push({
					action: app.joinSubmission.name + ' raised a hand.',
					timestamp: new Date().getTime(),
				});

				meRef.update({
					'waiting': true
				});
			},

			doLowerHand: function() {
				currentRoom.child('actions').push({
					action: app.joinSubmission.name + ' lowered a hand.',
					timestamp: new Date().getTime(),
				});

				meRef.update({
					'waiting': false
				});
			},

			doAcknowledgePerson: function(personID) {
				var getPerson = currentRoom.child('people/' + personID).once('value', function(s) {});

				getPerson.then(
					function(response) {
						var name = response.val().name;
						currentRoom.child('actions').push({
							action: name + ' was acknowledged by ' + app.joinSubmission.name + '.',
							timestamp: new Date().getTime(),
						});

						currentRoom.child('people/' + personID).update({
							'waiting': false
						});
					},
					function(error) {
						console.log(error);
					}
				);
			},

			getFormattedDate: function(unixtime, format) {
				return new Date(unixtime).format(format);
			}
		},
	});

})(jQuery);