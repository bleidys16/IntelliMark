import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'IntelliMark - YouTube Timestamp Notes',
  description: 'Toma notas asociadas a timestamps en videos de YouTube, salta al momento exacto y exporta a Markdown.',
  version: '0.1.0',
  permissions: [
    'storage',
    'sidePanel',
  ],
  host_permissions: [
    'https://www.youtube.com/*',
    'https://api.groq.com/*',
  ],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  icons: {
    '16': 'public/icons/icon-16.png',
    '48': 'public/icons/icon-48.png',
    '128': 'public/icons/icon-128.png',
  },
  action: {
    default_title: 'Abrir IntelliMark',
    default_icon: {
      '16': 'public/icons/icon-16.png',
      '48': 'public/icons/icon-48.png',
    },
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  content_scripts: [
    {
      matches: ['https://www.youtube.com/*'],
      js: ['src/content/youtube.ts'],
      run_at: 'document_idle',
    },
  ],
  commands: {
    'open-panel': {
      suggested_key: {
        default: 'Alt+Shift+P',
        mac: 'Alt+Shift+P',
      },
      description: 'Abrir o cerrar el panel lateral de IntelliMark',
    },
    'quick-note': {
      suggested_key: {
        default: 'Alt+Shift+N',
        mac: 'Alt+Shift+N',
      },
      description: 'Crear una nueva nota rápida en el timestamp actual',
    },
  },
})
