import React, { useState } from 'react';

export default function EnterpriseForm() {
  const [formData, setFormData] = useState({
    email: '',
    companyName: '',
    cnpj: '',
    planType: 'enterprise' // Padrão da LP Enterprise
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Máscara básica para CNPJ (00.000.000/0000-00)
  const handleCnpjChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    
    value = value
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
      
    setFormData({ ...formData, cnpj: value });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Limpa a máscara do CNPJ antes de enviar para o backend
    const cleanCnpj = formData.cnpj.replace(/\D/g, '');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          companyName: formData.companyName,
          cnpj: cleanCnpj,
          planType: formData.planType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar requisição de checkout.');
      }

      // Redireciona o tomador de decisão direto para a tela de pagamento do Stripe
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada pelo servidor.');
      }

    } catch (err) {
      setError(err.message || 'Ocorreu um erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
      <h3 className="text-xl font-semibold text-white mb-6 tracking-tight">
        Solicitar Acesso B2B Enterprise
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-1">
            Nome da Empresa
          </label>
          <input
            type="text"
            name="companyName"
            required
            disabled={loading}
            value={formData.companyName}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transitiondisabled:opacity-50"
            placeholder="MFRGS INOVAÇÕES LTDA"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-1">
            CNPJ Corporativo
          </label>
          <input
            type="text"
            name="cnpj"
            required
            disabled={loading}
            value={formData.cnpj}
            onChange={handleCnpjChange}
            className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
            placeholder="00.000.000/0001-00"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-1">
            E-mail Institucional
          </label>
          <input
            type="email"
            name="email"
            required
            disabled={loading}
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
            placeholder="diretoria@empresa.com"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium tracking-wide transition shadow-lg shadow-blue-600/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processando Credenciais...
            </>
          ) : (
            'Iniciar Auditoria e Ativar Plano'
          )}
        </button>
      </form>
    </div>
  );
}
