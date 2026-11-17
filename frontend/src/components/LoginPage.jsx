import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import Campo from './Campo.jsx';

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erros, setErros] = useState({ erro: '', campos: {} });
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  const alterar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    const campos = {};
    if (!form.email.trim()) campos.email = 'Informe o e-mail.';
    if (!form.senha) campos.senha = 'Informe a senha.';
    if (Object.keys(campos).length) return setErros({ erro: '', campos });

    setEnviando(true);
    try {
      await login(form.email, form.senha);
      navigate(location.state?.de ?? '/', { replace: true });
    } catch (err) {
      setErros({ erro: err.message, campos: err.campos ?? {} });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-auth">
      <form className="cartao" onSubmit={enviar} noValidate>
        <h1>Entrar</h1>
        {erros.erro && <p className="erro-geral">{erros.erro}</p>}
        <Campo id="email" rotulo="E-mail" type="email" autoComplete="email"
          value={form.email} onChange={alterar} erro={erros.campos.email} />
        <Campo id="senha" rotulo="Senha" type="password" autoComplete="current-password"
          value={form.senha} onChange={alterar} erro={erros.campos.senha} />
        <button type="submit" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
        <p>Não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
      </form>
    </div>
  );
}
