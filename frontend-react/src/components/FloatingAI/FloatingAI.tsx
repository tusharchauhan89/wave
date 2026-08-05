import "./FloatingAI.css";
import { Sparkles } from "lucide-react";

function FloatingAI() {
  return (
    <button className="floating-ai">
      <Sparkles size={20} />

      <span>Grove AI</span>
    </button>
  );
}

export default FloatingAI;