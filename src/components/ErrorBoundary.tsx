import React from 'react'

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  override render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl m-4">
          <p className="text-red-600 font-medium">Something went wrong loading this section.</p>
          <p className="text-red-400 text-sm mt-1">{this.state.error?.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}
