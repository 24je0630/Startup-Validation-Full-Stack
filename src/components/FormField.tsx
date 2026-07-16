type FormFieldProps = {
  label: string;
  type: 'text' | 'email' | 'password';
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
};

export function FormField({
  label,
  type,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="font-mono text-xs uppercase tracking-widest text-graphite">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="mt-2 w-full rounded border border-line bg-transparent px-4 py-2.5 text-paper placeholder:text-graphite/60 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal"
      />
    </label>
  );
}
