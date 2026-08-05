# Especificação - Document Management System (DMS)

## 1. Objetivo

Disponibilizar um sistema web simples para upload, listagem e download de documentos por usuário, com arquivos gravados localmente e metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Upload de documentos via multipart/form-data.
- Listagem de documentos enviados.
- Download de documento por identificador.
- Gestão simples por usuário (owner informado na requisição).
- Backend organizado em Clean Architecture simples.
- Frontend React consumindo backend via prefixo /api.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Versionamento de documentos.
- Exclusão e edição de documentos nesta fase.
- Persistência de metadados em banco de dados.
- Autenticação/autorização avançada.

## 3. Requisitos funcionais

| ID    | Requisito |
| ----- | --------- |
| RF-01 | O usuário pode enviar um documento com arquivo e owner. |
| RF-02 | O sistema grava o arquivo enviado no filesystem local da aplicação. |
| RF-03 | O sistema registra metadados do documento em memória. |
| RF-04 | O usuário pode listar os documentos enviados. |
| RF-05 | O usuário pode baixar um documento pelo identificador. |
| RF-06 | O sistema retorna erro 400 quando arquivo não for enviado. |
| RF-07 | O sistema retorna erro 400 quando owner não for enviado no upload. |
| RF-08 | O sistema retorna erro 404 quando o documento não existir para download. |
| RF-09 | O sistema disponibiliza endpoint de saúde para monitoramento básico. |

## 4. Requisitos não funcionais

| ID     | Requisito |
| ------ | --------- |
| RNF-01 | Backend em Node.js + Express, mantendo organização em camadas. |
| RNF-02 | Arquivos gravados localmente com multer usando diskStorage em backend/storage. |
| RNF-03 | Metadados armazenados em memória nesta fase inicial. |
| RNF-04 | Configuração via variáveis de ambiente (12-Factor), incluindo porta e limites de upload. |
| RNF-05 | Tratamento de erros nos limites HTTP com respostas consistentes. |
| RNF-06 | Código simples, legível e sem overengineering (KISS, YAGNI). |

## 5. Modelo de dados (metadados do documento)

| Campo        | Tipo   | Descrição |
| ------------ | ------ | --------- |
| id           | string | Identificador único do documento. |
| originalName | string | Nome original do arquivo enviado. |
| storedName   | string | Nome do arquivo salvo no disco. |
| mimeType     | string | Tipo MIME do arquivo enviado. |
| size         | number | Tamanho em bytes. |
| uploadedAt   | string | Data/hora do upload em ISO 8601. |
| owner        | string | Identificador do usuário dono do documento. |
| storagePath  | string | Caminho absoluto/local do arquivo no filesystem. |

### Regras de consistência

- id deve ser único por documento.
- uploadedAt deve ser preenchido no momento do upload.
- owner é obrigatório para criação.
- storagePath deve apontar para arquivo existente no momento do download.

## 6. Contratos de API

### GET /health

Objetivo: verificação de saúde do serviço.

Resposta de sucesso (200):

- status: ok

### POST /upload

Objetivo: enviar um documento e registrar seus metadados.

Entrada:

- Content-Type: multipart/form-data
- Campo file: arquivo obrigatório
- Campo owner: texto obrigatório

Resposta de sucesso (201):

- id
- originalName
- storedName
- mimeType
- size
- uploadedAt
- owner
- storagePath

Erros esperados:

- 400: arquivo ausente.
- 400: owner ausente ou inválido.
- 413: arquivo excede limite máximo permitido.
- 500: erro interno.

### GET /documents

Objetivo: listar metadados dos documentos.

Query params opcionais:

- owner: filtra documentos por dono.

Resposta de sucesso (200):

- documents: array de metadados.

Erros esperados:

- 500: erro interno.

### GET /documents/:id/download

Objetivo: baixar arquivo binário a partir do id.

Parâmetro:

- id: identificador do documento.

Resposta de sucesso (200):

- conteúdo binário do arquivo com headers de download.

Erros esperados:

- 400: id inválido.
- 404: documento não encontrado.
- 410: metadado existe, mas arquivo não está mais disponível no disco.
- 500: erro interno.

## 7. Decisões arquiteturais

- Clean Architecture simples no backend com fluxo de dependência:
  routes -> controllers -> services -> repositories.
- Routes definem endpoints e middlewares de entrada (incluindo multer).
- Controllers tratam entrada/saída HTTP e delegam regras para services.
- Services centralizam validações de negócio e orquestração de operações.
- Repositories encapsulam persistência em memória de metadados.
- Armazenamento de arquivos exclusivamente local em backend/storage com multer diskStorage.

### Riscos e mitigação

- Perda de metadados ao reiniciar o processo (mitigação futura: persistência em banco).
- Acúmulo de arquivos no disco (mitigação futura: política de limpeza/expurgo).
- Inconsistência entre memória e filesystem (mitigação: validar existência física no download e retornar 410).

## 8. Plano de execução em etapas

### Etapa 1 - Estruturar backend em camadas

- Criar módulos nas pastas routes, controllers, services e repositories.
- Conectar o roteador no app principal.
- Critério de aceite: aplicação sobe com a estrutura em camadas e endpoint de health funcional.

### Etapa 2 - Implementar upload com armazenamento local

- Configurar multer com diskStorage apontando para backend/storage.
- Criar fluxo de criação de metadados em memória.
- Critério de aceite: POST /upload grava arquivo no disco e retorna metadados com status 201.

### Etapa 3 - Implementar listagem de documentos

- Criar GET /documents com retorno de metadados.
- Adicionar filtro opcional por owner.
- Critério de aceite: listagem retorna documentos enviados e respeita filtro.

### Etapa 4 - Implementar download por identificador

- Criar GET /documents/:id/download usando referência storagePath.
- Tratar erros de id inválido, não encontrado e arquivo ausente.
- Critério de aceite: arquivo válido é baixado e cenários de erro retornam status corretos.

### Etapa 5 - Testes automatizados do backend

- Cobrir upload, listagem, download e erros principais.
- Validar comportamento com runner nativo node:test.
- Critério de aceite: suíte de testes passando localmente.

### Etapa 6 - Implementar frontend integrado

- Criar componentes UploadComponent, DocumentList e DownloadButton.
- Criar cliente em frontend/src/services usando fetch com prefixo /api.
- Critério de aceite: fluxo completo funcionando na interface (enviar, listar, baixar).

### Etapa 7 - Validação final e documentação

- Revisar contratos, mensagens de erro e aderência às convenções do projeto.
- Executar validação manual ponta a ponta.
- Critério de aceite: especificação e implementação alinhadas, prontas para evolução.
