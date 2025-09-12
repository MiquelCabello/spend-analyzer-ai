import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Auth from '@/pages/Auth'

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    }
  }
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  })
}))

const AuthWrapper = () => (
  <BrowserRouter>
    <Auth />
  </BrowserRouter>
)

describe('Auth Component', () => {
  it('renders login form by default', () => {
    render(<AuthWrapper />)
    
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu@empresa.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tu contraseña')).toBeInTheDocument()
  })

  it('switches to signup form when clicking register tab', () => {
    render(<AuthWrapper />)
    
    fireEvent.click(screen.getByText('Registrarse'))
    
    expect(screen.getByPlaceholderText('Tu nombre completo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Repite tu contraseña')).toBeInTheDocument()
  })

  it('shows password when eye icon is clicked', () => {
    render(<AuthWrapper />)
    
    const passwordInput = screen.getByPlaceholderText('Tu contraseña')
    const eyeButton = screen.getAllByRole('button')[0] // First eye button
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    fireEvent.click(eyeButton)
    
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('validates password confirmation in signup', async () => {
    render(<AuthWrapper />)
    
    fireEvent.click(screen.getByText('Registrarse'))
    
    const passwordInput = screen.getByPlaceholderText('Mínimo 6 caracteres')
    const confirmPasswordInput = screen.getByPlaceholderText('Repite tu contraseña')
    const submitButton = screen.getByText('Crear Cuenta')
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } })
    
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    })
  })
})