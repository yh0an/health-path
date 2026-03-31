import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';

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

  const fields: { key: keyof typeof form; label: string; type: string; required: boolean }[] = [
    { key: 'name', label: 'Nom', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'password', label: 'Mot de passe', type: 'password', required: true },
    { key: 'heightCm', label: 'Taille (cm)', type: 'number', required: false },
    { key: 'targetWeightKg', label: 'Objectif poids (kg)', type: 'number', required: false },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-label mb-2">Créer un compte</h1>
        <p className="text-secondary mb-8">Commence ton suivi aujourd'hui</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map(({ key, label, type, required }) => (
            <input
              key={key} type={type} placeholder={label}
              value={form[key]} onChange={set(key)} required={required}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-accent text-label"
            />
          ))}
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Création...' : 'Créer mon compte'}
          </Button>
        </form>
        <p className="text-center text-secondary mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-accent font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
