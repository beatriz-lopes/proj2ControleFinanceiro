// Input com rótulo e mensagem de erro (do cliente ou do servidor) logo abaixo.
export default function Campo({ id, rotulo, erro, ...props }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} name={id} aria-invalid={Boolean(erro)} {...props} />
      {erro && <small className="erro-campo">{erro}</small>}
    </div>
  );
}
