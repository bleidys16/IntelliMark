// IntelliMark Service Worker (Manifest V3)
// Gestiona el ciclo de vida del Side Panel y atajos de teclado globales.

chrome.runtime.onInstalled.addListener(() => {
  console.log('[IntelliMark] Extensión instalada con éxito.')

  // Abrir Side Panel al hacer clic en el ícono de la extensión
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('[IntelliMark] Error al configurar sidePanel:', error))
  }
})

// Escuchar comandos de teclado registrados en el manifest
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[IntelliMark] Comando recibido:', command)

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!activeTab?.windowId) return

  if (command === 'open-panel' || command === 'quick-note') {
    // Abrir el Side Panel en la ventana actual
    if (chrome.sidePanel && chrome.sidePanel.open) {
      try {
        await chrome.sidePanel.open({ windowId: activeTab.windowId })
      } catch (err) {
        console.warn('[IntelliMark] No se pudo abrir sidePanel programáticamente:', err)
      }
    }

    // Si es quick-note, avisar al Side Panel para que abra el editor de nota de inmediato
    if (command === 'quick-note') {
      // Pequeño timeout para permitir que el sidepanel cargue si no estaba abierto
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'TRIGGER_QUICK_NOTE' }).catch(() => {
          // Si el panel no estaba abierto a tiempo, el mensaje se ignora sin error
        })
      }, 300)
    }
  }
})
