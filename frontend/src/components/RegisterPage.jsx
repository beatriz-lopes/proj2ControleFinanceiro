import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { isValidCpf, isValidEmail, isValidPassword, maskCpf } from '../services/validation.js';
import Field from './Field.jsx';

const EMPTY = { name: '', email: '', cpf: '', password: '', passwordConfirmation: '' };

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Informe o nome.';
  if (!f.email.trim()) e.email = 'Informe o e-mail.';
  else if (!isValidEmail(f.email)) e.email = 'E-mail inválido.';
  if (!f.cpf) e.cpf = 'Informe o CPF.';
  else if (!isValidCpf(f.cpf)) e.cpf = 'CPF inválido.';
  if (!f.password) e.password = 'Informe a senha.';
  else if (!isValidPassword(f.password)) e.password = 'A senha deve ter ao menos 8 caracteres, com letras e números.';
  if (f.password !== f.passwordConfirmation) e.passwordConfirmation = 'As senhas não conferem.';
  return e;
}

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({ message: '', fields: {} });
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'cpf' ? maskCpf(value) : value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fields = validate(form);
    if (Object.keys(fields).length) return setErrors({ message: 'Corrija os campos destacados.', fields });

    setSubmitting(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      // 409 (duplicated e-mail/CPF) and 400 carry the message in the right field
      setErrors({ message: err.message, fields: err.fields ?? {} });
    } finally {
      setSubmitting(false);
    }
  }

  const f = errors.fields;
  return (
    <div className="auth-page">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <h1>Criar conta</h1>
        {errors.message && <p className="form-error">{errors.message}</p>}
        <Field id="name" label="Nome" autoComplete="name" value={form.name} onChange={handleChange} error={f.name} />
        <Field id="email" label="E-mail" type="email" autoComplete="email" value={form.email} onChange={handleChange} error={f.email} />
        <Field id="cpf" label="CPF" inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} error={f.cpf} />
        <Field id="password" label="Senha" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} error={f.password} />
        <Field id="passwordConfirmation" label="Confirme a senha" type="password" autoComplete="new-password"
          value={form.passwordConfirmation} onChange={handleChange} error={f.passwordConfirmation} />
        <button type="submit" disabled={submitting}>{submitting ? 'Cadastrando...' : 'Cadastrar'}</button>
        <p>Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  );
}
