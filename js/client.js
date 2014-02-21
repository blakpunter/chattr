(function ($) {

    $.ionSound({
        sounds: [
            "tap"
        ]
    });

    $('#image-preview').hide();
    $('input[type=url]').hide();
    $('#hasAvatar').hide();
    $('.container').hide();
    $('#loginform input[type="submit"]').hide();
    $('#sendmp').hide();
    $('#ding').hide();

    var me;
    var lastmsg = false;
    var notification = [];


    /* Fenêtre de connection */

    $('#loginform').on('keyup', function () {
        if ($(this).find('input[type="text"]').val() !== "") {
            $(this).find('#hasAvatar').fadeIn(1000);
            $(this).find('input[type=submit]').fadeIn(1000);
        } else {
            $(this).find('#hasAvatar').fadeOut(1000);
            $(this).find('input[type=submit]').fadeOut(1000);
        }
    });

    $('#hasAvatar').on('click', function () {
        $('input[type=url]').fadeIn(1000);
        $('input[type=url]').on('keyup', function () {
            if ($('input[type=url]').val() !== "" && $('input[type=url]').val().length > 7) {
                if (isAvatar($('input[type=url]').val())) {
                    $('input[type=url]').removeClass('error');
                    var avatar = '<img src="' + $('input[type=url]').val() + '" alt="Avatar de ' + $('input[type="text"]').val() + '">';
                    $('#image-preview').html(avatar);
                    $('#image-preview').fadeIn(1000);
                    $('input[type="submit"]').fadeIn(1000);
                } else {
                    $('input[type=url]').addClass('error');
                    $('#image-preview').fadeOut(1000);
                }
            }
        });
    });

    var mp = $('#mp').html();
    $('#mp').remove();
    var msgtpl = $('#msgtpl').html();
    $('#msgtpl').remove();

    var socket = io.connect('http://localhost:1337');


    /** Gestion connection */

    $('#loginform').on('submit', function (event) {
        event.preventDefault();
        if ($('input[type=url]').val() === "") {
            socket.emit('login', {
                username: $('#username').val()
            });
        } else {
            socket.emit('login', {
                username: $('#username').val(),
                avatar: $('input[type=url]').val()
            });
        }
    });

    $('#notifier').on('click', function () {
        if (notification.length === 0) {
            $('#notifier').removeClass('notify');
        } else {
            var obj = notification[0];
            notification.shift();
            if (notification.length === 0) {
                $('#notifier').val(notification.length);
                $('#notifier').removeClass('notify');
            } else {
                $('#notifier').val(notification.length);
            }
            Mustache.render(mp, obj);
            $('body').append('<div id="mp">' + Mustache.render(mp, obj) + '</div>');
            $('#reply-content').focus();
            $('#mp-reply').on('submit', function (e) {
                if ($('#reply-content').val().length > 0) {
                    e.preventDefault();
                    socket.emit('mp', {
                        sender: me,
                        receiver: obj.sender.username,
                        content: $('#reply-content').val()
                    });

                    $(this).closest($('#mp')).remove();
                } else {
                    var alerte = '<div class="notif alert">Votre message est vide</div>';
                    $('#notif').append(alerte);
                    setTimeout(function () {
                        $('.alert').fadeOut();
                        $('.alert').remove();
                    }, 3000);
                }

            });
        }
        $('.close').on('click', function () {
            $(this).closest($('div')).hide();
            notification.shift();
            if (notification.length === 0) {
                $('#notifier').val(notification.length);
                $('#notifier').removeClass('notify');
            } else {
                $('#notifier').val(notification.length);
            }
        });
    });

    $('#mp-button').on('click', function () {
        $('#sendmp').show();
        $('#mpsender').on('submit', function (e) {
            e.preventDefault();
            socket.emit('mp', {
                sender: me,
                receiver: $('#receiver').val(),
                content: $('#content').val()
            });
            $('#receiver').val('');
            $('#content').val('')
            $('#sendmp').hide();
        });
        $('.close').on('click', function () {
            $(this).closest($('div')).hide();
        });
    });


    socket.on('logged', function (user) {
        $('#login').fadeOut(4000);
        setTimeout(function () {
            $('.container').fadeIn();
            $('#message').focus();
        }, 2000);
        me = user;

    });

    socket.on('newusr', function (user) {
        $('#users').append('<div class="user" id="' + user.id + '"><img src="' + user.avatar + '"  class="connecte" alt="Avatar de ' + user.username + '" title="' + user.username + '"><br><span>' + user.username + '</span></div>');
    });

    socket.on('hasBlocked', function (block) {
        for (var i in block.blocker.blacklist) {
            if (block.blocker.blacklist[i] === me.id) {
                me.blacklist.push(block.blocker.id);
                var alerte = '<div class="notif alert">' + block.blocker.username + ' s\'est déconnecté</div>';
                $('#notif').append(alerte);
                setTimeout(function () {
                    $('.alert').fadeOut();
                    $('.alert').remove();
                }, 3000);
                $('#' + block.blocker.id).remove();
            }
        }
    });

    socket.on('confirm', function (block) {
        block.blockConfirm = confirm('Bloquer ' + block.blocked.username);
        socket.emit('block', block);
        me.blacklist.push(block.blocked.id);
        $('#' + block.blocked.id).remove();
    });

    socket.on('disusr', function (user) {
        $('#' + user.id).remove();
    });

    /**Envoi de message**/
    $('#form').on('submit', function (event) {
        event.preventDefault();
        if ($('#message').val().length > 0) {

            /* Avoir la liste des connectés */
            if ($('#message').val() === '/ul') {
                socket.emit('getUL');
            }

            /* Changer de nom */
            else if ($('#message').val().substring(0, 3) === '/cn') {
                socket.emit('chgName', {
                    newName: $('#message').val().substring(4, $('#message').val().length),
                    user: me
                });
            }

            /* Bloquer utilisateur */
            else if ($('#message').val().substring(0, 2) === '/b') {
                socket.emit('block', {
                    blocked: $('#message').val().substring(3, $('#message').val().length),
                    blocker: me,
                    blockConfirm: false
                });
            }

            /* Envoyer mp */
            else if ($('#message').val().substring(0, 3) === '/mp') {
                var message = $('#message').val().substring(4, $('#message').val().length);
                var sender = message.substring(0, message.indexOf(':'));
                var mail = message.substring(message.indexOf(':') + 1, message.length);
                socket.emit('mp', {
                    sender: me,
                    receiver: sender,
                    content: mail
                });
            }

            /* Changer Avatar */
            else if ($('#message').val().substring(0, 3) === '/av') {
                if (isAvatar($('#message').val().substring(4, $('#message').val().length))) {
                    me.avatar = $('#message').val().substring(4, $('#message').val().length);
                    socket.emit('chgAvatar', {
                        newAvatar: $('#message').val().substring(4, $('#message').val().length),
                        user: me
                    });
                } else {
                    var alerte = '<div class="notif alert">URL est incorrecte</div>';
                    $('#notif').append(alerte);
                    setTimeout(function () {
                        $('.alert').fadeOut();
                        $('.alert').remove();
                    }, 3000);
                }
            }

            /* Message normal */
            else {
                socket.emit('newmsg', {
                    message: $('#message').val(),
                    user: me
                });
            }
            $('#message').val('');
            $('#message').focus();

        } else {
            var alerte = '<div class="notif alert">Votre message est vide</div>';
            $('#notif').append(alerte);
            setTimeout(function () {
                $('.alert').fadeOut();
                $('.alert').remove();
            }, 3000);
        }
    });

    socket.on('nameChanged', function (newName) {
        me.username = newName;
    });

    $('.user img.connecte').on('click', function () {
        alert('ok');
    });

    socket.on('newName', function (chgUsr) {
        console.log(chgUsr);
        $('#' + chgUsr[0] + ' img').attr('alt', 'Avatar de ' + chgUsr[1]);
        $('#' + chgUsr[0] + ' img').attr('title', chgUsr[1]);
        $('#' + chgUsr[0] + ' span').text(chgUsr[1]);
    });

    socket.on('newmsg', function (message) {
        if (lastmsg != message.user.id) {
            $('#messages').append('<div class="sep"></div>');
            lastmsg = message.user.id;
        }
        if (isBlocked(me.blacklist, message.user.id)) {} else {
            Mustache.render(msgtpl, message);
            $('#messages').append('<div class="message">' + Mustache.render(msgtpl, message) + '</div>');
            $('#messages').animate({
                scrollTop: $('#messages').prop('scrollHeight')
            }, 500);
        }
    });

    socket.on('mpArrived', function (obj) {
        if (isBlocked(me.blacklist, obj.sender.id) || me.id !== obj.receiver.id) {} else {
            notification.push(obj);
            $('#notifier').val(notification.length);
            $('#notifier').addClass('notify');
            $.ionSound.play("tap");
            console.log('tap');
        }
    });

    $(window).on('unload', function () {
        alert('deconnection');
        socket.emit('disconnect', me);
    });


    function isBlocked(blacklist, message) {
        var blockedUsr = false;
        for (var j in blacklist) {
            if (blacklist[j] === message) {
                blockedUsr = true;
            }
        }
        return blockedUsr;
    }

    socket.on('giveID', function (newID) {
        me.id = newID;
    });

    socket.on('newAvatar', function (avatar) {
        $('#' + avatar.user.id + ' img').attr('src', avatar.newAvatar);
    });

    socket.on('avatarChanged', function (newAvatar) {
        me.avatar = newAvatar;
    });

    /** Message sytème */
    socket.on('ctri', function (str) {
        var infos = '<div class="info-sys">' + str + '</div>';
        $('#notif').append(infos);
        setTimeout(function () {
            $('.info-sys').fadeOut();
            $('.info-sys').remove();
        }, 3000);
    });

    socket.on('ctr', function (str) {
        var success = '<div class="notif success">' + str + '</div>';
        $('#notif').append(success);
        setTimeout(function () {
            $('.success').fadeOut();
            $('.success').remove();
        }, 3000);
    });

    socket.on('ctrw', function (str) {
        var alerte = '<div class="notif alert">' + str + '</div>';
        $('#notif').append(alerte);
        setTimeout(function () {
            $('.alert').fadeOut();
            $('.alert').remove();
        }, 3000);
    });

})(jQuery);

String.prototype.contains = function (it) {
    if (this.indexOf(it.toUpperCase()) < 0) {
        return true;
    } else {
        return false;
    }
}

String.prototype.containsTab = function (it) {
    for (var i in it) {
        return this.contains(it[i]);
    }
}

function isAvatar(url) {
    var tab = ['http://', 'https://'];
    if (url.containsTab(['http://', 'https://'])) {
        if (url.containsTab(['.jpg', '.gif', '.png', '.jpeg'])) {
            return true;
        }
    } else {
        return false;
    }
}

Array.prototype.unset = function (val) {
    var index = this.indexOf(val);
    if (index > -1) {
        this.splice(index, 1);
    }
};