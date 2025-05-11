export function Button({ className = "", ...props }) {
  return (
    <button
      className={`bg-cyan-700 hover:bg-cyan-800 text-white px-3 py-1 rounded shadow ${className}`}
      {...props}
    />
  );
}
