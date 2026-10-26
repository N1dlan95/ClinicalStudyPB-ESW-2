# Executando com Docker

## Pré-requisitos

- Docker Desktop instalado e em execução.

## Subir o projeto

Na raiz do repositório, execute:

```powershell
docker compose up --build
```

Depois, acesse:

- Frontend: <http://localhost:3000>
- API: <http://localhost:8080/api>
- PostgreSQL: `localhost:5432`, banco `clinicalstudy`, usuário `clinical`, senha `clinical`

O banco usa o volume `postgres-data`, e as migrações do Flyway são executadas
automaticamente pela API na primeira inicialização.

Para executar em segundo plano:

```powershell
docker compose up --build -d
```

Para acompanhar os logs:

```powershell
docker compose logs -f backend frontend
```

Para parar os containers, preservando os dados:

```powershell
docker compose down
```

Para remover também os dados persistidos do PostgreSQL:

```powershell
docker compose down -v
```

## Configuração de produção

Defina pelo menos `JWT_SECRET` antes de subir o Compose. O segredo deve ter
no mínimo 32 caracteres:

```powershell
$env:JWT_SECRET = "substitua-por-um-segredo-longo-e-aleatorio"
docker compose up --build -d
```

Também é possível definir `JWT_EXPIRACAO` e `CORS_ORIGENS` no ambiente antes
de executar o comando.
