/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  User, 
  FileText, 
  Settings, 
  History, 
  ShieldCheck, 
  ChevronDown, 
  Copy, 
  Trash2,
  CheckCircle2,
  Upload,
  Loader2,
  Image as ImageIcon,
  X,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { db } from './firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

interface Technician {
  name: string;
  region: string;
  city: string;
  obs?: string;
}

interface TechData {
  moto: Technician[];
  car: Technician[];
}

interface FormData {
  data: string;
  periodo: string;
  roteador: string;
  onu: string;
  contato: string;
  clienteDesde: string;
  solicitacao: string;
  sinalStatus: string;
  historicoLogs: string;
  atendimentoRecente: string;
  tipoUltimaOs: string;
  dataUltimaOs: string;
  encerramentoUltimaOs: string;
  operador: string;
  autorizacaoExcecao: string;
  nomeAutorizador: string;
  horarioEspecifico: string;
}

const initialFormState: FormData = {
  data: '',
  periodo: '',
  roteador: '',
  onu: '',
  contato: '',
  clienteDesde: '',
  solicitacao: '',
  sinalStatus: '',
  historicoLogs: '',
  atendimentoRecente: 'Não',
  tipoUltimaOs: '',
  dataUltimaOs: '',
  encerramentoUltimaOs: '',
  operador: 'Eduardo',
  autorizacaoExcecao: 'Não',
  nomeAutorizador: '',
  horarioEspecifico: '',
};

const defaultTechData: TechData = {
  moto: [
    { name: "Clayton", region: "Todas as regioes", city: "Itanhaém e Mongaguá", obs: "Noturno" },
    { name: "Alexsandro", region: "Peruíbe (todas as regiões) - Itanhaém (Gaivotas até Belas Artes)", city: "Peruíbe e Itanhaém" },
    { name: "Lucas Rodrigues", region: "Centro até Loty (todos os bairros entre eles)", city: "Itanhaém" },
    { name: "Raphael dos Anjos", region: "Todas as regiões", city: "Mongaguá" },
    { name: "Bruno dos Santos", region: "Todas as regiões", city: "Praia Grande" },
  ],
  car: [
    { name: "Falar com a torre", region: "Todas as regiões", city: "Peruíbe" },
    { name: "Robson Borges", region: "Gaivotas até Belas Artes (todos os bairros entre eles)", city: "Itanhaém", obs: "Noturno" },
    { name: "Maxwell Lemos", region: "Centro até Loty (todos os bairros entre eles)", city: "Itanhaém", obs: "Noturno" },
    { name: "Marcos Vinicius", region: "Todas as regiões", city: "Mongaguá", obs: "Noturno" },
    { name: "Gabriel Felipe", region: "Todas as regiões", city: "Praia Grande", obs: "Noturno" },
  ]
};

