// Input with a label and an error message (from the client or the server) right below it.
export default function Field({ id, label, error, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} aria-invalid={Boolean(error)} {...props} />
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
