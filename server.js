/* Librairies & extensions requises */
var http = require('http');
var md5 = require('MD5');

/* Création du serveur  */
httpServer = http.createServer(function (req, res) {
    console.log('Un utilisateur a affiché la page');
});

/* Amélioration d'array */
Array.prototype.unset = function (val) {
    var index = this.indexOf(val);
    if (index > -1) {
        this.splice(index, 1);
    }
};

Array.prototype.contains = function (val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === val) {
            return true;
        } else {
            return false;
        }
    }
};

/* Démarage du serveur */
httpServer.listen(80);

/* Démarrage de Sokets */
var io = require('socket.io').listen(httpServer);
var users = {};
var messages = [];
var history = 4;
var userList = [];


io.sockets.on('connection', function (socket) {

    var you = false;

    for (var k in users) {
        socket.emit('newusr', users[k]);
    }

    for (var j in messages) {
        socket.emit('newmsg', messages[j]);
    }

    /* Gestion du Login */
    socket.on('login', function (user) {
        var idu = new Date().getTime();
        you = user;
        you.id = user.username.replace(" ", "-") + idu;
        userList.push(you.username);
        if (you.avatar !== undefined && isAvatar(you.avatar)) {} else {
            you.avatar = 'https://gravatar.com/avatar/' + md5(user.id) + '?s=50';
        }
        you.blacklist = [];
        socket.emit('logged', you);
        socket.emit('ctri', "Bienvenue sur <em>Chattr</em>");
        users[you.id] = you;
        socket.emit('giveID', you.id);
        socket.broadcast.emit('ctr', you.username + " vient de se connecter");
        io.sockets.emit('newusr', you);
    });

    /* Déconnection */
    socket.on('disconnect', function () {
        if (!you) {
            return false;
        }
        delete users[you.id];
        userList.unset(you.username);
        if (userList.length < 1) {
            messages = [];
            userList = [];
        }
        io.sockets.emit('disusr', you);
        socket.broadcast.emit('ctrw', you.username + " vient de se déconnecter");
    });

    /* Nouveau message */
    socket.on('newmsg', function (message) {
        if (message.message !== "") {
            var date = new Date();
            message.h = date.getHours();
            message.m = date.getMinutes();
            messages.push(message);
            if (messages.length > history) {
                messages.shift();
            }
            io.sockets.emit('newmsg', message);
        } else {
            socket.emit('ctrw', 'Votre message est vide');
        }
    });

    /* Changement d'avatar */
    socket.on('chgAvatar', function (chgAvatar) {
        if (isAvatar(chgAvatar.newAvatar)) {
            you.avatar = chgAvatar.newAvatar;
            io.sockets.emit('newAvatar', chgAvatar);
            socket.emit('avatarChanged', chgAvatar.newAvatar);
        } else {
            socket.emit('ctrw', 'Votre URL est incorrecte');
        }
    });

    /* Renvoyer la liste des connectés */
    socket.on('getUL', function () {
        var myUserList = userList.slice(0);
        myUserList.unset(you.username);
        if (myUserList.length === 0) {
            socket.emit('ctri', '<em>Chattr</em> ne voit que toi</div>');
        } else {
            var infos = '<em>Chattr</em> compte ' + userList.length + ' connectés :<ul>';
            for (var i in userList) {
                infos += '<li>' + userList[i] + '</li>';
            }
            infos += '</ul>';
            socket.emit('ctri', infos);
        }
    });


    /* Gère le blocage */
    socket.on('block', function (block) {
        if (isConnected(block.blocked) || block.blockConfirm) {
            if (!block.blockConfirm) {
                block.blocked = getUsr(block.blocked);
                socket.emit('confirm', block);
            } else {
                if (block.blocked.id === block.blocker.id) {
                    socket.emit('ctrw', 'Impossible de vous bloquer vous même');
                } else {
                    block.blocker.blacklist.push(block.blocked.id);
                    socket.broadcast.emit('hasBlocked', block);
                    socket.emit('ctri', 'Vous avez bloqué ' + block.blocked.username);
                }
            }
        } else {
            socket.emit('ctrw', 'Utilisateur inexistant');
        }
    });

    socket.on('mp', function (Obj) {
        if (isConnected(Obj.receiver)) {
            Obj.receiver = getUsr(Obj.receiver);
            var date = new Date();
            Obj.h = date.getHours();
            Obj.m = date.getMinutes();
            socket.broadcast.emit('mpArrived', Obj);
        } else {
            socket.emit('ctrw', 'Utilisateur inexistant');
        }
    });

    /* Changement de nom  */
    socket.on('chgName', function (newName) {
        if (alreadyExist(newName.newName)) {
            socket.emit('ctrw', newName.newName + ' est déjà pris !');
        } else {
            socket.broadcast.emit('ctrw', newName.user.username + " devient " + newName.newName);
            socket.emit('ctri', '<em>Chattr</em> a bien changé votre nom. Vous vous appelez ' + newName.newName);
            socket.emit('nameChanged', newName.newName);
            you.username = newName.newName;
            io.sockets.emit('newName', [newName.user.id, newName.newName]);
            userList.unset(newName.user.username);
            newName.user.username = newName.newName;
            userList.push(newName.user.username);
        }
    });

});

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

function isConnected(name) {
    var connected = false;
    for (var k in users) {
        if (users[k].username === name) {
            connected = true;
        }
    }
    return connected;
}

function getUsr(name) {
    if (isConnected(name)) {
        for (var k in users) {
            if (users[k].username === name) {
                return users[k];
            }
        }
    }
}

function alreadyExist(name) {
    var already = false;
    for (var k in users) {
        if (users[k].username === name) {
            already = true;
        }
    }
    return already;
}
