import React, { useState } from 'react';

export default function SearchIntelligence() {
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Máscara dinâmica que formata em tempo real enquanto digita
  const handleInputChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não for número
    
    if (value.length <= 11) {
      // Máscara de CPF: 000.000.000-00
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // Máscara de CNPJ: 00.000.000/0001-00
      value = value.slice(0, 14); // Limita ao máximo de 14 dígitos
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    setError('');
    setDocument(value);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const cleanDoc = document.replace(/\D/g, '');

    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      setError('Por favor, insira um CPF válido (11 dígitos) ou CNPJ (14 dígitos).');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`/api/search-company?document=${cleanDoc}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao consultar o documento.');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        Busca Inteligente de Documentos
      </h2>
      
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Digite o CPF ou CNPJ
          </label>
          <input
            type="text"
            value={document}
            onChange={handleInputChange}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 font-mono text-center text-lg"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:bg-blue-300"
        >
          {loading ? 'Consultando bases...' : 'Consultar Documento'}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2 animate-fade-in">
          <p className="text-sm text-gray-500">Resultado Encontrado:</p>
          <div className="text-sm font-medium text-gray-800">
            <div className="py-1"><span className="text-gray-500">Nome/Razão:</span> {result.name}</div>
            <div className="py-1"><span className="text-gray-500">Situação:</span> <span className="text-green-600">{result.status}</span></div>
            <div className="py-1"><span className="text-gray-500">País:</span> {result.country}</div>
            <div className="py-1"><span className="text-gray-500">Data de Reg.:</span> {result.registrationDate}</div>
          </div>
        </div>
      )}
    </div>
  );
}