"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface OptionItem {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Seleccione una opción...",
  searchPlaceholder = "Buscar en el listado...",
  disabled = false,
  required = false,
  className = "",
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Enfocar input de búsqueda al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(
    (opt) => opt && String(opt.value ?? "") === String(value ?? "")
  );

  const term = (searchTerm || "").trim().toLowerCase();
  const filteredOptions = safeOptions.filter((opt) => {
    if (!opt) return false;
    if (!term) return true;
    const label = String(opt.label ?? "").toLowerCase();
    const sublabel = String(opt.sublabel ?? "").toLowerCase();
    return label.includes(term) || sublabel.includes(term);
  });

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Botón trigger principal que luce como un select profesional */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full text-left text-xs bg-white border rounded-lg p-2.5 flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20"
            : "border-slate-300 hover:border-slate-400 text-slate-800"
        }`}
      >
        <span className={`block truncate ${!selectedOption ? "text-slate-400" : "font-medium text-slate-900"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpiar selección"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180 text-blue-600" : ""}`}
          />
        </div>
      </button>

      {/* Input oculto para soporte nativo de required en formularios HTML */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Desplegable con cuadro de búsqueda y opciones filtradas */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Cuadro de texto de búsqueda libre */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-xs bg-transparent border-none p-1 focus:outline-none text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Lista de resultados scrolleable */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 italic">
                {safeOptions.length === 0
                  ? "Cargando o no hay opciones registradas"
                  : `No se encontraron opciones para "${searchTerm}"`}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-blue-900 font-semibold"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer informativo */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>
              {filteredOptions.length} de {safeOptions.length} opciones disponibles
            </span>
            <span>Esc para cerrar</span>
          </div>
        </div>
      )}
    </div>
  );
};
