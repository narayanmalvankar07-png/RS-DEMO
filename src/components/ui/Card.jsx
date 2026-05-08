import { T } from '../../config/constants.js';

export default function Card({ children, dk, style: ext = {}, anim = true, hover = true, className = "" }) {
  const th = T(dk);
  return (
    <div
      className={`${hover ? "rs-card" : ""} ${anim ? "rs-fade-up" : ""} ${className}`}
      style={{
        background: th.surf,
        backdropFilter: th.blur,
        WebkitBackdropFilter: th.blur,
        border: `1px solid ${th.bdr}`,
        borderRadius: 24,
        padding: 18,
        marginBottom: 14,
        ...ext,
      }}
    >
      {children}
    </div>
  );
}
