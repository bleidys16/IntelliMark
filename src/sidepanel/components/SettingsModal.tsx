import React, { useState, useEffect } from 'react'
import { Key, Check, X, Shield, ExternalLink } from 'lucide-react'
import { getGroqApiKey, setGroqApiKey } from '../../core/ai/groq-client'

interface SettingsModalProps {
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState<string>('')
  const [saved, setSaved] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    getGroqApiKey().then((k) => {
      setApiKey(k)
      setLoading(false)
    })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await setGroqApiKey(apiKey)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1200)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Key size={18} color="var(--primary)" />
            <h3>Configuración de IA (Groq)</h3>
          </div>
          <button className="action-icon-btn" onClick={onClose} title="Cerrar">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          <div className="settings-section">
            <label className="settings-label">
              <span>Groq API Key (Gratuita)</span>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="external-link-hint"
              >
                Obtener gratis en console.groq.com <ExternalLink size={11} />
              </a>
            </label>
            <input
              type="password"
              className="search-input"
              style={{ paddingLeft: '12px' }}
              placeholder="gsk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={loading}
            />
            <p className="settings-tip">
              <Shield size={12} color="var(--accent)" /> Tu clave se guarda exclusivamente en el almacenamiento local de tu navegador (<code>chrome.storage.local</code>) y nunca sale de tu equipo salvo para consultar la API de Groq.
            </p>
          </div>

          <div className="modal-footer" style={{ margin: '0 -16px -16px -16px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {saved ? <Check size={14} color="#10b981" /> : <Check size={14} />}
              <span>{saved ? '¡Guardada!' : 'Guardar clave'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
