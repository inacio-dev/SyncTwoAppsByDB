import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3010;

// Middleware para interpretar JSON
app.use(express.json());

// Habilita CORS para todos os domínios
app.use(cors());

// Configuração do pool de conexões para o banco atual (banco2)
const pool = new Pool({
  user: process.env.DB_USER,       // Ex.: 'usuario2'
  host: process.env.DB_HOST,       // Ex.: 'localhost'
  database: process.env.DB_NAME,   // Ex.: 'banco2'
  password: process.env.DB_PASS,   // Ex.: 'senha2'
  port: Number(process.env.DB_PORT), // Ex.: 5433
});

// Configuração do pool para o outro banco (banco1)
// As variáveis de ambiente aqui podem ter nomes diferentes (ex: DB1_USER, DB1_HOST, etc.)
const poolOther = new Pool({
  user: process.env.DB1_USER || 'usuario1',
  host: process.env.DB1_HOST || 'localhost',
  database: process.env.DB1_NAME || 'banco1',
  password: process.env.DB1_PASS || 'senha1',
  port: Number(process.env.DB1_PORT) || 5432,
});

// Interface definindo os campos do exame
interface Exam {
  id?: number;
  patientName: string;
  examType: string;
  examDate: string; // Formato ISO (YYYY-MM-DD)
  result: string;
  observations: string;
}

// Endpoint POST para inserir um exame no banco atual (banco2)
app.post('/exames', async (req: Request, res: Response): Promise<void> => {
  const { patientName, examType, examDate, result, observations } = req.body as Exam;

  // Validação simples para garantir que todos os campos foram enviados
  if (!patientName || !examType || !examDate || !result || !observations) {
    res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    return;
  }

  try {
    const insertQuery = `
      INSERT INTO exames (patient_name, exam_type, exam_date, result, observations, sent_to_other)
      VALUES ($1, $2, $3, $4, $5, false)
      RETURNING *
    `;
    const values = [patientName, examType, examDate, result, observations];
    const dbResponse = await pool.query(insertQuery, values);

    res.status(201).json(dbResponse.rows[0]);
    return;
  } catch (error) {
    console.error('Erro ao inserir exame:', error);
    res.status(500).json({ error: 'Erro ao inserir exame.' });
    return;
  }
});

// Endpoint GET para retornar a quantidade de exames
app.get('/exames/count', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM exames');
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (error) {
    console.error('Erro ao consultar a quantidade de exames:', error);
    res.status(500).json({ error: 'Erro ao consultar a quantidade de exames' });
  }
});

// Endpoint GET para retornar a lista de exames
app.get('/exames', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM exames');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao consultar os exames:', error);
    res.status(500).json({ error: 'Erro ao consultar os exames' });
  }
});

// Função assíncrona para sincronizar os exames com o outro banco (banco1)
async function syncExams() {
  try {
    // Seleciona os exames que ainda não foram enviados
    const result = await pool.query("SELECT * FROM exames WHERE sent_to_other = false");
    const examsToSync = result.rows;

    for (const exam of examsToSync) {
      try {
        // Tenta inserir o exame no banco1 (não inclui o campo sent_to_other)
        const insertQuery = `
          INSERT INTO exames (patient_name, exam_type, exam_date, result, observations)
          VALUES ($1, $2, $3, $4, $5)
        `;
        const values = [exam.patient_name, exam.exam_type, exam.exam_date, exam.result, exam.observations];
        await poolOther.query(insertQuery, values);

        // Se a inserção no banco1 for bem-sucedida, marca o exame como enviado no banco2
        await pool.query("UPDATE exames SET sent_to_other = true WHERE id = $1", [exam.id]);
      } catch (err) {
        // Se ocorrer erro na comunicação com o banco1, apenas loga o erro e continua (o exame não será marcado como enviado)
        console.error(`Erro ao sincronizar exame (id: ${exam.id}) com o banco1. Tentarei novamente na próxima sincronização:`, err);
        continue;
      }
    }
    console.log(`Sync: ${examsToSync.length} exame(s) processado(s) em ${new Date().toISOString()}`);
  } catch (error) {
    console.error("Erro durante a sincronização:", error);
  }
}

// Agenda a task para rodar a cada 5 minutos (300000 ms)
setInterval(syncExams, 300000);

// Opcional: Executa a sincronização imediatamente ao iniciar o servidor
syncExams();

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
