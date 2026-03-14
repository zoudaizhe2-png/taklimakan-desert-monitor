import { FiX } from "react-icons/fi";

export default function SlidePanel({ open, onClose, children }) {
  return (
    <div className={`slide-panel ${open ? "open" : ""}`}>
      <button className="panel-close-btn" onClick={onClose} aria-label="Close">
        <FiX size={20} />
      </button>
      <div className="panel-content">{children}</div>
    </div>
  );
}
