import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

interface MathTextProps {
  text: string;
  block?: boolean;
  className?: string;
}

const MathText = ({ text, block = false, className = "" }: MathTextProps) => {
  if (block) {
    return (
      <div className={`overflow-x-auto my-4 py-2 ${className}`}>
        <BlockMath math={text} />
      </div>
    );
  }

  return (
    <span className={`inline-block ${className}`}>
      <InlineMath math={text} />
    </span>
  );
};

export default MathText;
