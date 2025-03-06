### Rodar os dois bancos de dados Postgres

```
docker compose up
```

### Criar tabela em ambos os bancos de dados

```
CREATE TABLE exames (
  id SERIAL PRIMARY KEY,
  patient_name VARCHAR(255) NOT NULL,
  exam_type VARCHAR(255) NOT NULL,
  exam_date DATE NOT NULL,
  result VARCHAR(255) NOT NULL,
  observations TEXT
);
```

### Adicionar bucket e usuário ao counchbase do DB2:

Rodar os comandos abaixo no Workbench CLI do counchbase:
```
CREATE PRIMARY INDEX ON `bucket_teste`;

CREATE INDEX idx_exame_type_sent
ON `bucket_teste`(type, sent_to_other)
WHERE type = "exame";

CREATE INDEX idx_exame_covering ON `bucket_teste`(type, sent_to_other, patientName, examType, examDate, result, observations)
WHERE type = "exame";
```

### Rodar os apps 1 e 2

```
cd app_1 # app_1 ou app_2
pnpm run dev # Para o client e server
```

### Exemplo de envio pelo frontend

```
{
  "patientName": "João Silva",
  "examType": "Sangue",
  "examDate": "2025-03-04",
  "result": "Normal",
  "observations": "Sem anormalidades"
}
```