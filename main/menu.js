// Packages
const { Menu: { buildFromTemplate }, dialog } = require('electron')
const { is } = require('electron-util')
const isDev = require('electron-is-dev')

// Utilities
const { clearCache } = require('./utils/store')
const { openChat, openUpdateLocation } = require('./utils/frames/open')
const { getUser, getDisplayFormat } = require('./utils/store')
const logout = require('./utils/logout')

const showAboutDialog = app => {
  dialog.showMessageBox(null, {
    type: 'info',
    buttons: ['Done'],
    title: 'About',
    message: `There PM (${app.getVersion()})\nCopyright (C) 2018 There. All rights reserved`,
  })
}

exports.innerMenu = function(app, windows) {
  const user = getUser()
  const displayFormat12Hour = getDisplayFormat() === '12h'
  const { openAtLogin } = app.getLoginItemSettings()

  return buildFromTemplate([
    {
      label: is.macos ? `About ${app.getName()}` : 'About',
      click() {
        showAboutDialog(app)
      },
    },
    {
      type: 'separator',
    },
    {
      label: user.twitterHandle,
      enabled: false,
    },
    {
      label: 'Your Location',
      click: () => {
        openUpdateLocation(windows)
      },
    },
    {
      label: 'Logout',
      click: logout,
    },
    {
      type: 'separator',
    },
    {
      label: 'Clear Cache',
      click() {
        clearCache()
      },
    },
    {
      label: 'Support',
      click() {
        openChat(windows, null)
      },
    },
    {
      type: 'separator',
    },
    {
      label: '12-hour format',
      type: 'checkbox',
      checked: displayFormat12Hour,
      click() {
        if (windows && windows.main) {
          windows.main.webContents.send('toggle-format')
        }
      },
    },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: openAtLogin,
      enabled: !isDev,
      click() {
        app.setLoginItemSettings({
          openAtLogin: !openAtLogin,
        })
      },
    },
    {
      type: 'separator',
    },
    {
      role: 'quit',
      accelerator: 'Cmd+Q',
    },
  ])
}

exports.outerMenu = function(app, windows) {
  return buildFromTemplate([
    {
      label: is.macos ? `About ${app.getName()}` : 'About',
      click() {
        showAboutDialog(app)
      },
    },
    {
      label: 'Support',
      click() {
        openChat(windows, null)
      },
    },
    {
      type: 'separator',
    },
    {
      role: 'quit',
      accelerator: 'Cmd+Q',
    },
  ])
}

exports.followingMenu = (following, windows) => {
  return buildFromTemplate([
    {
      label: following.__typename === 'User' ? `Unfollow` : `Remove`,
      click() {
        if (windows && windows.main) {
          windows.main.webContents.send('remove-following', following)
        }
      },
    },
  ])
}

exports.appMenu = () => {
  const template = [
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo',
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo',
        },
        {
          type: 'separator',
        },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut',
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy',
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste',
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.reload()
            }
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: (function() {
            if (process.platform === 'darwin') return 'Ctrl+Command+F'
            else return 'F11'
          })(),
          click(item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
            }
          },
        },
      ],
    },
    {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
      ],
    },
  ]

  // Enable developer tools
  template[1].submenu.push({
    label: 'Toggle Devtools',
    accelerator: (function() {
      if (process.platform === 'darwin') return 'Alt+Command+J'
      else return 'Ctrl+Shift+J'
    })(),
    click: function(item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.toggleDevTools()
      }
    },
  })

  return template
}
