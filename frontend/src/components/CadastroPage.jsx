import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { cpfValido, emailValido, mascaraCpf, senhaValida } from '../services/validacao.js';
import Campo from './Campo.jsx';

const VAZIO = { nome: '', email: '', cpf: '', senha: '', confirmacaoSenha: '' };

function validar(f) {
  const c = {};
  if (!f.nome.trim()) c.nome = 'Informe o nome.';
  if (!f.email.trim()) c.email = 'Informe o e-mail.';
  else if (!emailValido(f.email)) c.email = 'E-mail inválido.';
  if (!f.cpf) c.cpf = 'Informe o CPF.';
  else if (!cpfValido(f.cpf)) c.cpf = 'CPF inválido.';
  if (!f.senha) c.senha = 'Informe a senha.';
  else if (!senhaValida(f.senha)) c.senha = 'A senha deve ter ao menos 8 caracteres, com letras e números.';
  if (f.senha !== f.confirmacaoSenha) c.confirmacaoSenha = 'As senhas não conferem.';
  return c;
}

export default function CadastroPage() {
  const { usuario, cadastrar } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(VAZIO);
  const [erros, setErros] = useState({ erro: '', campos: {} });
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  function alterar(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'cpf' ? mascaraCpf(value) : value });
  }

  async function enviar(e) {
    e.preventDefault();
    const campos = validar(form);
    if (Object.keys(campos).length) return setErros({ erro: 'Corrija os campos destacados.', campos });

    setEnviando(true);
    try {
      await cadastrar(form);
      navigate('/', { replace: true });
    } catch (err) {
      // 409 (e-mail/CPF duplicado) e 400 trazem a mensagem no campo certo
      setErros({ erro: err.message, campos: err.campos ?? {} });
    } finally {
      setEnviando(false);
    }
  }

  const c = erros.campos;
  return (
    <div className="pagina-auth">
      <form className="cartao" onSubmit={enviar} noValidate>
        <h1>Criar conta</h1>
        {erros.erro && <p className="erro-geral">{erros.erro}</p>}
        <Campo id="nome" rotulo="Nome" autoComplete="name" value={form.nome} onChange={alterar} erro={c.nome} />
        <Campo id="email" rotulo="E-mail" type="email" autoComplete="email" value={form.email} onChange={alterar} erro={c.email} />
        <Campo id="cpf" rotulo="CPF" inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={alterar} erro={c.cpf} />
        <Campo id="senha" rotulo="Senha" type="password" autoComplete="new-password" value={form.senha} onChange={alterar} erro={c.senha} />
        <Campo id="confirmacaoSenha" rotulo="Confirme a senha" type="password" autoComplete="new-password"
          value={form.confirmacaoSenha} onChange={alterar} erro={c.confirmacaoSenha} />
        <button type="submit" disabled={enviando}>{enviando ? 'Cadastrando...' : 'Cadastrar'}</button>
        <p>Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  );
}