export default function App() {
  const [formData, setFormData] = useState<FormData>(initialFormState);
  const [techData, setTechData] = useState<TechData>(defaultTechData);
  const [isLoadingTech, setIsLoadingTech] = useState(true);
  const [showTechnicians, setShowTechnicians] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sincronização em tempo real com o Firebase
  React.useEffect(() => {
    const techDoc = doc(db, 'settings', 'technicians');
    
    const unsubscribe = onSnapshot(techDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as TechData;
        setTechData(data);
      } else {
        // Se não existir no banco, inicializa com os dados padrão
        setDoc(techDoc, defaultTechData);
      }
      setIsLoadingTech(false);
    }, (error) => {
      console.error("Erro ao sincronizar técnicos:", error);
      setIsLoadingTech(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors.includes(name)) {
      setErrors(prev => prev.filter(err => err !== name));
    }
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    setFormData(initialFormState);
    setErrors([]);
    setShowClearConfirm(false);
  };

  const validateForm = () => {
    const newErrors: string[] = [];
    if (!formData.data) newErrors.push('data');
    if (!formData.periodo) newErrors.push('periodo');
    if (!formData.roteador) newErrors.push('roteador');
    if (!formData.onu) newErrors.push('onu');
    if (!formData.contato) newErrors.push('contato');
    if (!formData.clienteDesde) newErrors.push('clienteDesde');
    if (!formData.solicitacao) newErrors.push('solicitacao');
    if (!formData.sinalStatus) newErrors.push('sinalStatus');

    if (formData.periodo === 'Após (Informar Horário)') {
      if (!formData.horarioEspecifico) newErrors.push('horarioEspecifico');
    }

    if (formData.atendimentoRecente === 'Sim') {
      if (!formData.tipoUltimaOs) newErrors.push('tipoUltimaOs');
      if (!formData.dataUltimaOs) newErrors.push('dataUltimaOs');
      if (!formData.encerramentoUltimaOs) newErrors.push('encerramentoUltimaOs');
    }

    if (formData.autorizacaoExcecao === 'Sim') {
      if (!formData.nomeAutorizador) newErrors.push('nomeAutorizador');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleCopy = () => {
    if (!validateForm()) return;

    let periodoTexto = formData.periodo;
    if (formData.periodo === 'Após (Informar Horário)' && formData.horarioEspecifico) {
      periodoTexto += ` (${formData.horarioEspecifico})`;
    }

    let script = `
=== AGENDAMENTO ===
DATA: ${formData.data.split('-').reverse().join('/')}
PERÍODO: ${periodoTexto}

=== INFORMAÇÕES DO CLIENTE ===
Roteador: ${formData.roteador}
ONU: ${formData.onu}
Contato: ${formData.contato}
Cliente desde: ${formData.clienteDesde}

=== DETALHES DA SOLICITAÇÃO ===
${formData.solicitacao}

=== INFORMAÇÕES TÉCNICAS ===
Sinal/Status: ${formData.sinalStatus}
Histórico:
${formData.historicoLogs}

=== HISTÓRICO ===
Recente Suporte/OS: ${formData.atendimentoRecente}
`.trim();

    if (formData.atendimentoRecente === 'Sim') {
      script += `\nTipo: ${formData.tipoUltimaOs} | Data: ${formData.dataUltimaOs} | Encerramento: ${formData.encerramentoUltimaOs}`;
    }

    script += `\n\n=== ATENDIMENTO ===\nAtendente: ${formData.operador}\nAutorização por Exceção: ${formData.autorizacaoExcecao}`;

    if (formData.autorizacaoExcecao === 'Sim') {
      script += `\nAutorizado por: ${formData.nomeAutorizador}`;
    }

    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Converte a imagem para Base64 usando uma Promise para garantir a sincronia
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Chave de API não configurada. Adicione VITE_GEMINI_API_KEY às variáveis de ambiente.");

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      const prompt = `
        Analise esta imagem de uma tabela de técnicos. 
        Extraia os dados dos técnicos de MOTO e CARRO.
        Retorne APENAS um JSON no seguinte formato:
        {
          "moto": [{"name": "string", "region": "string", "city": "string", "obs": "string"}],
          "car": [{"name": "string", "region": "string", "city": "string", "obs": "string"}]
        }
        Se o campo Observações estiver vazio, deixe como string vazia.
        Importante: Extraia todos os técnicos visíveis na imagem.
      `;

      const result = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]
          }
        ]
      });

      const text = result.text;
      if (!text) throw new Error("A IA não conseguiu ler os dados da imagem.");

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        if (parsedData.moto && Array.isArray(parsedData.moto) && parsedData.car && Array.isArray(parsedData.car)) {
          // Salva no Firebase em vez de apenas no estado local
          const techDoc = doc(db, 'settings', 'technicians');
          await setDoc(techDoc, {
            ...parsedData,
            updatedAt: new Date().toISOString()
          });
          
          setShowConfig(false);
          setShowTechnicians(true);
        } else {
          throw new Error("Os dados extraídos não estão no formato esperado.");
        }
      } else {
        throw new Error("Não foi possível encontrar uma tabela de técnicos nesta imagem.");
      }
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      alert(error instanceof Error ? error.message : "Erro ao processar a imagem. Tente novamente com uma foto mais nítida.");
    } finally {
      setIsProcessing(false);
      // Reseta o valor do input para permitir selecionar a mesma imagem novamente se necessário
      e.target.value = '';
    }
  };

  const getFieldClass = (fieldName: string, baseClass: string = "") => {
    const errorClass = errors.includes(fieldName) ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 focus:ring-red-500 focus:border-red-500";
    return `${baseClass} w-full p-2 border rounded-lg outline-none transition-all ${errorClass}`;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header com Botões de Ação */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">
            Gerenciador de O.S. Geral
          </h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowConfig(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm"
            >
              <Settings className="w-4 h-4" />
              Atualizar Técnicos
            </button>
            <button 
              onClick={() => setFormData(prev => ({ ...prev, data: new Date().toISOString().split('T')[0] }))}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              Hoje
            </button>
          </div>
        </div>

        {/* Modal de Configuração (IA Upload) */}
        <AnimatePresence>
          {showConfig && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-bold text-lg text-slate-800">Atualizar Técnicos com IA</h2>
                  <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-8">
                  <label className="relative group cursor-pointer block">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload}
                      disabled={isProcessing}
                    />
                    <div className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all ${isProcessing ? 'bg-slate-50 border-slate-200' : 'border-red-200 bg-red-50/30 group-hover:bg-red-50 group-hover:border-red-400'}`}>
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
                          <p className="text-sm font-medium text-slate-600 animate-pulse">Lendo imagem e extraindo dados...</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8" />
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-slate-700">Clique ou arraste a imagem</p>
                            <p className="text-xs text-slate-400 mt-1">Formatos aceitos: PNG, JPG, WEBP</p>
                          </div>
                        </>
                      )}
                    </div>
                  </label>
                  <p className="mt-6 text-xs text-slate-400 text-center leading-relaxed">
                    A IA irá identificar automaticamente as tabelas de Moto e Carro e atualizar a lista da região.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Técnicos da Região Accordion */}
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
          <button 
            onClick={() => setShowTechnicians(!showTechnicians)}
            className="w-full px-6 py-4 flex items-center justify-between text-red-600 font-semibold hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm uppercase tracking-wider">Técnicos da região</span>
              {isLoadingTech ? (
                <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
              ) : (
                techData !== defaultTechData && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Sincronizado via Nuvem</span>
                )
              )}
            </div>
            <ChevronDown className={`w-5 h-5 transition-transform ${showTechnicians ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showTechnicians && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 pb-6 border-t border-red-50 overflow-x-auto"
              >
                <div className="space-y-6 pt-4 min-w-[600px]">
                  {/* Tabela Moto */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="bg-red-600 text-white py-2 px-4 text-center font-bold uppercase tracking-widest text-sm">
                      Técnicos de Moto
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="p-3 border-r border-slate-200 w-1/4">Técnico</th>
                          <th className="p-3 border-r border-slate-200 w-1/3">Região de atendimento</th>
                          <th className="p-3 border-r border-slate-200 w-1/4">Cidade</th>
                          <th className="p-3">Observações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {techData.moto.map((tech, idx) => (
                          <TechRow key={idx} {...tech} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Tabela Carro */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="bg-red-600 text-white py-2 px-4 text-center font-bold uppercase tracking-widest text-sm">
                      Técnicos de Carro
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="p-3 border-r border-slate-200 w-1/4">Técnico</th>
                          <th className="p-3 border-r border-slate-200 w-1/3">Região de atendimento</th>
                          <th className="p-3 border-r border-slate-200 w-1/4">Cidade</th>
                          <th className="p-3">Observações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {techData.car.map((tech, idx) => (
                          <TechRow key={idx} {...tech} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Agendamento */}
          <Card icon={<Calendar className="w-4 h-4" />} title="Agendamento" className="lg:col-span-1">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                <input 
                  type="date" 
                  name="data"
                  value={formData.data}
                  onChange={handleInputChange}
                  className={getFieldClass('data')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Período</label>
                <select 
                  name="periodo"
                  value={formData.periodo}
                  onChange={handleInputChange}
                  className={getFieldClass('periodo', 'bg-white')}
                >
                  <option value="">Selecione...</option>
                  <option value="Horário Comercial">Horário Comercial</option>
                  <option value="Primeira do dia">Primeira do dia</option>
                  <option value="Manhã (9 às 12h30)">Manhã (9 às 12h30)</option>
                  <option value="Tarde (13 às 17h30)">Tarde (13 às 17h30)</option>
                  <option value="Última do dia">Última do dia</option>
                  <option value="Após (Informar Horário)">Após (Informar Horário)</option>
                </select>
              </div>
              <AnimatePresence>
                {formData.periodo === 'Após (Informar Horário)' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Horário Específico</label>
                      <input 
                        type="text" 
                        name="horarioEspecifico"
                        placeholder="Ex: 16:30"
                        value={formData.horarioEspecifico}
                        onChange={handleInputChange}
                        className={getFieldClass('horarioEspecifico')}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Informações do Cliente */}
          <Card icon={<User className="w-4 h-4" />} title="Informações do Cliente" className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Roteador</label>
                <select 
                  name="roteador"
                  value={formData.roteador}
                  onChange={handleInputChange}
                  className={getFieldClass('roteador', 'bg-white')}
                >
                  <option value="">Selecione...</option>
                  <option value="Comodato">Comodato</option>
                  <option value="Compra">Compra</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">ONU</label>
                <select 
                  name="onu"
                  value={formData.onu}
                  onChange={handleInputChange}
                  className={getFieldClass('onu', 'bg-white')}
                >
                  <option value="">Selecione...</option>
                  <option value="Comodato">Comodato</option>
                  <option value="Compra">Compra</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Contato</label>
                <input 
                  type="text" 
                  name="contato"
                  placeholder="Contato do cliente"
                  value={formData.contato}
                  onChange={handleInputChange}
                  className={getFieldClass('contato')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cliente desde</label>
                <input 
                  type="text" 
                  name="clienteDesde"
                  placeholder="Ex: 01/2020"
                  value={formData.clienteDesde}
                  onChange={handleInputChange}
                  className={getFieldClass('clienteDesde')}
                />
              </div>
            </div>
          </Card>

          {/* Detalhes da O.S. */}
          <Card icon={<FileText className="w-4 h-4" />} title="Detalhes da O.S." className="lg:col-span-1.5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Solicitação (Motivo)</label>
              <textarea 
                name="solicitacao"
                rows={4}
                placeholder="Descreva a solicitação do cliente..."
                value={formData.solicitacao}
                onChange={handleInputChange}
                className={getFieldClass('solicitacao', 'p-3 resize-none')}
              />
            </div>
          </Card>

          {/* Informações Técnicas */}
          <Card icon={<Settings className="w-4 h-4" />} title="Informações Técnicas" className="lg:col-span-1.5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Sinal / Status ONU</label>
                <input 
                  type="text" 
                  name="sinalStatus"
                  placeholder="-20dBm / Online"
                  value={formData.sinalStatus}
                  onChange={handleInputChange}
                  className={getFieldClass('sinalStatus')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Histórico de Quedas / Logs <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <textarea 
                  name="historicoLogs"
                  rows={2}
                  placeholder="Copie os logs relevantes aqui..."
                  value={formData.historicoLogs}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </Card>

          {/* Última O.S. */}
          <Card icon={<History className="w-4 h-4" />} title="Última O.S." className="lg:col-span-1.5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-3">Teve atendimento recente?</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="atendimentoRecente" 
                      value="Sim"
                      checked={formData.atendimentoRecente === 'Sim'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm group-hover:text-red-600 transition-colors">Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="atendimentoRecente" 
                      value="Não"
                      checked={formData.atendimentoRecente === 'Não'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm group-hover:text-red-600 transition-colors">Não</span>
                  </label>
                </div>
              </div>

              <AnimatePresence>
                {formData.atendimentoRecente === 'Sim' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tipo</label>
                        <input 
                          type="text" 
                          name="tipoUltimaOs"
                          value={formData.tipoUltimaOs}
                          onChange={handleInputChange}
                          className={getFieldClass('tipoUltimaOs', 'text-sm')}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Data</label>
                        <input 
                          type="text" 
                          name="dataUltimaOs"
                          value={formData.dataUltimaOs}
                          onChange={handleInputChange}
                          className={getFieldClass('dataUltimaOs', 'text-sm')}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Encerramento</label>
                        <input 
                          type="text" 
                          name="encerramentoUltimaOs"
                          value={formData.encerramentoUltimaOs}
                          onChange={handleInputChange}
                          className={getFieldClass('encerramentoUltimaOs', 'text-sm')}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Atendente & Autorização */}
          <Card icon={<ShieldCheck className="w-4 h-4" />} title="Atendente & Autorização" className="lg:col-span-1.5">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Operador</label>
                  <input 
                    type="text" 
                    name="operador"
                    value={formData.operador}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-3">Autorização por Exceção?</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="autorizacaoExcecao" 
                        value="Sim"
                        checked={formData.autorizacaoExcecao === 'Sim'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm group-hover:text-red-600 transition-colors">Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="autorizacaoExcecao" 
                        value="Não"
                        checked={formData.autorizacaoExcecao === 'Não'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm group-hover:text-red-600 transition-colors">Não</span>
                    </label>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {formData.autorizacaoExcecao === 'Sim' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nome de quem autorizou</label>
                      <input 
                        type="text" 
                        name="nomeAutorizador"
                        value={formData.nomeAutorizador}
                        onChange={handleInputChange}
                        className={getFieldClass('nomeAutorizador', 'bg-yellow-50/50')}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button 
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 ${copied ? 'bg-emerald-500' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copiar Script
              </>
            )}
          </button>
          <button 
            onClick={handleClear}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all active:scale-95 border border-slate-200"
          >
            <Trash2 className="w-5 h-5" />
            Limpar
          </button>
        </div>

        <AnimatePresence>
          {showClearConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowClearConfirm(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100"
              >
                <div className="flex items-center gap-3 mb-4 text-red-600">
                  <Trash2 className="w-6 h-6" />
                  <h3 className="text-lg font-bold text-slate-800">Limpar Campos?</h3>
                </div>
                <p className="text-slate-600 mb-6">
                  Tem certeza que deseja apagar todas as informações preenchidas? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmClear}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all"
                  >
                    Sim, Limpar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Card({ icon, title, children, className = "" }: { icon: React.ReactNode, title: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border-t-4 border-t-red-600 shadow-sm border-x border-b border-slate-100 overflow-hidden flex flex-col ${className}`}>
      <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-2 bg-slate-50/50">
        <span className="text-red-600">{icon}</span>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">{title}</h3>
      </div>
      <div className="p-6 flex-1">
        {children}
      </div>
    </div>
  );
}

function TechRow({ name, region, city, obs = "" }: { name: string, region: string, city: string, obs?: string }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-3 border-r border-slate-100 font-semibold text-slate-700">{name}</td>
      <td className="p-3 border-r border-slate-100 text-slate-600">{region}</td>
      <td className="p-3 border-r border-slate-100 text-slate-600">{city}</td>
      <td className="p-3 text-slate-600 font-medium">{obs}</td>
    </tr>
  );
}
