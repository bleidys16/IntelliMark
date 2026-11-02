import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo)
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '220px',
            textAlign: 'center',
            background: 'var(--bg-main, #FEF8F0)',
            color: 'var(--text-main, #1F2937)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <AlertTriangle size={22} color="#dc2626" />
          </div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700 }}>
            {this.props.fallbackTitle || 'Ocurrió un error inesperado'}
          </h4>
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '11.5px',
              color: '#6b7280',
              maxWidth: '300px',
              lineHeight: '1.4',
            }}
          >
            {this.state.error?.message || 'La aplicación encontró un problema temporal.'}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'var(--primary, #E07A5F)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> Reintentar y recargar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
