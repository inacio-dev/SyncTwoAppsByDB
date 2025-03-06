import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';
import * as couchbase from 'couchbase';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const port = process.env.PORT || 3010;

app.use(express.json());
app.use(cors());

// Configuração do PostgreSQL
const poolOther = new Pool({
  user: process.env.DB1_USER || 'usuario1',
  host: process.env.DB1_HOST || 'localhost',
  database: process.env.DB1_NAME || 'banco1',
  password: process.env.DB1_PASS || 'senha1',
  port: Number(process.env.DB1_PORT) || 5432,
});

// Configuração do Couchbase
let db2Cluster: couchbase.Cluster;
let db2Bucket: couchbase.Bucket;
let db2Collection: couchbase.Collection;

// Interface do Exame
interface Exam {
  id?: string;
  patientName: string;
  examType: string;
  examDate: string;
  result: string;
  observations: string;
  sent_to_other?: boolean;
  type?: string;
}

// Inicialização do Couchbase
async function initDb2() {
  try {
    const clusterConnStr = `couchbase://${process.env.DB_HOST}`;
    const options = {
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
    };

    db2Cluster = await couchbase.connect(clusterConnStr, options);
    db2Bucket = db2Cluster.bucket(process.env.DB_NAME as string);
    db2Collection = db2Bucket.defaultCollection();
    
    console.log('Conectado ao Couchbase com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar ao Couchbase:', error);
    throw error;
  }
}

// Endpoints
app.post('/exames', async (req: Request, res: Response): Promise<void> => {
  const { patientName, examType, examDate, result, observations } = req.body as Exam;

  if (!patientName || !examType || !examDate || !result || !observations) {
    res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    return;
  }

  try {
    const id = randomUUID();
    const exam: Exam = {
      id,
      patientName,
      examType,
      examDate,
      result,
      observations,
      sent_to_other: false,
      type: 'exame'
    };

    await db2Collection.insert(id, exam, { timeout: 30000 });
    res.status(201).json(exam);
  } catch (error) {
    console.error('Erro ao inserir exame:', error);
    res.status(500).json({ error: 'Erro ao inserir exame.' });
  }
});

app.get('/exames/count', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT RAW COUNT(*) AS count 
      FROM \`${process.env.DB_NAME}\` USE INDEX (\`idx_exame_covering\`)
      WHERE type = "exame"
    `;

    const result = await db2Cluster.query(query, { timeout: 10000 });
    res.json({ count: result.rows[0] || 0 });
  } catch (error) {
    console.error('Erro ao contar exames:', error);
    res.status(500).json({ error: 'Erro ao contar exames.' });
  }
});

app.get('/exames', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT RAW {
        "id": META().id,
        "patientName": patientName,
        "examType": examType,
        "examDate": examDate,
        "result": result,
        "observations": observations,
        "sent_to_other": sent_to_other
      }
      FROM \`${process.env.DB_NAME}\` AS doc USE INDEX (\`idx_exame_covering\`)
      WHERE doc.type = "exame"
    `;

    const result = await db2Cluster.query(query, { timeout: 10000 });
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar exames:', error);
    res.status(500).json({ error: 'Erro ao buscar exames.' });
  }
});

// Função de sincronização otimizada
async function syncExams() {
  try {
    const query = `
      SELECT RAW {
        "id": META().id,
        "patientName": patientName,
        "examType": examType,
        "examDate": examDate,
        "result": result,
        "observations": observations
      }
      FROM \`${process.env.DB_NAME}\` AS doc USE INDEX (\`idx_exame_covering\`)
      WHERE doc.type = "exame"
      AND (doc.sent_to_other IS MISSING OR doc.sent_to_other = false)
      LIMIT 100;
    `;

    console.log('Iniciado sincronização')
    const queryResult = await db2Cluster.query(query, { timeout: 10000 });
    const examsToSync: Exam[] = queryResult.rows;

    for (const exam of examsToSync) {
      try {
        await poolOther.query(
          'INSERT INTO exames (patient_name, exam_type, exam_date, result, observations) VALUES ($1, $2, $3, $4, $5)',
          [exam.patientName, exam.examType, exam.examDate, exam.result, exam.observations]
        );

        await db2Collection.mutateIn(exam.id as string, [
          couchbase.MutateInSpec.replace('sent_to_other', true)
        ], { timeout: 30000 });

      } catch (err) {
        console.error(`Erro ao sincronizar exame ${exam.id}:`, err);
      }
    }

    if (examsToSync.length > 0) {
      console.log(`Sync: ${examsToSync.length} exame(s) processado(s) em ${new Date().toISOString()}`);
    } else {
      console.log(`Sync: 0 exames processados em ${new Date().toISOString()}`)
    }
  } catch (error) {
    console.error("Erro durante a sincronização:", error);
  }
}

// Inicialização do servidor
const startServer = async () => {
  try {
    await initDb2();
    
    // Inicia a sincronização a cada 5 minutos
    setInterval(syncExams, 60000);
    
    // Primeira sincronização
    syncExams();

    app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
    });
  } catch (error) {
    console.error('Falha ao inicializar o servidor:', error);
    process.exit(1);
  }
};

startServer();
