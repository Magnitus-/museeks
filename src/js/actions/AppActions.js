import Player from '../lib/player';
import app    from '../lib/app';

import LibraryActions       from './LibraryActions';
import PlaylistsActions     from './PlaylistsActions';
import NotificationsActions from './NotificationsActions';
import PlayerActions        from './PlayerActions';
import QueueActions         from './QueueActions';
import SettingsActions      from './SettingsActions';

const globalShortcut = electron.remote.globalShortcut;
const ipcRenderer    = electron.ipcRenderer;

const init = () => {
    // Usual tasks
    LibraryActions.load();
    PlaylistsActions.refresh();
    SettingsActions.check();
    initShortcuts();
    start();

    // Bind player events
    // Audio Events
    Player.getAudio().addEventListener('ended', PlayerActions.next);
    Player.getAudio().addEventListener('error', PlayerActions.audioError);
    Player.getAudio().addEventListener('timeupdate', () => {
        if (Player.isThresholdReached()) {
            LibraryActions.incrementPlayCount(Player.getAudio().src);
        }
    });
    Player.getAudio().addEventListener('play', () => {
        ipcRenderer.send('playerAction', 'play');
    });
    Player.getAudio().addEventListener('pause', () => {
        ipcRenderer.send('playerAction', 'pause');
    });

    // Listen for main-process events
    ipcRenderer.on('playerAction', (event, reply) => {

        switch(reply) {
            case 'play':
                PlaylistsActions.play();
                break;
            case 'pause':
                PlaylistsActions.pause();
                break;
            case 'prev':
                PlaylistsActions.previous();
                break;
            case 'next':
                PlaylistsActions.next();
                break;
        }
    });

    // Prevent some events
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    }, false);

    window.addEventListener('drop', (e) => {
        e.preventDefault();
    }, false);

    window.addEventListener('beforeunload', (e) => {
        // See http://electron.atom.io/docs/api/browser-window/#event-close
        e.returnValue = false;
        close();
    });

    // Remember dimensions and positionning
    const currentWindow = app.browserWindows.main;

    currentWindow.on('resize', saveBounds);

    currentWindow.on('move', saveBounds);
};

const start = () => {
    ipcRenderer.send('appReady');
};

const restart = () => {
    ipcRenderer.send('appRestart');
};

const close = () => {
    if(app.config.get('minimizeToTray')) {

        app.browserWindows.main.hide();
        ipcRenderer.send('showTray');

    } else {

        app.browserWindows.main.destroy();
    }
};

const minimize = () => {
    app.browserWindows.main.minimize();
};

const maximize = () => {
    app.browserWindows.main.isMaximized() ? app.browserWindows.main.unmaximize() : app.browserWindows.main.maximize();
};

const saveBounds = () => {
    const now = window.performance.now();

    if (now - self.lastFilterSearch < 250) {
        clearTimeout(self.filterSearchTimeOut);
    }

    self.lastFilterSearch = now;

    self.filterSearchTimeOut = setTimeout(() => {

        app.config.set('bounds', app.browserWindows.main.getBounds());
        app.config.saveSync();

    }, 250);
};

const initShortcuts = () => {

    // Global shortcuts - Player
    globalShortcut.register('MediaPlayPause', () => {
        PlaylistsActions.playToggle();
    });

    globalShortcut.register('MediaPreviousTrack', () => {
        PlaylistsActions.previous();
    });

    globalShortcut.register('MediaNextTrack', () => {
        PlaylistsActions.next();
    });
};

export default {
    player        : PlayerActions,
    playlists     : PlaylistsActions,
    queue         : QueueActions,
    library       : LibraryActions,
    settings      : SettingsActions,
    notifications : NotificationsActions,

    close,
    init,
    initShortcuts,
    maximize,
    minimize,
    saveBounds,
    start,

    app: {
        restart
    }
};
