import { Cpu, ArrowRight } from "lucide-react";

export default function NewInvestigationButton() {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
    >
      <Cpu size={18} />
      Nova Investigação
      <ArrowRight size={18} />
    </button>
  );
}
