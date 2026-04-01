import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', heightCm: '', targetWeightKg: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 14,
    background: '#1c1c1c', border: '1px solid #2e2e2e',
    color: '#fff', fontSize: 15, outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const fields: { key: keyof typeof form; label: string; type: string; required: boolean }[] = [
    { key: 'name', label: 'Nom', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'password', label: 'Mot de passe', type: 'password', required: true },
    { key: 'heightCm', label: 'Taille (cm)', type: 'number', required: false },
    { key: 'targetWeightKg', label: 'Objectif poids (kg)', type: 'number', required: false },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>Créer un compte</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Commence ton suivi aujourd'hui</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map(({ key, label, type, required }) => (
            <input
              key={key} type={type} placeholder={label}
              value={form[key]} onChange={set(key)} required={required}
              style={inputStyle}
            />
          ))}
          {error && <div style={{ fontSize: 13, color: '#f87171' }}>{error}</div>}
          <button
            type="submit" disabled={loading}
            style={{ marginTop: 4, padding: '15px', borderRadius: 14, background: '#d4a843', border: 'none', color: '#000', fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#555', fontSize: 13, marginTop: 24 }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: '#d4a843', fontWeight: 700, textDecoration: 'none' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
