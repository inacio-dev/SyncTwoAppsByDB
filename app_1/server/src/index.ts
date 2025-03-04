import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware para interpretar JSON
app.use(express.json());

// Habilita CORS para todos os domínios
app.use(cors());

// Configuração do pool de conexões com o PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT),
});

// Interface definindo os campos do exame
interface Exam {
  patientName: string;
  examType: string;
  examDate: string; // formato ISO (YYYY-MM-DD)
  result: string;
  observations: string;
}

// Endpoint POST para inserir um exame
app.post('/exames', async (req: Request, res: Response): Promise<void> => {
    const { patientName, examType, examDate, result, observations } = req.body as Exam;
  
    // Validação simples para garantir que todos os campos foram enviados
    if (!patientName || !examType || !examDate || !result || !observations) {
      res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      return;
    }
  
    try {
      const insertQuery = `
        INSERT INTO exames (patient_name, exam_type, exam_date, result, observations)
        VALUES ($1, $2, $3, $4, $5)
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
    // O COUNT é retornado como string, por isso convertendo para número
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

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
