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
  const [exams, setExams] = useState<any[]>([]);
  const [formData, setFormData] = useState<Exam>({
    patientName: "",
    examType: "",
    examDate: "",
    result: "",
    observations: "",
  });

  // Buscar dados iniciais: quantidade e lista de exames
  useEffect(() => {
    fetch("http://localhost:3000/exames/count")
      .then((res) => res.json())
      .then((data) => setExamCount(data.count))
      .catch((err) => console.error("Erro ao buscar a quantidade de exames:", err));

    fetch("http://localhost:3000/exames")
      .then((res) => res.json())
      .then((data) => setExams(data))
      .catch((err) => console.error("Erro ao buscar exames:", err));
  }, []);

  // Atualiza o form conforme o usuário digita
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Envia os dados do exame para o servidor
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const response = await fetch("http://localhost:3000/exames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      const newExam = await response.json();
      // Atualiza a lista e a contagem de exames
      setExams((prev) => [...prev, newExam]);
      setExamCount((prev) => (prev !== null ? prev + 1 : 1));
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
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center sm:items-start">
        <h1 className="text-3xl font-bold">Gerenciamento de Exames</h1>

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
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="examType"
              placeholder="Tipo do Exame"
              value={formData.examType}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <input
              type="date"
              name="examDate"
              placeholder="Data do Exame"
              value={formData.examDate}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="result"
              placeholder="Resultado"
              value={formData.result}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <textarea
              name="observations"
              placeholder="Observações"
              value={formData.observations}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">
              Adicionar Exame
            </button>
          </form>
        </section>

        {/* Seção de resumo */}
        <section className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Resumo dos Exames</h2>
          <p>
            Quantidade de exames:{" "}
            {examCount !== null ? examCount : "Carregando..."}
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
