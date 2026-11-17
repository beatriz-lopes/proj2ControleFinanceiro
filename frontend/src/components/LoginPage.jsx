import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import Field from './Field.jsx';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ message: '', fields: {} });
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    const fields = {};
    if (!form.email.trim()) fields.email = 'Informe o e-mail.';
    if (!form.password) fields.password = 'Informe a senha.';
    if (Object.keys(fields).length) return setErrors({ message: '', fields });

    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      setErrors({ message: err.message, fields: err.fields ?? {} });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <h1>Entrar</h1>
        {errors.message && <p className="form-error">{errors.message}</p>}
        <Field id="email" label="E-mail" type="email" autoComplete="email"
          value={form.email} onChange={handleChange} error={errors.fields.email} />
        <Field id="password" label="Senha" type="password" autoComplete="current-password"
          value={form.password} onChange={handleChange} error={errors.fields.password} />
        <button type="submit" disabled={submitting}>{submitting ? 'Entrando...' : 'Entrar'}</button>
        <p>Não tem conta? <Link to="/register">Cadastre-se</Link></p>
      </form>
    </div>
  );
}
