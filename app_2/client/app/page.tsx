'use client'

import React, { useState, useEffect, FormEvent } from "react";
import Image from "next/image";

interface Exam {
  patientName: string;
  examType: string;
  examDate: string; // formato ISO (YYYY-MM-DD)
  result: string;
  observations: string;
}

export default function Home() {
  const [examCount, setExamCount] = useState<number | null>(null);
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [formData, setFormData] = useState<Exam>({
    patientName: "",
    examType: "",
    examDate: "",
    result: "",
    observations: "",
  });

  // Função para buscar a contagem total e a contagem de exames sincronizados
  const fetchCounts = async () => {
    try {
      // Busca a contagem total via endpoint /exames/count
      const countRes = await fetch("http://localhost:3010/exames/count");
      const countData = await countRes.json();
      setExamCount(countData.count);

      // Busca todos os exames e filtra os que já foram sincronizados (sent_to_other === true)
      const examsRes = await fetch("http://localhost:3010/exames");
      const examsData = await examsRes.json();
      setExams(examsData);
      const synced = examsData.filter(
        (exam: any) => exam.sent_to_other === true
      ).length;
      setSyncCount(synced);
    } catch (err) {
      console.error("Erro ao buscar dados dos exames:", err);
    }
  };

  // Busca inicial e atualizações a cada 5 minutos (300000 ms)
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 300000);
    return () => clearInterval(interval);
  }, []);

  // Atualiza o form conforme o usuário digita
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Envia os dados do exame para o servidor
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const response = await fetch("http://localhost:3010/exames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      const newExam = await response.json();
      // Atualiza a lista e a contagem total de exames
      setExams((prev) => [...prev, newExam]);
      setExamCount((prev) => (prev !== null ? prev + 1 : 1));
      // Se o novo exame não foi sincronizado, o syncCount não é alterado
      // Limpa o formulário
      setFormData({
        patientName: "",
        examType: "",
        examDate: "",
        result: "",
        observations: "",
      });
    } else {
      console.error("Erro ao adicionar exame");
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-gray-900 text-gray-100 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center sm:items-start">
        <h1 className="text-3xl font-bold text-teal-300">
          Gerenciamento de Exames - Tema Escuro
        </h1>

        {/* Seção para inserir novo exame */}
        <section className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Adicionar Exame</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              name="patientName"
              placeholder="Nome do Paciente"
              value={formData.patientName}
              onChange={handleChange}
              className="border border-gray-700 p-2 rounded bg-gray-800 text-gray-100"
              required
            />
            <input
              type="text"
              name="examType"
              placeholder="Tipo do Exame"
              value={formData.examType}
              onChange={handleChange}
              className="border border-gray-700 p-2 rounded bg-gray-800 text-gray-100"
              required
            />
            <input
              type="date"
              name="examDate"
              placeholder="Data do Exame"
              value={formData.examDate}
              onChange={handleChange}
              className="border border-gray-700 p-2 rounded bg-gray-800 text-gray-100"
              required
            />
            <input
              type="text"
              name="result"
              placeholder="Resultado"
              value={formData.result}
              onChange={handleChange}
              className="border border-gray-700 p-2 rounded bg-gray-800 text-gray-100"
              required
            />
            <textarea
              name="observations"
              placeholder="Observações"
              value={formData.observations}
              onChange={handleChange}
              className="border border-gray-700 p-2 rounded bg-gray-800 text-gray-100"
              required
            />
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600 text-gray-900 p-2 rounded"
            >
              Adicionar Exame
            </button>
          </form>
        </section>

        {/* Seção de resumo */}
        <section className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Resumo dos Exames</h2>
          <p>
            Total de exames:{" "}
            {examCount !== null ? examCount : "Carregando..."}
          </p>
          <p>
            Exames sincronizados:{" "}
            {syncCount !== null ? syncCount : "Carregando..."}
          </p>
        </section>

        {/* Seção para listar exames */}
        <section className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Lista de Exames</h2>
          {exams.length > 0 ? (
            <ul className="list-disc pl-5">
              {exams.map((exam, index) => (
                <li key={index} className="mb-2">
                  <strong>{exam.patient_name}</strong> - {exam.exam_type} (
                  {exam.exam_date}) - Resultado: {exam.result} - Observações:{" "}
                  {exam.observations}
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum exame encontrado.</p>
          )}
        </section>
      </main>
    </div>
  );
}
