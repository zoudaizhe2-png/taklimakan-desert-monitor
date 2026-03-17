import useFadeIn from "../hooks/useFadeIn";
import "./FadeSection.css";

export default function FadeSection({ children, className = "", ...props }) {
  const ref = useFadeIn();
  return <section ref={ref} className={`fade-section ${className}`} {...props}>{children}</section>;
}
