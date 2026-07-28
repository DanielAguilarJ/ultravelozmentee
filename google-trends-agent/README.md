# Google Trends Analyst Agent (Google ADK + BigQuery MCP)

Este proyecto implementa un agente de Inteligencia Artificial que analiza tendencias de búsqueda de Google utilizando el **Google ADK (Agent Development Kit)** y el servidor **MCP de BigQuery** para consultar el dataset público `bigquery-public-data.google_trends`.

---

## 📁 Estructura del Proyecto

```text
google-trends-agent/
├── Dockerfile
├── README.md
└── google_trends/
    ├── __init__.py
    └── agent.py
```

---

## 🛠️ Requisitos Previos

1. Proyecto en **Google Cloud Platform (GCP)** con facturación habilitada.
2. Python 3.11+
3. Google Cloud CLI (`gcloud`) autenticado.

---

## 🚀 Configuración Inicial en GCP

```bash
# 1. Definir variables de entorno
export GOOGLE_CLOUD_PROJECT="TU_ID_DE_PROYECTO_GCP"
export GOOGLE_GENAI_USE_VERTEXAI=1

# 2. Autenticación local
gcloud auth login
gcloud auth application-default login
gcloud config set project ${GOOGLE_CLOUD_PROJECT}

# 3. Habilitar APIs necesarias
gcloud services enable run.googleapis.com \
                       cloudbuild.googleapis.com \
                       artifactregistry.googleapis.com \
                       bigquery.googleapis.com \
                       aiplatform.googleapis.com

# 4. Habilitar MCP para BigQuery
gcloud beta services mcp enable bigquery.googleapis.com
```

---

## 💻 Ejecución Local

```bash
cd google-trends-agent

# Crear y activar entorno virtual
python3 -m venv mcp_demo_env
source mcp_demo_env/bin/activate

# Instalar dependencias
pip install google-auth "google-adk[mcp]"

# Ejecutar el servidor Web de ADK
adk web
```

Accede a la interfaz web en `http://localhost:8000`.

---

## ☁️ Despliegue en Google Cloud Run

```bash
# 1. Obtener número de proyecto
PROJECT_NUMBER=$(gcloud projects describe $GOOGLE_CLOUD_PROJECT --format='value(projectNumber)')

# 2. Asignar permisos IAM a la Service Account por defecto de Compute
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/mcp.toolUser"

gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

# 3. Desplegar en Cloud Run
gcloud run deploy google-trends-agent \
  --source . \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}"
```

---

## 💬 Prompts de Ejemplo para Probar el Agente

- *Show me the top trends in the USA*
- *What are the top rising trends in France this month?*
- *What were the top 3 trends in California last week?*
- *What are the BigQuery tables that you have access to?*
- *Tell me everything you know about the top_trends table*
