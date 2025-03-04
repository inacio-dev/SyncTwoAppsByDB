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

### Adicionar um campo para sincronizar exames no banco de número 2:

```
ALTER TABLE exames ADD COLUMN sent_to_other BOOLEAN DEFAULT false;
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