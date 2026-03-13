import { X, Ruler, BedDouble, Car, Bath, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatBRL } from "@/lib/utils";
import type { ShowcaseImovel } from "./types";

interface Props {
  items: ShowcaseImovel[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: number) => void;
}

export default function CompareModal({ items, open, onClose, onRemove }: Props) {
  if (!open || !items || items.length < 2) return null;

  const specs: { key: string; label: string; icon: any; render: (i: ShowcaseImovel) => string }[] = [
    { key: "valor", label: "Valor", icon: null, render: i => i.valor ? formatBRL(i.valor) : "—" },
    { key: "area", label: "Área", icon: Ruler, render: i => i.area ? `${i.area}m²` : (i.metragens || "—") },
    { key: "quartos", label: "Dormitórios", icon: BedDouble, render: i => i.quartos ? `${i.quartos}` : (i.dorms || "—") },
    { key: "suites", label: "Suítes", icon: BedDouble, render: i => i.suites ? `${i.suites}` : "—" },
    { key: "vagas", label: "Vagas", icon: Car, render: i => i.vagas ? `${i.vagas}` : "—" },
    { key: "banheiros", label: "Banheiros", icon: Bath, render: i => i.banheiros ? `${i.banheiros}` : "—" },
    { key: "bairro", label: "Bairro", icon: MapPin, render: i => i.bairro || "—" },
    { key: "status", label: "Status", icon: null, render: i => i.status || "—" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="compare-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] flex items-start justify-center overflow-y-auto"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-4xl my-6 mx-4 bg-white rounded-3xl overflow-hidden"
          style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.4)" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900">Comparar imóveis</h2>
              <p className="text-xs text-slate-400 mt-1">{items.length} imóveis selecionados</p>
            </div>
            <button onClick={onClose} className="bg-slate-100 rounded-full p-2 hover:bg-slate-200 transition-all">
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              {/* Images row */}
              <thead>
                <tr>
                  <th className="p-4 text-left w-32"></th>
                  {items.map(item => (
                    <th key={item.id} className="p-3 text-center align-top" style={{ minWidth: "180px" }}>
                      <div className="relative">
                        <button onClick={() => onRemove(item.id)}
                          className="absolute -top-1 -right-1 z-10 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-all">
                          <X className="h-3 w-3" />
                        </button>
                        {item.fotos?.[0] ? (
                          <img src={item.fotos[0]} alt="" className="w-full h-28 object-cover rounded-xl" />
                        ) : (
                          <div className="w-full h-28 bg-slate-100 rounded-xl flex items-center justify-center">
                            <span className="text-slate-300 text-xs">Sem foto</span>
                          </div>
                        )}
                        <p className="font-bold text-sm text-slate-800 mt-2 leading-tight">
                          {item.empreendimento || item.titulo}
                        </p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specs.map((spec, idx) => (
                  <tr key={spec.key} className={idx % 2 === 0 ? "bg-slate-50/50" : ""}>
                    <td className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      {spec.icon && <spec.icon className="h-3.5 w-3.5 text-blue-500" />}
                      {spec.label}
                    </td>
                    {items.map(item => {
                      const val = spec.render(item);
                      const isHighlight = spec.key === "valor";
                      return (
                        <td key={item.id} className="p-4 text-center">
                          <span className={`text-sm ${isHighlight ? "font-black text-blue-600 text-base" : "font-semibold text-slate-700"}`}>
                            {val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
